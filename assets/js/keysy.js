/* starostin.pro - страница «Кейсы».
   Без JS видно всё: ленты карточек просто скроллятся, все кейсы показаны.
   Скрипт добавляет кнопки «назад/вперёд», точки, клавиатуру и фильтр по направлениям.
   Фильтр можно открыть ссылкой: /keysy/?dir=marketing (slug направления как в /menyu/). */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const updaters = new Map();

  /* ---------- Карусели ---------- */
  $$('[data-cs-case]').forEach(sec => {
    const rail = sec.querySelector('.cs-rail');
    const ctrl = sec.querySelector('.cs-ctrl');
    if (!rail || !ctrl) return;
    const cards = $$('.cs-card', rail);
    const prev = ctrl.querySelector('[data-cs-prev]');
    const next = ctrl.querySelector('[data-cs-next]');
    const dotsWrap = ctrl.querySelector('.cs-dots');
    if (!cards.length || !prev || !next || !dotsWrap) return;

    const pad = () => parseFloat(getComputedStyle(rail).scrollPaddingInlineStart) || 0;
    const max = () => Math.max(0, rail.scrollWidth - rail.clientWidth);
    // offsetLeft карточек считается от .cs-rail (position: relative) и не зависит от прокрутки
    const leftOf = i => Math.min(max(), Math.max(0, cards[i].offsetLeft - pad()));
    let cur = 0;

    const go = i => {
      const n = Math.max(0, Math.min(cards.length - 1, i));
      rail.scrollTo({ left: leftOf(n), behavior: reduce ? 'auto' : 'smooth' });
    };

    const dots = cards.map((card, i) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'cs-dot';
      b.setAttribute('aria-label', `Карточка ${i + 1} из ${cards.length}`);
      b.addEventListener('click', () => go(i));
      dotsWrap.append(b);
      return b;
    });

    const update = () => {
      const x = rail.scrollLeft, m = max();
      let idx = 0;
      if (m > 0 && x >= m - 4) idx = cards.length - 1;
      else {
        let best = Infinity;
        cards.forEach((c, i) => { const d = Math.abs(leftOf(i) - x); if (d < best - 1) { best = d; idx = i; } });
      }
      cur = idx;
      dots.forEach((d, i) => d.setAttribute('aria-current', i === idx ? 'true' : 'false'));
      cards.forEach((c, i) => c.classList.toggle('is-active', i === idx));
      prev.disabled = x <= 4;
      next.disabled = m === 0 || x >= m - 4;
    };

    prev.addEventListener('click', () => go(cur - 1));
    next.addEventListener('click', () => go(cur + 1));

    let raf = 0;
    rail.addEventListener('scroll', () => {
      if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); });
    }, { passive: true });

    rail.addEventListener('keydown', e => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (k === 'ArrowRight') go(cur + 1);
      else if (k === 'ArrowLeft') go(cur - 1);
      else if (k === 'Home') go(0);
      else if (k === 'End') go(cards.length - 1);
      else return;
      e.preventDefault();
    });

    ctrl.hidden = false;
    updaters.set(sec, update);
    update();
  });

  let rt = 0;
  addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => updaters.forEach(fn => fn()), 120);
  });

  /* ---------- Фильтр по направлениям ---------- */
  const bar = document.querySelector('[data-cs-filter]');
  const cases = $$('[data-cs-case]');
  if (!bar || !cases.length) return;
  const chips = $$('[data-cs-dir]', bar);
  const count = bar.querySelector('[data-cs-count]');

  const apply = (dir, remember) => {
    if (!chips.some(c => c.dataset.csDir === dir)) dir = 'all';
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.csDir === dir)));
    let shown = 0;
    cases.forEach(sec => {
      const on = dir === 'all' || (sec.dataset.dir || '').split(/\s+/).includes(dir);
      sec.hidden = !on;
      if (on) shown++;
    });
    if (count) count.textContent = shown === cases.length
      ? `Показаны все кейсы: ${shown}`
      : `Показано кейсов: ${shown} из ${cases.length}`;
    if (remember) {
      try {
        const u = new URL(location.href);
        if (dir === 'all') u.searchParams.delete('dir'); else u.searchParams.set('dir', dir);
        history.replaceState(history.state, '', u);
      } catch (e) {}
    }
    // показанные ленты пересчитывают размеры, ScrollTrigger пересчитывает позиции
    requestAnimationFrame(() => {
      cases.forEach(sec => { if (!sec.hidden) updaters.get(sec)?.(); });
      window.ScrollTrigger?.refresh?.();
    });
  };

  chips.forEach(c => c.addEventListener('click', () => apply(c.dataset.csDir, true)));
  bar.hidden = false;

  // ссылка на конкретный кейс (#slug) важнее фильтра: кейс должен быть виден
  const target = location.hash.length > 1 ? document.getElementById(decodeURIComponent(location.hash.slice(1))) : null;
  const fromUrl = new URLSearchParams(location.search).get('dir') || 'all';
  apply(target && target.matches('[data-cs-case]') ? 'all' : fromUrl, false);
})();
