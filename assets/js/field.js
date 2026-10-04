/* Поле «трилучей-компаса» в ночных сценах: в каждой точке сетки трёхлучевой знак.
   Знаки медленно вращаются волной от света, поворачивают ближайший луч к курсору
   (или к виртуальному курсору, который гуляет сам, если мыши нет 2,5 с), свет смещается наклоном телефона.
   Рисуется только когда сцена видна; при «уменьшить движение» - один статичный кадр. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scenes = [...document.querySelectorAll('.hero, .page-hero, .article-hero, .auth-side, .night')];
  const tilt = { x: 0, y: 0, on: false };
  addEventListener('deviceorientation', e => {
    if (e.gamma == null) return;
    tilt.on = true; tilt.x = Math.max(-1, Math.min(1, e.gamma / 35)); tilt.y = Math.max(-1, Math.min(1, (e.beta - 45) / 35));
  }, { passive: true });

  const PER = Math.PI * 2 / 3;
  // разница углов по модулю 120°: у трилуча все три луча равноправны
  const ad = (a, b) => { let d = (b - a) % PER; if (d > PER / 2) d -= PER; if (d < -PER / 2) d += PER; return d; };

  scenes.forEach(scene => {
    if (scene.querySelector('.dotfield')) return;
    const c = document.createElement('canvas'); c.className = 'dotfield'; c.setAttribute('aria-hidden', 'true');
    const warm = document.createElement('div'); warm.className = 'warm'; warm.setAttribute('aria-hidden', 'true');
    scene.prepend(warm); scene.prepend(c);
    const ctx = c.getContext('2d');
    let W = 0, H = 0, dpr = 1, pts = [], visible = true, raf = 0; const t0 = performance.now();
    const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, last: -1e9 };
    const step = () => (innerWidth < 640 ? 24 : 28);
    const resize = () => {
      dpr = Math.min(1.5, devicePixelRatio || 1);
      W = scene.clientWidth; H = scene.clientHeight;
      c.width = W * dpr; c.height = H * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.lineCap = 'round';
      pts = []; const s = step();
      for (let x = s / 2; x < W; x += s) for (let y = s / 2; y < H; y += s) pts.push({ x, y, r: Math.random() * 6.283 });
    };
    const draw = now => {
      const t = (now - t0) / 1000;
      ctx.clearRect(0, 0, W, H);
      // источник света: правый верхний угол, сдвигается наклоном телефона
      const lx = W * (0.8 + tilt.x * 0.12), ly = H * (0.18 + tilt.y * 0.12);
      // мыши нет 2,5 с: виртуальный курсор медленно гуляет по сцене
      if (now - ptr.last > 2500) {
        ptr.tx = W * (0.62 + 0.3 * Math.sin(t * 0.37)); ptr.ty = H * (0.5 + 0.3 * Math.sin(t * 0.53 + 1));
        if (ptr.x < -999) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
      }
      ptr.x += (ptr.tx - ptr.x) * 0.08; ptr.y += (ptr.ty - ptr.y) * 0.08;
      ctx.lineCap = 'round';
      for (const p of pts) {
        const dx = p.x - lx, dy = p.y - ly, d = Math.hypot(dx, dy) || 1;
        const wave = Math.sin(d / 40 - t * 1.2) * 4 * Math.exp(-d / 760);
        let ox = dx / d * wave, oy = dy / d * wave;
        const px = p.x - ptr.x, py = p.y - ptr.y, pd = Math.hypot(px, py) || 1;
        let boost = 0;
        if (pd < 210) { const k = 1 - pd / 210; ox += px / pd * k * 8; oy += py / pd * k * 8; boost = k; }
        // вращение волной от света + поворот ближайшего луча к курсору
        let rot = p.r * 0.15 + t * 0.12 + Math.sin(d / 90 - t * 0.8) * 0.5;
        rot += ad(rot, Math.atan2(ptr.y - p.y, ptr.x - p.x)) * Math.min(1, Math.exp(-pd / 520) * 1.4);
        // блик: луч, смотрящий на свет, ярче
        const glint = 0.5 + 0.5 * Math.cos(ad(rot, Math.atan2(ly - p.y, lx - p.x)) * 3);
        let a = Math.min(0.85, Math.max(0.05, 0.42 * Math.exp(-d / 620)) + boost * 0.5);
        a = Math.min(0.95, a * (0.45 + 0.75 * glint) + boost * 0.25);
        const g = Math.min(225, 170 - Math.min(80, d / 10) + glint * 45 + boost * 40);
        const x = p.x + ox, y = p.y + oy, s = 3.2 + 2.6 * Math.exp(-d / 520) + boost * 4.5, inner = s * 0.32;
        ctx.lineWidth = 1.5 + 1.1 * Math.exp(-d / 520) + boost * 1.4;
        ctx.strokeStyle = `rgba(255,${g | 0},${(120 + glint * 50) | 0},${a.toFixed(3)})`;
        ctx.beginPath();
        for (let k = 0; k < 3; k++) {
          const an = rot + k * PER;
          ctx.moveTo(x + Math.cos(an) * inner, y + Math.sin(an) * inner);
          ctx.lineTo(x + Math.cos(an) * s, y + Math.sin(an) * s);
        }
        ctx.stroke();
      }
      if (!reduce && visible) raf = requestAnimationFrame(draw);
    };
    const start = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(draw); };
    scene.addEventListener('pointermove', e => {
      const r = scene.getBoundingClientRect(); ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top; ptr.last = performance.now();
      if (ptr.x < -999) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    });
    scene.addEventListener('pointerleave', () => { ptr.last = -1e9; });
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
