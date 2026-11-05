import { readFilters, selectWorks, filterParams, spanFor } from './filters.js';

const $ = id => document.getElementById(id);
const root = document.documentElement;
const { works, categories } = JSON.parse($('collection-data').textContent);
const byId = new Map(works.map(w => [w.id, w]));
const allTags = [...new Set(works.flatMap(w => w.tags))];
const cards = new Map([...document.querySelectorAll('.card')].map(card => [card.dataset.workId, card]));
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const colorScheme = matchMedia('(prefers-color-scheme: dark)');
const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
const easeOut = 'cubic-bezier(0.23, 1, 0.32, 1)', easeExpo = 'cubic-bezier(0.16, 1, 0.3, 1)';
const spring = getComputedStyle(root).getPropertyValue('--spring').trim() || easeOut;
const canTransition = typeof document.startViewTransition === 'function';
const canAnimate = typeof Element.prototype.animate === 'function';
const moving = () => !reducedMotion.matches;
const pad = n => String(n).padStart(2, '0');
const inView = el => { const r = el.getBoundingClientRect(); return r.width > 0 && r.bottom > 0 && r.top < innerHeight; };
let state = readFilters(location.search, categories, allTags);
let chosenTheme = null;
try { const saved = localStorage.getItem('shiye-theme'); if (['light', 'dark'].includes(saved)) chosenTheme = saved; } catch { /* Theme still works when storage is unavailable. */ }

function reflectTheme(theme) {
  root.dataset.theme = theme;
  $('theme-toggle').setAttribute('aria-pressed', String(theme === 'dark'));
  $('theme-toggle').setAttribute('aria-label', theme === 'dark' ? '切换到浅色主题' : '切换到深色主题');
  $('theme-toggle').title = theme === 'dark' ? '切换到浅色主题' : '切换到深色主题';
  document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#1b1f1a' : '#f6f5f0';
}
reflectTheme(chosenTheme || (colorScheme.matches ? 'dark' : 'light'));
// Enable transitions only after the initial persisted/system theme has painted.
requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('theme-ready')));
// 新主题从按钮处圆形展开；不支持 View Transition 时退回逐元素颜色过渡。
function switchTheme(theme, origin) {
  if (!origin || !canTransition || !moving()) { reflectTheme(theme); return; }
  const r = origin.getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  root.classList.add('theme-anim');
  const transition = document.startViewTransition(() => reflectTheme(theme));
  transition.ready.then(() => root.animate({ clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] }, { duration: 720, easing: 'cubic-bezier(0.77, 0, 0.175, 1)', pseudoElement: '::view-transition-new(root)' })).catch(() => {});
  transition.finished.finally(() => root.classList.remove('theme-anim'));
}
$('theme-toggle').addEventListener('click', event => {
  chosenTheme = root.dataset.theme === 'dark' ? 'light' : 'dark';
  if (event.detail === 0) {
    root.classList.remove('theme-ready');
    reflectTheme(chosenTheme);
    requestAnimationFrame(() => requestAnimationFrame(() => root.classList.add('theme-ready')));
  } else switchTheme(chosenTheme, event.currentTarget);
  try { localStorage.setItem('shiye-theme', chosenTheme); } catch { /* Private browsing: keep the choice for this visit. */ }
});
colorScheme.addEventListener('change', event => { if (!chosenTheme) reflectTheme(event.matches ? 'dark' : 'light'); });
window.addEventListener('storage', event => {
  if (event.key === 'shiye-theme' || event.key === null) {
    chosenTheme = ['light', 'dark'].includes(event.newValue) ? event.newValue : null;
    reflectTheme(chosenTheme || (colorScheme.matches ? 'dark' : 'light'));
  }
});

