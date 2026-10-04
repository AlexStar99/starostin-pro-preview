/* Главная, знак «Девять звёзд».
   1) Заставка: от медной звезды по дуге зажигаются девять звёзд, под знаком проступает фамилия,
      на четвёртой звезде «СТАР» на миг вспыхивает медью, затем прорисовывается паутинка связей.
      Один раз за визит; без JS и при «уменьшить движение» знак виден сразу целиком.
   2) Колонка звёзд: после первого экрана девять букв встают слева (на узких экранах строкой внизу),
      звезда раздела на экране горит медью. При первом появлении звёзды прилетают из знака. */
(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fig = document.querySelector('.hero-mark');
  const svg = fig && fig.querySelector('.hero-mark-svg');

  /* ---------- заставка ---------- */
  let seen = false;
  try { seen = sessionStorage.getItem('stars-intro') === '1'; } catch (e) {}
  if (svg && !reduce && !seen) {
    try { sessionStorage.setItem('stars-intro', '1'); } catch (e) {}
    const arc = svg.querySelector('.hm-arc');
    const st = [...svg.querySelectorAll('.hm-st')], lb = [...svg.querySelectorAll('.hm-lb')];
    const webL = [...svg.querySelectorAll('.hm-web line')], webD = [...svg.querySelectorAll('.hm-in')];
    const wm = [...fig.querySelectorAll('.hero-mark-wm span')];
    const ORDER = [310, 278, 244, 212, 180, 150, 118, 84, 50];
    const A0 = .5, A1 = 2.3, at = i => i === 0 ? .3 : A0 + (A1 - A0) * (310 - ORDER[i]) / 260;
    const ease = t => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);
    fig.classList.add('is-intro');
    arc.style.strokeDasharray = 1; arc.style.strokeDashoffset = 1;
    webL.forEach(l => { l.style.strokeDasharray = 1; l.style.strokeDashoffset = 1; });
    const T0 = performance.now() + 250;
    const tick = now => {
      const t = (now - T0) / 1000;
      arc.style.strokeDashoffset = 1 - ease((t - A0) / (A1 - A0));
      st.forEach((c, i) => {
        const k = ease((t - at(i)) / .35), pop = i === 0 ? .5 * Math.max(0, 1 - Math.abs(t - .5) / .3) : 0;
        c.style.opacity = k; c.style.transform = `scale(${.4 + .6 * k + pop})`;
        lb[i].style.opacity = ease((t - at(i)) / .3);
        if (t >= at(i)) wm[i] && wm[i].classList.add('on');
      });
      const starFlash = t >= at(3) && t < at(3) + .9;
      wm.slice(0, 4).forEach(x => x.classList.toggle('is-star', starFlash));
      webL.forEach((l, i) => l.style.strokeDashoffset = 1 - ease((t - 2.3 - i * .05) / .5));
      webD.forEach((d, i) => d.style.opacity = ease((t - 2.4 - i * .08) / .3));
      if (t < 3.4) requestAnimationFrame(tick);
      else { fig.classList.remove('is-intro'); [arc, ...webL, ...st, ...lb, ...webD].forEach(el => el.removeAttribute('style')); }
    };
    requestAnimationFrame(tick);
  }

  /* ---------- колонка звёзд ---------- */
  const rail = document.querySelector('.star-rail');
  const secs = [...document.querySelectorAll('[data-star]')];
  if (!rail || !secs.length) return;
  const links = [...rail.querySelectorAll('[data-rail]')];
  const hero = document.querySelector('.home-hero');
  const foot = document.querySelector('.site-footer');
  let flown = false, heroGone = false, footIn = false, active = -1;

  const fly = () => {
    if (flown || reduce || !svg) return; flown = true;
    const from = [...svg.querySelectorAll('.hm-st')].map(c => c.getBoundingClientRect());
    links.forEach((a, i) => {
      const to = a.getBoundingClientRect(), f = from[i];
      if (!f) return;
      const dx = f.left + f.width / 2 - (to.left + to.width / 2), dy = f.top + f.height / 2 - (to.top + to.height / 2);
      a.animate([{ transform: `translate(${dx}px,${dy}px) scale(.6)`, opacity: 0 }, { transform: 'none', opacity: 1 }],
        { duration: 760, delay: i * 45, easing: 'cubic-bezier(.2,.7,.1,1)', fill: 'backwards' });
    });
  };
  const update = () => {
    const on = heroGone && !footIn;
    if (on && !rail.classList.contains('is-on')) { rail.classList.add('is-on'); fly(); }
    if (!on) rail.classList.remove('is-on');
    const night = active === 8;
    rail.classList.toggle('on-night', night);
    links.forEach((a, i) => { a.classList.toggle('is-active', i === active); if (i === active) a.setAttribute('aria-current', 'location'); else a.removeAttribute('aria-current'); });
  };
  if (hero) new IntersectionObserver(([e]) => { heroGone = !e.isIntersecting && e.boundingClientRect.top < 0; update(); }, { threshold: 0 }).observe(hero);
  else heroGone = true;
  if (foot) new IntersectionObserver(([e]) => { footIn = e.isIntersecting; update(); }, { threshold: .15 }).observe(foot);
  const io = new IntersectionObserver(es => {
    es.forEach(e => { if (e.isIntersecting) active = +e.target.dataset.star; });
    update();
  }, { rootMargin: '-45% 0px -50% 0px' });
  secs.forEach(s => io.observe(s));
})();
