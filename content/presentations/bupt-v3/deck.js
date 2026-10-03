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
  const counters = new Map();
  const ease = getComputedStyle(deck).getPropertyValue("--ease").trim();
  let toastTimer;
  let touchStart = null;
  const researchStack = document.querySelector('.research-stack');
  const researchCards = [...researchStack.querySelectorAll('.research-card')];
  const cardToggle = document.querySelector('#research-card-toggle');
  let researchCard = 0;
  let cardAnimations = [];

  function setResearchCard(index, instant = false) {
    const previous = researchCard;
    const poses = researchCards.map(card => ({transform:getComputedStyle(card).transform,zIndex:getComputedStyle(card).zIndex}));
    cardAnimations.forEach(a => a.cancel());
    cardAnimations = [];
    researchCard = index;
    researchStack.dataset.card = String(index);
    researchCards.forEach((card,i) => {
      card.classList.toggle('is-front', i === index);
      card.setAttribute('aria-hidden', String(i !== index));
    });
    document.querySelector('#research-card-status').textContent = index ? '02 / 02 · 成果现场' : '01 / 02 · 天地互联';
    cardToggle.textContent = index ? '返回天地互联 ↗' : '查看成果现场 ↗';
    cardToggle.setAttribute('aria-label', index ? '切换到天地互联卡片' : '切换到成果现场卡片');
    next.title = current === 5 && !index ? '下一步：查看成果现场（→）' : '下一页（→）';
    next.setAttribute('aria-label', current === 5 && !index ? '下一步：查看成果现场' : '下一页');
    if (current === 5 && previous !== index) {
      if (index) window.__spatial?.hold(2400);
      else window.__spatial?.activate(slides[5], true);
    }
    if (instant || reduced.matches || previous === index) return;
    researchCards.forEach((card,i) => {
      const front = i === index;
      const final = getComputedStyle(card);
      const distance = portrait.matches ? 24 : 48;
      const animation = card.animate([
        {...poses[i],offset:0},
        {transform:`translate(${front ? distance : -distance}px,${front ? -12 : 40}px) rotate(${front ? 1 : -1}deg) scale(.985)`,zIndex:poses[i].zIndex,offset:.45},
        {transform:final.transform,zIndex:final.zIndex,offset:1}
      ], {duration:540,easing:ease});
      cardAnimations.push(animation);
    });
  }

  function navigate(direction) {
    if (current === 5 && ((direction > 0 && researchCard === 0) || (direction < 0 && researchCard === 1))) {
      setResearchCard(direction > 0 ? 1 : 0);
      document.querySelector('#announcement').textContent = `第六页，${researchCard ? '成果现场' : '天地互联'}卡片。`;
      return;
    }
    go(current + direction, { card: direction < 0 && current === 6 ? 1 : 0 });
  }
  cardToggle.addEventListener('click', () => setResearchCard(1 - researchCard));

  function fit() {
    const scale = Math.min(innerWidth / 1600, innerHeight / 900);
    deck.style.transform = portrait.matches ? 'none' : `scale(${scale})`;
    if (typeof current === 'number') measureTimeline();
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

  function settleCounter(element) {
    const frame = counters.get(element);
    if (frame !== undefined) cancelAnimationFrame(frame);
    counters.delete(element);
    element.textContent = Number(element.dataset.value).toLocaleString('en-US');
  }

  function cancelAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
    document.querySelectorAll('.count-text').forEach(settleCounter);
    slides.forEach(slide => slide.classList.remove('exiting'));
  }

  function animate(element, frames, options) {
    if (!element) return;
    const animation = element.animate(frames, { easing: ease, fill: 'backwards', ...options });
    animations.push(animation);
    return animation;
  }

  function countUp(element, delay = 0) {
    settleCounter(element);
    if (reduced.matches) return;
    const target = Number(element.dataset.value);
    const start = performance.now() + delay;
    const duration = 1150;
    element.textContent = '0';
    const tick = now => {
      const t = Math.max(0, Math.min(1, (now - start) / duration));
      const value = Math.round(target * (1 - Math.pow(1 - t, 3)));
      element.textContent = value.toLocaleString('en-US');
      if (t < 1) counters.set(element, requestAnimationFrame(tick));
      else settleCounter(element);
    };
    counters.set(element, requestAnimationFrame(tick));
  }

  function measureTimeline() {
    const timeline = document.querySelector('.timeline');
    const dots = [...timeline.querySelectorAll('.timeline-dot')];
    // Local layout units remain correct when the 1600px stage is scaled.
    const first = dots[0].closest('article');
    const last = dots.at(-1).closest('article');
    const length = portrait.matches ? last.offsetTop - first.offsetTop : last.offsetLeft - first.offsetLeft;
    timeline.style.setProperty('--timeline-length', `${length}px`);
    return { timeline, dots, length };
  }

  function playTimeline(base) {
    const { timeline, dots, length } = measureTimeline();
    const vertical = portrait.matches;
    const duration = 2000;
    const scale = vertical ? 'scaleY' : 'scaleX';
    animate(timeline.querySelector('.timeline-progress'), [
      { transform: `${scale}(0)` }, { transform: `${scale}(1)` }
    ], { delay: base, duration, easing: 'linear' });
    const head = timeline.querySelector('.timeline-head');
    animate(head, [
      { transform: 'translate(0,0)', opacity: 1, offset: 0 },
      { transform: vertical ? `translateY(${length}px)` : `translateX(${length}px)`, opacity: 1, offset: .96 },
      { transform: vertical ? `translateY(${length}px)` : `translateX(${length}px)`, opacity: 0, offset: 1 }
    ], { delay: base, duration: duration / .96, easing: 'linear' });
    dots.forEach((dot, i) => {
      const article = dot.closest('article');
      const first = dots[0].closest('article');
      const distance = vertical ? article.offsetTop - first.offsetTop : article.offsetLeft - first.offsetLeft;
      const delay = base + duration * (length ? distance / length : i / (dots.length - 1));
      animate(dot.querySelector('.timeline-light'), [
        { opacity: 0, transform: 'scale(.65)' }, { opacity: 1, transform: 'scale(1)' }
      ], { delay, duration: 220 });
      animate(article.querySelector('.milestone-copy'), [
        { opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }
      ], { delay: delay + 60, duration: 460 });
    });
  }

  function revealContent(active, base) {
    const elements = [...active.querySelectorAll('.reveal')];
    elements.forEach((element, i) => {
      // Lead with the title, then show related rows together within a short window.
      const delay = base + Math.min(i, 6) * 55;
      const isPhoto = element.matches('figure, .research-visual');
      const isTitle = element.matches('h1,h2');
      const isRow = element.matches('article, .research-item');
      const start = isPhoto ? 'perspective(1400px) translateY(14px) rotateY(-1.2deg) scale(.985)'
        : isTitle ? 'translateX(18px)' : isRow ? 'translateX(12px)' : 'translateY(8px)';
      animate(element, [
        { opacity: 0, transform: start },
        { opacity: 1, transform: 'translate(0,0)' }
      ], { duration: isPhoto ? 640 : isTitle ? 540 : 420, delay });
      element.querySelectorAll('.count-text').forEach(number => countUp(number, delay + 90));
    });
    if (active.classList.contains('history')) playTimeline(base + 340);
    const photo = active.querySelector('.cover-image img, .closing-photo, .learning-image img');
    if (photo && !portrait.matches) animate(photo, [
      { transform: 'scale(1.035)' }, { transform: 'scale(1)' }
    ], { duration: 1200, delay: base });
    const grade = active.querySelector('.grade');
    if (grade) animate(grade, [
      { opacity: .4, transform: 'scale(.96)' }, { opacity: 1, transform: 'scale(1)' }
    ], { duration: 700, delay: base + 140 });
  }

  function go(index, { instant = false, updateHash = true, replay = false, card = 0 } = {}) {
    if (!Number.isFinite(index)) return;
    index = Math.max(0, Math.min(slides.length - 1, Math.trunc(index)));
    const old = slides[current];
    const changed = current !== index;
    const direction = index >= current ? 1 : -1;
    if (!changed && !instant && !replay) return;
    deck.classList.toggle('motion-instant', instant || reduced.matches);
    const run = ++generation;
    // Freeze the outgoing visual at its actual pose before cancelling interrupted entries.
    const outgoing = changed && !instant && !reduced.matches
      ? [old, ...old.querySelectorAll('.reveal, .milestone-copy')].map(element => {
        const style = getComputedStyle(element);
        return {element, opacity: style.opacity, transform: style.transform};
      }) : [];
    cancelAnimations();
    current = index;
    setResearchCard(changed || replay ? card : researchCard, true);
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
    measureTimeline();
    window.__spatial?.activate(active, instant || reduced.matches);
    if (current === 5 && researchCard === 1) window.__spatial?.hold(2400);
    if (instant || reduced.matches) return;

    if (changed) {
      old.classList.add('exiting');
      outgoing.slice(1).forEach(({element, opacity, transform}) => {
        animate(element, [{opacity, transform}, {opacity, transform}], {duration:280});
      });
      animate(old, [
        {opacity: outgoing[0]?.opacity ?? 1, transform: outgoing[0]?.transform ?? 'none'},
        {opacity: 0, transform: `translateX(${-direction * 24}px)`}
      ], {duration:280});
      const photoPage = active.matches('.cover,.learning,.campuses,.life,.closing') && !portrait.matches;
      const enter = animate(active, [
        {opacity:0, transform:`perspective(1800px) translateX(${direction * (photoPage ? 48 : 28)}px) rotateY(${direction * .65}deg)`},
        {opacity:1, transform:'perspective(1800px) translateX(0) rotateY(0deg)'}
      ], {duration:photoPage ? 620 : 480});
      enter.finished.then(() => {
        if (run === generation) old.classList.remove('exiting');
      }).catch(() => {});
    }
    revealContent(active, changed ? 100 : 50);
  }

  document.querySelectorAll('.metric-button').forEach(button => {
    button.addEventListener('click', () => button.querySelectorAll('.count-text').forEach(el => countUp(el)));
  });
  document.querySelector('#replay').addEventListener('click', () => go(current, { replay: true }));

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
    if (!reduced.matches) overview.animate([
      {opacity:0, transform:'translateY(8px) scale(.98)'},
      {opacity:1, transform:'translateY(0) scale(1)'}
    ], {duration:220, easing:ease});
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
  prev.addEventListener('click', () => navigate(-1));
  next.addEventListener('click', () => navigate(1));

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
      navigate(1);
    } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(event.key)) {
      event.preventDefault();
      navigate(-1);
    } else if (event.key === 'Home') {
      event.preventDefault(); go(0);
    } else if (event.key === 'End') {
      event.preventDefault(); go(slides.length - 1);
    } else if (event.key.toLowerCase() === 'r') {
      event.preventDefault(); go(current, { replay: true });
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
    if (Math.abs(dx) > 65 && Math.abs(dx) > Math.abs(dy) * 1.8) navigate(dx < 0 ? 1 : -1);
  }, { passive: true });
  deck.addEventListener('touchcancel', () => { touchStart = null; }, { passive: true });

  function fromHash(initial = false) {
    const match = /^#(\d+)$/.exec(location.hash);
    go(match ? Number(match[1]) - 1 : 0, { instant: !initial, replay: initial });
  }
  addEventListener('hashchange', () => fromHash());
  reduced.addEventListener('change', () => go(current, { instant: true }));
  fromHash(true);

  addEventListener('beforeprint', () => go(current, { instant: true }));
  portrait.addEventListener('change', () => { fit(); go(current, { instant: true }); });

  // Explicit probe surface: no autoplay or ambient animation; every page has a stable rest state.
  window.__deck = {
    go: (index, instant = false) => go(index, { instant }),
    replay: () => go(current, { replay: true }),
    state: () => ({ index: current, total: slides.length, title: slides[current].dataset.title, reducedMotion: reduced.matches, researchCard }),
    hold: milliseconds => { [...animations,...cardAnimations].forEach(animation => { animation.pause(); animation.currentTime = milliseconds; }); window.__spatial?.hold(milliseconds); },
    settle: () => go(current, { instant: true })
  };
})();
