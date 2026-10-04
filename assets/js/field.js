/* Поле точек в ночных сценах: волна от курсора (или наклона телефона) и медленное дыхание.
   Рисуется только когда сцена видна; при «уменьшить движение» - один статичный кадр. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = [...document.querySelectorAll('.hero, .page-hero, .article-hero, .auth-side, .night')];
  const tilt = { x: 0, y: 0, on: false };
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tilt.on = true; tilt.x = Math.max(-1, Math.min(1, e.gamma / 35)); tilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  }, { passive: true });

  scenes.forEach(scene => {
    if (scene.querySelector('.dotfield')) return;
    const c = document.createElement('canvas'); c.className = 'dotfield'; c.setAttribute('aria-hidden', 'true');
    const warm = document.createElement('div'); warm.className = 'warm'; warm.setAttribute('aria-hidden', 'true');
    scene.prepend(warm); scene.prepend(c);
    const ctx = c.getContext('2d');
    let W = 0, H = 0, dpr = 1, pts = [], visible = true, raf = 0, t0 = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    const step = () => (innerWidth < 640 ? 20 : 24);
    const resize = () => {
      dpr = Math.min(1.5, devicePixelRatio || 1);
      W = scene.clientWidth; H = scene.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pts = []; const s = step();
      for (let x = s / 2; x < W; x += s) for (let y = s / 2; y < H; y += s) pts.push([x, y]);
    };
    const draw = now => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // источник света: правый верхний угол, сдвигается наклоном телефона
      const lx = W * (0.8 + tilt.x * 0.12), ly = H * (0.18 + tilt.y * 0.12);
      ptr.x += (ptr.tx - ptr.x) * 0.08; ptr.y += (ptr.ty - ptr.y) * 0.08;
      for (const [x, y] of pts) {
        const dx = x - lx, dy = y - ly, d = Math.hypot(dx, dy) || 1;
        let ox = 0, oy = 0;
        const wave = Math.sin(d / 40 - t * 1.2) * 4 * Math.exp(-d / 760);
        ox += dx / d * wave; oy += dy / d * wave;
        const px = x - ptr.x, py = y - ptr.y, pd = Math.hypot(px, py);
        let boost = 0;
        if (pd < 170) { const f = (1 - pd / 170); ox += px / (pd || 1) * f * 14; oy += py / (pd || 1) * f * 14; boost = f; }
        const a = Math.min(0.85, Math.max(0.05, 0.42 * Math.exp(-d / 620)) + boost * 0.5);
        const g = 170 - Math.min(80, d / 10);
        ctx.fillStyle = `rgba(255,${g | 0},120,${a.toFixed(3)})`;
        ctx.beginPath(); ctx.arc(x + ox, y + oy, 1.1 + 1.5 * Math.exp(-d / 520) + boost * 1.2, 0, 6.283); ctx.fill();
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    scene.addEventListener('pointermove', e => { const r = scene.getBoundingClientRect(); ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; if (ptr.x < -999) { ptr.x = ptr.tx; ptr.y = ptr.ty; } });
    scene.addEventListener('pointerleave', () => { ptr.tx = ptr.ty = -9999; });
    new ResizeObserver(() => { resize(); if (reduce) draw(performance.now()); }).observe(scene);
    new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible && !reduce) start(); else cancelAnimationFrame(raf); }).observe(scene);
    resize(); reduce ? draw(performance.now()) : start();
  });

  /* Векторные линии прорисовываются при появлении: [data-draw] path */
  const draws = [...document.querySelectorAll('[data-draw]')];
  if (draws.length) {
    draws.forEach(svg => svg.querySelectorAll('path.draw').forEach(p => {
      const len = p.getTotalLength(); p.style.setProperty('--len', len);
      if (!reduce) { p.style.strokeDasharray = len; p.style.strokeDashoffset = len; }
    }));
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      e.target.classList.add('is-drawn'); e.target.closest('.dash')?.classList.add('is-on'); io.unobserve(e.target);
    }), { threshold: 0.35 });
    draws.forEach(d => io.observe(d));
  }
})();
