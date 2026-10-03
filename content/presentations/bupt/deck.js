(() => {
  'use strict';
  const deck = document.querySelector('#deck');
  const slides = [...document.querySelectorAll('.slide')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const portrait = matchMedia('(max-width: 700px) and (orientation: portrait)');
  const overview = document.querySelector('#overview');
  const openIndex = document.querySelector('#open-index');
  const track = document.querySelector('#page-track');
  const overviewGrid = document.querySelector('#overview-grid');
  const prev = document.querySelector('#prev');
  const next = document.querySelector('#next');
  const fullscreen = document.querySelector('#fullscreen');
  const signal = document.querySelector('#signal-progress');
  let current = 0;
  let animations = [];
  let generation = 0;
  let toastTimer;
  let touchStart = null;

  function fit() {
    const scale = Math.min(innerWidth / 1600, innerHeight / 900);
    deck.style.transform = portrait.matches ? 'none' : `scale(${scale})`;
  }
  fit();
  addEventListener('resize', fit);

  slides.forEach((slide, i) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', '幻灯片');
    slide.setAttribute('aria-label', `第 ${i + 1} 页，共 ${slides.length} 页`);
    const step = document.createElement('button');
    step.type = 'button';
    step.setAttribute('aria-label', `第 ${i + 1} 页：${slide.dataset.title}`);
    step.title = `${String(i + 1).padStart(2, '0')} / ${slide.dataset.title}`;
    step.addEventListener('click', () => go(i));
    track.append(step);
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'overview-item';
    item.dataset.theme = slide.dataset.theme;
    const number = document.createElement('span');
    number.textContent = String(i + 1).padStart(2, '0');
    const title = document.createElement('strong');
    title.textContent = slide.dataset.title;
    item.append(number, title);
    item.addEventListener('click', () => {
      overview.close();
      go(i);
    });
    overviewGrid.append(item);
  });

  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    slides.forEach(slide => slide.classList.remove('exiting'));
  }

  function animate(element, frames, options) {
    const animation = element.animate(frames, options);
    animations.push(animation);
    return animation;
  }

  function go(index, { instant = false, updateHash = true } = {}) {
    if (!Number.isFinite(index)) return;
    index = Math.max(0, Math.min(slides.length - 1, Math.trunc(index)));
    const old = slides[current];
    const changed = current !== index;
    const direction = index >= current ? 1 : -1;
    const run = ++generation;
    cancelAnimations();
    current = index;
    const active = slides[current];
    slides.forEach((slide, i) => {
      const selected = i === current;
      slide.classList.toggle('active', selected);
      slide.inert = !selected;
      slide.setAttribute('aria-hidden', String(!selected));
      track.children[i].setAttribute('aria-current', String(selected));
      overviewGrid.children[i].setAttribute('aria-current', String(selected));
    });
    if (changed) active.scrollTop = 0;
    deck.classList.toggle('light', active.dataset.theme === 'light');
    document.querySelector('#chapter-name').textContent = active.dataset.title;
    document.querySelector('#current-page').textContent = String(current + 1).padStart(2, '0');
    document.querySelector('#announcement').textContent = `第 ${current + 1} 页，共 ${slides.length} 页。${active.dataset.title}`;
    signal.style.transform = `scaleX(${(current + 1) / slides.length})`;
    prev.disabled = current === 0;
    next.disabled = current === slides.length - 1;
    if (updateHash) history.replaceState(null, '', `#${current + 1}`);
    if (instant || reduced.matches || !changed) return;

    old.classList.add('exiting');
    const shift = portrait.matches ? 16 : 38;
    animate(old, [
      { opacity: 1, transform: 'translateX(0)' },
      { opacity: 0, transform: `translateX(${-direction * shift}px)` }
    ], { duration: 400, easing: 'cubic-bezier(.4,0,1,1)' });
    const enter = animate(active, [
      { opacity: 0, transform: `translateX(${direction * shift}px)` },
      { opacity: 1, transform: 'translateX(0)' }
    ], { duration: 680, easing: 'cubic-bezier(.16,1,.3,1)' });
    [...active.querySelectorAll('.reveal')].forEach((el, i) => {
      const delay = Math.min(i * 45, 180);
      animate(el, [
        { opacity: 0, transform: 'translateY(15px)' },
        { opacity: 1, transform: 'translateY(0)' }
      ], { duration: 540, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'backwards' });
    });
    const photo = active.querySelector('.cover-image img, .closing-photo, .learning-image img');
    if (photo && !portrait.matches) {
      animate(photo, [{ transform: 'scale(1.035)' }, { transform: 'scale(1)' }], {
        duration: 1000, easing: 'cubic-bezier(.16,1,.3,1)'
      });
    }
    enter.finished.then(() => {
      if (run === generation) old.classList.remove('exiting');
    }).catch(() => {});
  }

  function toast(message) {
    const el = document.querySelector('#toast');
    el.textContent = message;
    el.classList.add('visible');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('visible'), 2600);
  }

  function openOverview() {
    if (overview.open) return;
    overview.showModal();
    overviewGrid.children[current].focus();
  }
  openIndex.addEventListener('click', openOverview);
  document.querySelector('#close-index').addEventListener('click', () => overview.close());
  overview.addEventListener('click', event => {
    if (event.target !== overview) return;
    const r = overview.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) overview.close();
  });
  overview.addEventListener('close', () => openIndex.focus({ preventScroll: true }));
  prev.addEventListener('click', () => go(current - 1));
  next.addEventListener('click', () => go(current + 1));

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen) await document.documentElement.requestFullscreen();
      else toast('当前浏览器不支持全屏，可使用横屏浏览。');
    } catch {
      toast('浏览器未允许全屏，可使用浏览器全屏菜单。');
    }
  }
  fullscreen.addEventListener('click', toggleFullscreen);
  document.addEventListener('fullscreenchange', () => {
    const label = document.fullscreenElement ? '退出全屏' : '进入全屏';
    fullscreen.setAttribute('aria-label', label);
    fullscreen.title = `${label}（F）`;
    fit();
  });

  addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || /INPUT|TEXTAREA|SELECT/.test(event.target.tagName)) return;
    if (overview.open) return;
    const interactive = event.target.closest('button,a');
    // Space activates focused native controls; arrows always navigate the presentation.
    if (event.key === ' ' && interactive) return;
    if (['ArrowRight', 'ArrowDown', 'PageDown', ' '].includes(event.key)) {
      event.preventDefault();
      go(current + 1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      go(current - 1);
    } else if (event.key === 'Home') {
      event.preventDefault(); go(0);
    } else if (event.key === 'End') {
      event.preventDefault(); go(slides.length - 1);
    } else if (event.key.toLowerCase() === 'o') {
      event.preventDefault(); openOverview();
    } else if (event.key.toLowerCase() === 'f') {
      event.preventDefault(); toggleFullscreen();
    }
  });

  deck.addEventListener('touchstart', event => {
    if (event.touches.length !== 1 || event.target.closest('button,a')) { touchStart = null; return; }
    touchStart = { x: event.touches[0].clientX, y: event.touches[0].clientY };
  }, { passive: true });
  deck.addEventListener('touchend', event => {
    if (!touchStart || overview.open) return;
    const touch = event.changedTouches[0];
    const dx = touch.clientX - touchStart.x;
    const dy = touch.clientY - touchStart.y;
    touchStart = null;
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8) go(current + (dx < 0 ? 1 : -1));
  }, { passive: true });
  deck.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  function fromHash() {
    const match = /^#(\d+)$/.exec(location.hash);
    go(match ? Number(match[1]) - 1 : 0, { instant: true });
  }
  addEventListener('hashchange', fromHash);
  reduced.addEventListener('change', () => go(current, { instant: true }));
  fromHash();

  // Explicit probe surface: no autoplay or ambient animation; every page has a stable rest state.
  window.__deck = {
    go: (index, instant = false) => go(index, { instant }),
    state: () => ({ index: current, total: slides.length, title: slides[current].dataset.title, reducedMotion: reduced.matches }),
    hold: milliseconds => animations.forEach(animation => { animation.pause(); animation.currentTime = milliseconds; }),
    settle: () => go(current, { instant: true })
  };
})();
