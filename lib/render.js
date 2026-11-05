import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { escapeHtml as esc, publicWork } from './collection.js';
import { fontHead } from './fonts.js';
import { spanFor } from '../site/filters.js';
export function stylesheetURL(root) {
  const hash = createHash('sha256').update(fs.readFileSync(path.join(root, 'site/gallery.css'))).digest('hex').slice(0, 16);
  return '/site/gallery.' + hash + '.css';
}
function fill(template, values) {
  const output = template.replace(/\{\{([A-Z_]+)\}\}/g, (match, key) => {
    if (!Object.hasOwn(values, key)) throw new Error('缺少模板字段：' + key);
    return values[key];
  });
  return output;
}
const number = i => String(i + 1).padStart(2, '0');
function image(work, index, hero = false) {
  if (!work.image) return '<span class="empty-placeholder">封面待补充 · ' + esc(work.title) + '</span>';
  return '<img src="' + esc(work.image) + '" alt="' + esc(work.title) + '的页面截图" width="1280" height="720" loading="' + (hero || index < 3 ? 'eager' : 'lazy') + '" fetchpriority="' + (hero && index === 0 ? 'high' : (index < 3 ? 'auto' : 'low')) + '" decoding="async">';
}
// 首屏：最多五张真实封面叠成一摞纸，DOM 中第一张在最上面（z-index 由 --n 决定）。
function hero(works) {
  const featured = works.filter(w => w.image).slice(0, 5);
  if (!featured.length) return '';
  return '<div class="stack" id="stack" aria-label="作品选览">' + featured.map((w, i) => '<a class="sheet" href="' + esc(w.url) + '" target="_blank" rel="noopener" data-sheet="' + esc(w.id) + '" style="--n:' + i + '" aria-label="打开 ' + esc(w.title) + '">' + image(w, i, true) + '<span class="sheet-caption"><span class="sheet-no">N°' + number(works.indexOf(w)) + '</span><span class="sheet-title">' + esc(w.title) + '</span><svg aria-hidden="true"><use href="#i-arrow"/></svg></span></a>').join('') + '<span class="stack-note" aria-hidden="true">Made to be explored.</span></div>';
}
export function renderIndex(root, collection) {
  const template = fs.readFileSync(path.join(root, 'templates/index.html'), 'utf8');
  const card = fs.readFileSync(path.join(root, 'templates/card.html'), 'utf8');
  const { works, categories } = collection;
  const tags = [...new Set(works.flatMap(w => w.tags))];
  const allCategories = [{ id: 'all', name: '全部' }, ...categories];
  const data = { categories, works: works.map(publicWork) };
  const stats = [[works.length, '件作品'], [categories.length, '种类型'], [tags.length, '个标签']];
  return fill(template, {
    FONTS: fontHead(root),
    STYLESHEET_URL: stylesheetURL(root),
    COUNT: String(works.length), HERO: hero(works),
    STATS: stats.map(([n, label]) => '<div><dt>' + label + '</dt><dd>' + String(n).padStart(2, '0') + '</dd></div>').join(''),
    CATEGORIES: allCategories.map(c => '<button class="category" data-category="' + c.id + '" aria-pressed="' + (c.id === 'all') + '">' + c.name + '<span>' + String(c.id === 'all' ? works.length : works.filter(w => w.categoryId === c.id).length).padStart(2, '0') + '</span></button>').join(''),
    TAGS: tags.map(t => '<button class="tag" data-tag="' + esc(t) + '" aria-pressed="false">' + esc(t) + '</button>').join(''),
    CARDS: works.length ? works.map((w, i) => fill(card, { ID: esc(w.id), URL: esc(w.url), TITLE: esc(w.title), DESCRIPTION: esc(w.description || '打开这一页，探索作品的完整内容。'), IMAGE: image(w, i), CATEGORY: esc(w.category), NUMBER: number(i), INDEX: String(i), SPAN: String(spanFor(i, works.length)), TAGS: w.tags.map(t => '<span class="card-tag card-tag-static">' + esc(t) + '</span>').join('') })).join('\n') : '<p class="empty">作品正在整理中，欢迎稍后再来。</p>',
    DATA: JSON.stringify(data).replace(/</g, '\\u003c').replace(/\u2028/g, '\\u2028').replace(/\u2029/g, '\\u2029'),
  });
}