function syncURL(mode) {
  const query = filterParams(state).toString();
  const target = location.pathname + (query ? '?' + query : '') + location.hash;
  if (target !== location.pathname + location.search + location.hash) history[mode === 'push' ? 'pushState' : 'replaceState'](null, '', target);
}
function cancelCardMotion() { for (const card of cards.values()) (card.getAnimations?.() || []).forEach(a => a.cancel()); }
// 分类下方的墨色胶囊滑到当前分类。
function placePill(instant) {
  const group = $('categories'), pill = group.querySelector('.category-pill'), active = group.querySelector('[aria-pressed="true"]');
  if (!pill || !active) return;
  group.classList.toggle('pill-instant', instant || !moving());
  pill.style.setProperty('--x', active.offsetLeft + 'px');
  pill.style.setProperty('--y', active.offsetTop + 'px');
  pill.style.setProperty('--w', active.offsetWidth + 'px');
  group.classList.add('pill-ready');
}
function render({ animate = false, historyMode = null } = {}) {
  const motion = animate && moving() && canAnimate;
  const before = new Map();
  if (motion) for (const [id, card] of cards) if (!card.hidden) before.set(id, card.getBoundingClientRect());
  cancelCardMotion();
  const visible = selectWorks(works, state), visibleIds = new Set(visible.map(w => w.id));
  document.body.classList.toggle('list-mode', state.list);
  for (const [id, card] of cards) card.hidden = !visibleIds.has(id);
  const fragment = document.createDocumentFragment();
  visible.forEach((work, i) => { const card = cards.get(work.id); card.dataset.span = spanFor(i, visible.length); fragment.append(card); });
  $('cards').append(fragment);
  if (motion) {
    let order = 0;
    for (const work of visible) {
      const card = cards.get(work.id), previous = before.get(work.id), current = card.getBoundingClientRect();
      // Do not animate far-offscreen rows; keep filtering fast in a larger collection.
      if (current.bottom < 0 || current.top > innerHeight) continue;
      const delay = Math.min(order++ * 32, 260);
      if (previous) {
        const dx = previous.left - current.left, dy = previous.top - current.top, scale = previous.width / current.width;
        if (Math.abs(dx) + Math.abs(dy) > 1 || Math.abs(scale - 1) > 0.01) card.animate([{ transformOrigin: '0 0', transform: 'translate(' + dx + 'px,' + dy + 'px) scale(' + scale + ')' }, { transformOrigin: '0 0', transform: 'none' }], { duration: 680, easing: spring, delay, fill: 'backwards' });
      } else card.animate([{ opacity: 0, transform: 'translateY(28px) scale(0.98)' }, { opacity: 1, transform: 'none' }], { duration: 560, easing: easeExpo, delay, fill: 'backwards' });
    }
  }
  const count = '显示 ' + visible.length + ' / ' + works.length + ' 件作品' + (state.tags.length > 1 ? ' · 标签同时匹配' : '');
  if (motion && $('result-count').textContent !== count) $('result-count').animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: easeOut });
  $('result-count').textContent = count;
  $('empty').hidden = visible.length !== 0 || works.length === 0;
  $('reset').hidden = !(state.q || state.category !== 'all' || state.tags.length);
  $('search').value = state.q;
  $('sort').value = state.sort;
  document.querySelectorAll('[data-category]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.category === state.category)));
  document.querySelectorAll('[data-tag]').forEach(b => b.setAttribute('aria-pressed', String(state.tags.includes(b.dataset.tag))));
  $('grid-view').setAttribute('aria-pressed', String(!state.list));
  $('list-view').setAttribute('aria-pressed', String(state.list));
  $('random-work').disabled = visible.length === 0;
  placePill(!animate);
  if (!state.list) hidePeek();
  if (historyMode) syncURL(historyMode);
}
function reset(animate) {
  state = { ...state, q: '', category: 'all', tags: [] };
  render({ animate, historyMode: 'push' });
}
// 网格 ⇄ 列表：视口内的卡片各自变形到新位置。
function setView(list, animate) {
  if (state.list === list) return;
  state.list = list;
  if (!animate || !canTransition || !moving()) { render({ animate, historyMode: 'push' }); return; }
  // 用卡片的固定序号命名，变形前后同一张卡片才能配成一对。
  const tag = () => { let i = 0; for (const card of cards.values()) { card.style.viewTransitionName = !card.hidden && inView(card) ? 'card-' + i : ''; i++; } };
  tag();
  const transition = document.startViewTransition(() => { render({ historyMode: 'push' }); tag(); });
  transition.finished.finally(() => { for (const card of cards.values()) card.style.viewTransitionName = ''; });
}

