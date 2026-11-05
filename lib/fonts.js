import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

// 字体子集：源字体放在 .cache/fonts-src（不入库，scripts/fetch-fonts.sh 下载），
// 产物 assets/fonts/*.woff2 与 manifest.json 入库，Vercel 上缺少源字体时直接复用。
const LATIN = Array.from({ length: 95 }, (_, i) => String.fromCharCode(32 + i)).join('') + '–—·‘’“”…→←↗↑↓×';
export const FACES = [
  { family: 'Shiye Display', file: 'InstrumentSerif-Regular.ttf', style: 'normal', text: () => LATIN },
  { family: 'Shiye Display', file: 'InstrumentSerif-Italic.ttf', style: 'italic', text: () => LATIN },
  { family: 'Shiye Mono', file: 'JetBrainsMono[wght].ttf', style: 'normal', axes: { wght: 400 }, text: () => LATIN },
  // 页面上出现的全部 CJK 字符：标题、分类、标签与界面文案，单一字重约 70KB。
  { family: 'Shiye Song', file: 'NotoSerifSC[wght].ttf', style: 'normal', axes: { wght: 480 }, preload: true, text: cjk => cjk },
];

export function pageGlyphs(...sources) {
  const text = sources.join('').replace(/<[^>]+>/g, '');
  return [...new Set(text)].filter(c => c.codePointAt(0) > 0x2e7f).sort().join('');
}

function faceId(face) { return face.family.toLowerCase().replace(/\s+/g, '-') + (face.style === 'italic' ? '-italic' : ''); }

export function readFontManifest(root) {
  try { return JSON.parse(fs.readFileSync(path.join(root, 'assets/fonts/manifest.json'), 'utf8')); } catch { return {}; }
}

export async function prepareFonts(root, cjk) {
  const dir = path.join(root, 'assets/fonts'), src = path.join(root, '.cache/fonts-src');
  const previous = readFontManifest(root), manifest = {};
  let subsetFont = null;
  for (const face of FACES) {
    const id = faceId(face), text = face.text(cjk);
    const hash = createHash('sha256').update(face.file + JSON.stringify(face.axes || {}) + text).digest('hex').slice(0, 12);
    const name = id + '.' + hash + '.woff2';
    if (fs.existsSync(path.join(dir, name))) { manifest[id] = name; continue; }
    if (!fs.existsSync(path.join(src, face.file))) {
      if (previous[id] && fs.existsSync(path.join(dir, previous[id]))) {
        console.warn('字体：缺少源字体 ' + face.file + '，复用已有子集（新增字符将回退系统字体）');
        manifest[id] = previous[id];
      } else console.warn('字体：缺少 ' + face.file + '，运行 npm run fonts:fetch 后重新构建');
      continue;
    }
    subsetFont ||= (await import('subset-font')).default;
    const buffer = await subsetFont(fs.readFileSync(path.join(src, face.file)), text, { targetFormat: 'woff2', ...(face.axes ? { variationAxes: face.axes } : {}) });
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, name), buffer);
    manifest[id] = name;
    console.log('字体：生成 ' + name + '（' + Math.round(buffer.length / 1024) + 'KB）');
  }
  if (fs.existsSync(dir)) {
    for (const file of fs.readdirSync(dir)) if (file.endsWith('.woff2') && !Object.values(manifest).includes(file)) fs.rmSync(path.join(dir, file));
    if (JSON.stringify(previous) !== JSON.stringify(manifest)) fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  }
  return manifest;
}

// 首页 <head> 中内联的 @font-face；没有字体产物时返回空串，页面回退系统字体。
export function fontHead(root) {
  const manifest = readFontManifest(root);
  let css = '', preload = '';
  for (const face of FACES) {
    const name = manifest[faceId(face)];
    if (!name || !fs.existsSync(path.join(root, 'assets/fonts', name))) continue;
    css += '@font-face{font-family:"' + face.family + '";src:url(/fonts/' + name + ') format("woff2");font-style:' + face.style + ';font-weight:100 900;font-display:swap}';
    if (face.preload) preload += '<link rel="preload" href="/fonts/' + name + '" as="font" type="font/woff2" crossorigin>';
  }
  return css ? preload + '<style>' + css + '</style>' : '';
}
