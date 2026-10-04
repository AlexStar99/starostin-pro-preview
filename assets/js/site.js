/* starostin.pro - поведение сайта.
   Принцип: весь контент есть в HTML и виден без JS. Скрипт только оживляет. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = matchMedia('(pointer: fine)').matches;
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const hasGSAP = typeof window.gsap !== 'undefined';

  /* ---------- Тема ---------- */
  const savedTheme = store.get('theme');
  if (savedTheme) root.dataset.theme = savedTheme;
  $$('[data-theme-toggle]').forEach(btn => btn.addEventListener('click', () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    store.set('theme', root.dataset.theme);
  }));

  /* ---------- Шапка ---------- */
  const header = $('.site-header');
  let lastY = 0;
  const onScroll = () => {
    const y = window.scrollY;
    if (header) {
      header.classList.toggle('is-scrolled', y > 8);
      header.classList.toggle('is-hidden', y > 480 && y > lastY && !document.body.classList.contains('menu-open'));
    }
    lastY = y;
  };
  addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобильное меню ---------- */
  const menu = $('#mobile-menu');
  $$('[data-menu-open]').forEach(b => b.addEventListener('click', () => {
    if (!menu) return;
    menu.hidden = false; document.body.classList.add('menu-open'); document.body.style.overflow = 'hidden';
    b.setAttribute('aria-expanded', 'true');
    $('a', menu)?.focus();
  }));
  const closeMenu = () => {
    if (!menu || menu.hidden) return;
    menu.hidden = true; document.body.classList.remove('menu-open'); document.body.style.overflow = '';
    $$('[data-menu-open]').forEach(b => b.setAttribute('aria-expanded', 'false'));
  };
  $$('[data-menu-close]').forEach(b => b.addEventListener('click', closeMenu));
  menu && $$('a', menu).forEach(a => a.addEventListener('click', closeMenu));
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });

  /* ---------- Плавный скролл (Lenis) + GSAP ---------- */
  let lenis = null;
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ duration: 1.1, smoothWheel: true });
    if (hasGSAP && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      gsap.ticker.add(t => lenis.raf(t * 1000));
      gsap.ticker.lagSmoothing(0);
    } else {
      const raf = t => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      if (id.length > 1 && $(id)) { e.preventDefault(); lenis.scrollTo(id, { offset: -90 }); }
    }));
  }
  if (hasGSAP) {
    const plugins = [window.ScrollTrigger, window.SplitText].filter(Boolean);
    gsap.registerPlugin(...plugins);
  }

  /* ---------- Заголовки: построчное появление ---------- */
  if (!reduce && hasGSAP && window.SplitText) {
    const run = () => $$('[data-split]').forEach((el, i) => {
      el.classList.add('split-ready');
      const split = new SplitText(el, { type: 'lines', linesClass: 'line', mask: 'lines', autoSplit: true,
        onSplit(self) {
          return gsap.from(self.lines, { yPercent: 115, duration: 1.15, ease: 'expo.out', stagger: 0.09, delay: el.dataset.split === 'hero' ? 0.15 : 0,
            scrollTrigger: el.dataset.split === 'hero' ? undefined : { trigger: el, start: 'top 85%', once: true } });
        } });
      return split;
    });
    document.fonts ? document.fonts.ready.then(run) : run();
    gsap.from('[data-hero-fade]', { opacity: 0, y: 18, duration: 1, ease: 'power3.out', stagger: 0.08, delay: 0.55, clearProps: 'opacity,transform' });
  }

  /* ---------- Появление блоков без scroll-timeline ---------- */
  if (!CSS.supports('animation-timeline: view()')) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
    }), { rootMargin: '0px 0px -8% 0px' });
    $$('.reveal').forEach(el => io.observe(el));
    // страховка: всё должно стать видимым, даже если наблюдатель не сработал
    setTimeout(() => $$('.reveal').forEach(el => el.classList.add('is-in')), 4000);
  }

  /* ---------- Счётчики ---------- */
  const fmt = n => n.toLocaleString('ru-RU');
  const counters = $$('[data-count]');
  if (counters.length) {
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const el = en.target, to = +el.dataset.count, dur = 1400, t0 = performance.now();
      io.unobserve(el);
      if (reduce) { el.textContent = fmt(to); return; }
      const tick = t => { const p = Math.min(1, (t - t0) / dur); el.textContent = fmt(Math.round(to * (1 - Math.pow(1 - p, 3)))); if (p < 1) requestAnimationFrame(tick); };
      requestAnimationFrame(tick);
    }), { threshold: 0.6 });
    counters.forEach(c => io.observe(c));
  }

  /* ---------- Магнитные кнопки и свечение за курсором ---------- */
  if (finePointer && !reduce) {
    $$('[data-magnetic]').forEach(el => {
      el.addEventListener('pointermove', e => {
        const r = el.getBoundingClientRect();
        el.style.setProperty('--bx', ((e.clientX - r.left - r.width / 2) * 0.22).toFixed(1) + 'px');
        el.style.setProperty('--by', ((e.clientY - r.top - r.height / 2) * 0.3).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', () => { el.style.setProperty('--bx', '0px'); el.style.setProperty('--by', '0px'); });
    });
    $$('[data-glow-area]').forEach(area => {
      const g = $('.cursor-glow', area); if (!g) return;
      let x = 0, y = 0, tx = 0, ty = 0, raf = 0;
      const loop = () => { x += (tx - x) * 0.12; y += (ty - y) * 0.12; g.style.left = x + 'px'; g.style.top = y + 'px'; raf = Math.abs(tx - x) + Math.abs(ty - y) > 0.5 ? requestAnimationFrame(loop) : 0; };
      area.addEventListener('pointermove', e => { const r = area.getBoundingClientRect(); tx = e.clientX - r.left; ty = e.clientY - r.top; if (!raf) raf = requestAnimationFrame(loop); });
    });
  }

  /* ---------- «Пульт»: ИИ решает задачу на глазах ---------- */
  const consoleEl = $('[data-console]');
  if (consoleEl) {
    const scenarios = JSON.parse($('#console-data')?.textContent || '[]');
    const userEl = $('[data-c-user]', consoleEl), aiEl = $('[data-c-ai]', consoleEl), savedEl = $('[data-c-saved]', consoleEl), metaEl = $('[data-c-meta]', consoleEl);
    const tabs = $$('[role="tab"]', consoleEl);
    let token = 0, auto = null, idx = 0, visible = true;
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const play = async i => {
      const my = ++token, s = scenarios[i]; if (!s) return;
      idx = i;
      tabs.forEach((t, k) => t.setAttribute('aria-selected', String(k === i)));
      metaEl.textContent = s.meta;
      savedEl.textContent = s.saved;
      if (reduce) { userEl.textContent = s.prompt; aiEl.innerHTML = '<ul>' + s.lines.map(l => `<li>${l}</li>`).join('') + '</ul>'; return; }
      userEl.textContent = ''; aiEl.innerHTML = '<ul></ul>'; savedEl.style.opacity = 0;
      const caret = document.createElement('span'); caret.className = 'caret'; userEl.after(caret);
      for (let c = 0; c < s.prompt.length; c++) { if (my !== token) { caret.remove(); return; } userEl.textContent += s.prompt[c]; await sleep(s.prompt[c] === ' ' ? 28 : 16); }
      caret.remove(); await sleep(420);
      const ul = $('ul', aiEl);
      for (const line of s.lines) {
        if (my !== token) return;
        const li = document.createElement('li'); li.innerHTML = line; li.style.cssText = 'opacity:0;transform:translateY(8px);transition:opacity .5s,transform .5s';
        ul.appendChild(li); requestAnimationFrame(() => { li.style.opacity = 1; li.style.transform = 'none'; });
        await sleep(520);
      }
      savedEl.style.transition = 'opacity .6s'; savedEl.style.opacity = 1;
    };
    const schedule = () => { clearInterval(auto); auto = setInterval(() => { if (visible && !document.hidden) play((idx + 1) % scenarios.length); }, 11000); };
    tabs.forEach((t, i) => t.addEventListener('click', () => { play(i); schedule(); }));
    new IntersectionObserver(([en]) => { visible = en.isIntersecting; }).observe(consoleEl);
    if (scenarios.length) { setTimeout(() => play(0), reduce ? 0 : 900); if (!reduce) schedule(); }
  }

  /* ---------- Калькулятор стоимости рутины ---------- */
  $$('[data-calc]').forEach(form => {
    const inputs = $$('input[type="range"]', form);
    const out = k => $(`[data-out="${k}"]`, form.closest('.calc') || form);
    const paint = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
    const update = () => {
      const v = Object.fromEntries(inputs.map(i => [i.name, +i.value]));
      inputs.forEach(i => { paint(i); const o = $(`output[for="${i.id}"]`, form); if (o) o.textContent = (i.dataset.prefix || '') + fmt(+i.value) + (i.dataset.suffix || ''); });
      const hoursWeek = v.people * v.hours * (v.share / 100);
      const hoursMonth = Math.round(hoursWeek * 4.33);
      const rubMonth = Math.round(hoursMonth * v.rate / 1000) * 1000;
      out('hours') && (out('hours').textContent = fmt(hoursMonth));
      out('money') && (out('money').textContent = fmt(rubMonth));
      out('year') && (out('year').textContent = fmt(rubMonth * 12));
      out('days') && (out('days').textContent = fmt(Math.round(hoursMonth / 8)));
    };
    inputs.forEach(i => i.addEventListener('input', update));
    update();
  });

  /* ---------- Процесс: активный шаг ---------- */
  const steps = $$('.steps .step');
  if (steps.length) {
    const meter = $$('.process-meter i');
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (!en.isIntersecting) return;
      const k = steps.indexOf(en.target);
      steps.forEach((s, j) => s.classList.toggle('is-active', j === k));
      meter.forEach((m, j) => m.style.setProperty('--f', j <= k ? 1 : 0));
    }), { rootMargin: '-45% 0px -45% 0px' });
    steps.forEach(s => io.observe(s));
  }

  /* ---------- Оглавление статьи ---------- */
  const toc = $$('.toc a[href^="#"]');
  if (toc.length) {
    const map = new Map(toc.map(a => [decodeURIComponent(a.hash.slice(1)), a]));
    const io = new IntersectionObserver(entries => entries.forEach(en => {
      if (en.isIntersecting) { toc.forEach(a => a.classList.remove('is-active')); map.get(en.target.id)?.classList.add('is-active'); }
    }), { rootMargin: '-20% 0px -70% 0px' });
    map.forEach((_, id) => { const h = document.getElementById(id); h && io.observe(h); });
  }
  // фолбэк прогресса чтения для браузеров без scroll-timeline
  const bar = $('.progress');
  if (bar && !CSS.supports('animation-timeline: scroll()')) {
    const upd = () => { const h = document.documentElement.scrollHeight - innerHeight; bar.style.transform = `scaleX(${h > 0 ? scrollY / h : 0})`; };
    addEventListener('scroll', upd, { passive: true }); upd();
  }

  /* ---------- Копирование промптов ---------- */
  $$('[data-copy]').forEach(btn => btn.addEventListener('click', async () => {
    const src = $(btn.dataset.copy); if (!src) return;
    try { await navigator.clipboard.writeText(src.innerText); btn.textContent = 'Скопировано'; }
    catch (e) { const r = document.createRange(); r.selectNodeContents(src); const s = getSelection(); s.removeAllRanges(); s.addRange(r); btn.textContent = 'Выделено, нажмите Ctrl+C'; }
    setTimeout(() => { btn.textContent = 'Копировать'; }, 2200);
  }));

  /* ---------- Cookies: Метрика только после согласия ---------- */
  const cookie = $('#cookie');
  const loadAnalytics = () => {
    // Сюда вставляется код Яндекс Метрики. Он запускается только после «Принять».
    window.__analyticsAllowed = true;
  };
  const consent = store.get('cookie-consent');
  if (consent === 'all') loadAnalytics();
  if (cookie && !consent) cookie.hidden = false;
  $$('[data-cookie]').forEach(b => b.addEventListener('click', () => {
    store.set('cookie-consent', b.dataset.cookie);
    if (b.dataset.cookie === 'all') loadAnalytics();
    cookie.hidden = true;
  }));

  window.__site = { lenis, store };
})();