const closing = new WeakMap();
let morphSource = null;
function openModal(id, animate) {
  const dialog = $(id);
  clearTimeout(closing.get(dialog));
  closing.delete(dialog);
  dialog.inert = false;
  dialog.classList.toggle('instant', !animate || !moving());
  if (!dialog.open) dialog.showModal();
  dialog.getBoundingClientRect();
  dialog.classList.add('is-visible');
}
function closeModal(dialog, animate) {
  clearTimeout(closing.get(dialog));
  const source = dialog.id === 'preview-dialog' && morphSource;
  morphSource = null;
  if (animate && moving() && canAnimate && source && source.isConnected && inView(source)) {
    // 预览图飞回它来自的那张封面，背景同时淡出。
    const media = $('preview-image').parentElement;
    dialog.classList.add('morphing');
    dialog.classList.remove('is-visible');
    dialog.inert = true;
    source.style.visibility = 'hidden';
    flight(media, source, true).finished.catch(() => {}).finally(() => {
      dialog.close();
      source.style.visibility = '';
      media.getAnimations().forEach(a => a.cancel());
    });
    return;
  }
  if (!animate || !moving()) {
    dialog.classList.remove('is-visible');
    dialog.close();
    dialog.inert = false;
    return;
  }
  dialog.classList.remove('is-visible');
  dialog.inert = true;
  closing.set(dialog, setTimeout(() => { dialog.close(); dialog.inert = false; closing.delete(dialog); }, 240));
}
function fillPreview(work) {
  $('preview-title').textContent = work.title;
  $('preview-category').textContent = [work.category, ...work.tags].join(' / ');
  $('preview-description').textContent = work.description || '打开作品，体验完整内容。';
  $('preview-image').hidden = !work.image;
  if (work.image) { $('preview-image').src = work.image; $('preview-image').alt = work.title + '的页面截图'; }
  else $('preview-image').removeAttribute('src');
  $('preview-link').href = work.url;
  $('preview-note').textContent = work.image ? '真实封面预览 · 打开原作即可交互。' : '暂未生成封面，仍可直接打开作品。';
}
// 从 from 的位置（含首屏纸页的倾斜）飞到预览框，只动 transform，全程走合成层。
function flight(media, from, reverse) {
  const t = media.getBoundingClientRect(), f = from.getBoundingClientRect();
  const sheet = from.closest('.sheet'), m = sheet ? new DOMMatrix(getComputedStyle(sheet).transform) : null;
  const angle = m ? Math.atan2(m.b, m.a) * 180 / Math.PI : 0;
  const away = 'translate(' + (f.left + f.width / 2 - t.left - t.width / 2) + 'px,' + (f.top + f.height / 2 - t.top - t.height / 2) + 'px) rotate(' + angle + 'deg) scale(' + from.offsetWidth / t.width + ')';
  const frames = [{ transform: away }, { transform: 'none' }];
  return media.animate(reverse ? frames.reverse() : frames, { duration: reverse ? 480 : 640, easing: easeExpo, fill: reverse ? 'forwards' : 'none' });
}
// source：点击的那张封面（卡片或首屏纸页）；封面直接飞成预览大图，背景模糊同步淡入。
async function preview(id, animate, source) {
  const work = byId.get(id);
  if (!work) return;
  const from = source?.querySelector('img') || null;
  if (!(animate && moving() && canAnimate && from && work.image && inView(from))) {
    morphSource = null;
    fillPreview(work);
    openModal('preview-dialog', animate);
    return;
  }
  fillPreview(work);
  await $('preview-image').decode().catch(() => {});
  const dialog = $('preview-dialog'), media = $('preview-image').parentElement;
  clearTimeout(closing.get(dialog));
  closing.delete(dialog);
  morphSource = from;
  dialog.inert = false;
  dialog.classList.remove('instant');
  dialog.classList.add('morphing');
  if (!dialog.open) dialog.showModal();
  dialog.getBoundingClientRect();
  dialog.classList.add('is-visible');
  from.style.visibility = 'hidden';
  const card = from.closest('.card');
  card?.classList.add('is-morphing');
  setTimeout(() => dialog.classList.remove('morphing'), 300);
  flight(media, from).finished.catch(() => {}).finally(() => { from.style.visibility = ''; card?.classList.remove('is-morphing'); });
}

// ── 首屏纸摞 ──
const stack = $('stack');
const sheets = stack ? [...stack.querySelectorAll('.sheet')] : [];
const topSheet = sheets[0];
function assignSheet(sheet, work) {
  if (sheet.dataset.sheet === work.id) return;
  const img = sheet.querySelector('img');
  sheet.dataset.sheet = work.id;
  sheet.href = work.url;
  sheet.setAttribute('aria-label', '打开 ' + work.title);
  img.src = work.image;
  img.alt = work.title + '的页面截图';
  sheet.querySelector('.sheet-no').textContent = 'N°' + pad(works.indexOf(work) + 1);
  sheet.querySelector('.sheet-title').textContent = work.title;
}
// 洗一下纸摞，最上面那张在散开最远时换成随机抽到的作品，合拢后从它飞出预览。
async function shuffleTo(work, animate) {
  if (!topSheet || !work.image || !animate || !moving() || !canAnimate || !inView(stack)) { preview(work.id, animate, null); return; }
  $('random-work').disabled = true;
  await Object.assign(new Image(), { src: work.image }).decode().catch(() => {});
  const riffle = sheets.map((sheet, i) => sheet.animate([{ translate: '0 0', rotate: '0deg' }, { translate: (i % 2 ? 1 : -1) * (24 + i * 8) + 'px ' + (-12 - i * 4) + 'px', rotate: (i % 2 ? 3.5 : -3.5) + 'deg', offset: 0.42 }, { translate: '0 0', rotate: '0deg' }], { duration: 480, easing: 'cubic-bezier(0.65, 0, 0.35, 1)', delay: i * 24, composite: 'add' }));
  setTimeout(() => assignSheet(topSheet, work), 200);
  await Promise.all(riffle.map(a => a.finished.catch(() => {})));
  $('random-work').disabled = false;
  preview(work.id, true, topSheet);
}
// 指针让纸摞按深度错开（越上面的纸动得越多），一阶低通、停稳就停帧。
if (stack) {
  let tx = 0, ty = 0, x = 0, y = 0, frame = 0, last = 0;
  const step = now => {
    const dt = Math.min(64, now - (last || now)); last = now;
    const k = 1 - Math.exp(-dt / 140);
    x += (tx - x) * k; y += (ty - y) * k;
    stack.style.setProperty('--px', x.toFixed(4)); stack.style.setProperty('--py', y.toFixed(4));
    frame = Math.abs(tx - x) + Math.abs(ty - y) > 0.001 ? requestAnimationFrame(step) : 0;
    if (!frame) last = 0;
  };
  const aim = (nx, ny) => { tx = nx; ty = ny; if (!frame && moving()) frame = requestAnimationFrame(step); };
  document.querySelector('.hero').addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || !finePointer.matches) return;
    const r = stack.getBoundingClientRect();
    aim(Math.max(-1.5, Math.min(1.5, (event.clientX - (r.left + r.width / 2)) / r.width)), Math.max(-1.5, Math.min(1.5, (event.clientY - (r.top + r.height / 2)) / r.height)));
  });
  document.querySelector('.hero').addEventListener('pointerleave', () => aim(0, 0));
}

// ── 列表模式：封面跟随指针，速度带一点倾斜 ──
const peek = $('peek'), peekImage = peek.querySelector('img');
let peekFrame = 0, px = 0, py = 0, ptx = 0, pty = 0, plast = 0, peekOn = false;
function peekStep(now) {
  const dt = Math.min(64, now - (plast || now)); plast = now;
  const k = 1 - Math.exp(-dt / 90), ox = px;
  px += (ptx - px) * k; py += (pty - py) * k;
  const tilt = Math.max(-8, Math.min(8, (px - ox) / Math.max(dt, 1) * 3));
  peek.style.setProperty('--x', px.toFixed(1) + 'px'); peek.style.setProperty('--y', py.toFixed(1) + 'px'); peek.style.setProperty('--tilt', tilt.toFixed(2) + 'deg');
  peekFrame = peekOn || Math.abs(ptx - px) + Math.abs(pty - py) > 0.5 ? requestAnimationFrame(peekStep) : 0;
  if (!peekFrame) plast = 0;
}
function hidePeek() { peekOn = false; peek.classList.remove('is-on'); }
$('cards').addEventListener('pointermove', event => {
  if (!state.list || event.pointerType !== 'mouse' || !finePointer.matches || !moving()) return;
  const card = event.target.closest('.card'), work = card && byId.get(card.dataset.workId);
  if (!work?.image) { hidePeek(); return; }
  if (peekImage.getAttribute('src') !== work.image) peekImage.src = work.image;
  ptx = event.clientX + 28; pty = event.clientY - 100;
  if (!peekOn) { if (!peek.classList.contains('is-on')) { px = ptx; py = pty; } peekOn = true; peek.classList.add('is-on'); }
  if (!peekFrame) peekFrame = requestAnimationFrame(peekStep);
});
$('cards').addEventListener('pointerleave', hidePeek);
window.addEventListener('scroll', () => { if (peekOn) hidePeek(); }, { passive: true });

// Build-time HTML remains fully readable without JavaScript; enhance tags only now.
for (const label of document.querySelectorAll('.card-tag-static')) {
  const b = document.createElement('button');
  b.className = 'card-tag';
  b.textContent = label.textContent;
  b.dataset.tag = label.textContent;
  b.setAttribute('aria-label', '筛选标签 ' + label.textContent);
  label.replaceWith(b);
}
document.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button) return;
  const animate = event.detail !== 0;
  if (button.dataset.category) { state.category = button.dataset.category; render({ animate, historyMode: 'push' }); }
  if (button.dataset.tag) {
    const tag = button.dataset.tag;
    state.tags = state.tags.includes(tag) ? state.tags.filter(t => t !== tag) : [...state.tags, tag];
    render({ animate, historyMode: 'push' });
  }
  if (button.dataset.preview) preview(button.dataset.preview, animate, state.list ? null : button.closest('.card-media'));
  if (button.dataset.open) openModal(button.dataset.open, animate);
  if (button.hasAttribute('data-close')) closeModal(button.closest('dialog'), animate);
});
$('search').addEventListener('input', () => { state.q = $('search').value; render({ historyMode: 'replace' }); });
$('sort').addEventListener('change', () => { state.sort = $('sort').value; render({ animate: true, historyMode: 'push' }); });
$('reset').addEventListener('click', event => reset(event.detail !== 0));
$('empty-reset').addEventListener('click', event => { reset(event.detail !== 0); $('search').focus({ preventScroll: true }); });
for (const [id, list] of [['grid-view', false], ['list-view', true]]) $(id).addEventListener('click', event => setView(list, event.detail !== 0));
$('random-work').addEventListener('click', event => {
  const choices = selectWorks(works, state);
  if (choices.length) shuffleTo(choices[Math.floor(Math.random() * choices.length)], event.detail !== 0);
});
for (const dialog of document.querySelectorAll('dialog')) {
  dialog.addEventListener('cancel', event => { event.preventDefault(); closeModal(dialog, true); });
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) closeModal(dialog, true);
  });
  dialog.addEventListener('close', () => { clearTimeout(closing.get(dialog)); dialog.inert = false; dialog.classList.remove('is-visible', 'morphing'); });
}
document.addEventListener('keydown', event => {
  if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey || document.querySelector('dialog[open]') || event.target.closest('input,textarea,select,[contenteditable]')) return;
  event.preventDefault();
  $('search').focus();
});
window.addEventListener('popstate', () => { state = readFilters(location.search, categories, allTags); render(); });
window.addEventListener('resize', () => { cancelCardMotion(); placePill(true); }, { passive: true });
reducedMotion.addEventListener('change', event => {
  if (event.matches) {
    cancelCardMotion();
    hidePeek();
    for (const dialog of document.querySelectorAll('dialog[open]')) if (closing.has(dialog)) closeModal(dialog, false);
  }
});
document.fonts?.ready.then(() => placePill(true));
// 加载幕：字体与首屏封面就绪后计到 100，揭开时放行首屏入场动画。
(function runLoader() {
  const loader = $('loader'), num = $('loader-num'), bar = loader.querySelector('.loader-bar');
  const finish = () => {
    loader.classList.add('is-out');
    setTimeout(() => root.classList.remove('loading'), 280);
    setTimeout(() => { loader.hidden = true; }, 1000);
  };
  if (!moving()) { root.classList.remove('loading'); loader.hidden = true; return; }
  const tasks = [document.fonts?.ready, ...[...document.querySelectorAll('.sheet img')].map(img => img.decode().catch(() => {}))].filter(Boolean);
  let done = 0, shown = 0, last = 0;
  tasks.forEach(task => Promise.resolve(task).finally(() => done++));
  const start = performance.now();
  const tick = now => {
    const dt = Math.min(64, now - (last || now)); last = now;
    const elapsed = now - start;
    const target = elapsed > 4000 ? 100 : Math.min(tasks.length ? done / tasks.length : 1, elapsed / 1100) * 100;
    shown += (target - shown) * (1 - Math.exp(-dt / 120));
    if (target === 100 && shown > 99.5) shown = 100;
    num.textContent = String(Math.round(shown)).padStart(3, '0');
    bar.style.setProperty('--p', (shown / 100).toFixed(4));
    if (shown < 100) requestAnimationFrame(tick); else setTimeout(finish, 160);
  };
  requestAnimationFrame(tick);
})();
root.classList.add('js');
render();
