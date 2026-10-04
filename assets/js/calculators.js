/* Калькуляторы для руководителей. Каждый инструмент - секция с [data-tool="id"].
   Результаты каждого расчёта кладутся в window.__capture[id], их забирает форма захвата. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = n => Math.round(n).toLocaleString('ru-RU');
  const rub = n => fmt(n) + ' ₽';
  window.__capture = window.__capture || {};

  /* Одометр: цифры прокручиваются к новому значению */
  const odo = (el, text) => {
    if (!el) return;
    if (reduce || !el.classList.contains('odo')) { el.textContent = text; return; }
    if (el.dataset.v === text) return;
    el.dataset.v = text;
    el.setAttribute('aria-label', text);
    const chars = [...text];
    const cols = $$(':scope > *', el);
    if (cols.length !== chars.length) {
      el.innerHTML = chars.map(c => /\d/.test(c)
        ? `<span class="col" aria-hidden="true">${'0123456789'.split('').map(d => `<span>${d}</span>`).join('')}</span>`
        : `<span class="ch" aria-hidden="true">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
    }
    $$(':scope > *', el).forEach((node, i) => {
      if (node.classList.contains('col')) node.style.transform = `translateY(-${+chars[i]}em)`;
    });
  };

  /* Ползунки: подпись значения и заливка трека */
  const bindRanges = (root, update) => {
    const rs = $$('input[type="range"]', root);
    const paint = i => {
      i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
      const o = $(`output[for="${i.id}"]`, root);
      if (o) {
        const v = +i.value;
        const shown = i.dataset.fmt === 'x' ? '×' + v.toFixed(1).replace('.', ',') : fmt(v);
        o.textContent = (i.dataset.prefix || '') + shown + (i.dataset.suffix || '');
      }
    };
    rs.forEach(i => { paint(i); i.addEventListener('input', () => { paint(i); update(); }); });
    return () => Object.fromEntries(rs.map(i => [i.name, +i.value]));
  };
  const tabs = (root, onChange) => {
    const bs = $$('.seg [role="tab"]', root);
    bs.forEach(b => b.addEventListener('click', () => {
      bs.forEach(x => x.setAttribute('aria-selected', String(x === b)));
      onChange(b.dataset.value);
    }));
    return () => (bs.find(b => b.getAttribute('aria-selected') === 'true') || bs[0]).dataset.value;
  };
  const personSVG = '<svg viewBox="0 0 26 34" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="13" cy="9" r="6" fill="currentColor" fill-opacity=".18"/><path d="M2 33c0-7 5-12 11-12s11 5 11 12" fill="currentColor" fill-opacity=".18"/></svg>';
  const drawPeople = (el, list) => {
    if (!el) return;
    el.innerHTML = list.map(cls => `<span class="person ${cls}">${personSVG}</span>`).join('');
  };
  const setBar = (el, pct) => el && el.style.setProperty('--w', Math.max(0, Math.min(100, pct)).toFixed(1) + '%');

  /* ============ 1. ФОТ: два сценария ============ */
  $$('[data-tool="fot"]').forEach(root => {
    const texts = {
      lean: 'Тот же объём работы делает меньше людей. Оставшимся повышаем зарплату, компания всё равно тратит меньше. Освободившихся сотрудников можно перевести на рост: продажи, сервис, новые продукты.',
      grow: 'Компания растёт, а людей не нанимает: команда делает больше с ИИ и получает за это премию. Экономия идёт за счёт найма, которого не было.'
    };
    const read = bindRanges(root, () => update());
    const mode = tabs(root, () => update());
    const update = () => {
      const v = read(), m = mode();
      $$('[data-only]', root).forEach(el => { el.hidden = el.dataset.only !== m; });
      const txt = $('[data-scenario-text]', root); if (txt) txt.textContent = texts[m];
      const tax = 1 + v.tax / 100, k = v.k, N = v.people, S = v.salary;
      const aiPer = v.aicost; // ₽ в месяц на сотрудника, который работает с ИИ
      const before = N * S * tax;
      let after, people = [], staffAfter, salaryAfter, hiresNo = 0, hiresAi = 0, oneTimeSaved = 0;
      if (m === 'lean') {
        staffAfter = Math.max(1, Math.ceil(N / k - 1e-9));
        salaryAfter = S * (1 + v.raise / 100);
        after = staffAfter * salaryAfter * tax + staffAfter * aiPer;
        people = Array.from({ length: N }, (_, i) => i < staffAfter ? 'is-boost' : 'is-freed');
      } else {
        const need = N * (1 + v.growth / 100);
        hiresNo = Math.max(0, Math.ceil(need - N - 1e-9));
        hiresAi = Math.max(0, Math.ceil(need / k - N - 1e-9));
        staffAfter = N + hiresAi;
        salaryAfter = S * (1 + v.bonus / 100);
        const beforeGrow = (N + hiresNo) * S * tax;            // без ИИ: нанимаем под рост
        after = N * salaryAfter * tax + hiresAi * S * tax + staffAfter * aiPer;
        oneTimeSaved = (hiresNo - hiresAi) * S;                 // подбор и адаптация ≈ одна зарплата на найм
        people = [...Array(N).fill('is-boost'), ...Array(hiresAi).fill(''), ...Array(Math.max(0, hiresNo - hiresAi)).fill('is-hire is-freed')];
        root.dataset.before = beforeGrow;
      }
      const base = m === 'lean' ? before : +root.dataset.before;
      const saveM = base - after;
      const saveY = saveM * 12 + oneTimeSaved;
      const payback = saveM > 0 ? v.impl / saveM : Infinity;
      const outRate = (k).toFixed(1).replace('.', ',');
      drawPeople($('[data-people]', root), people.slice(0, 120));
      setBar($('[data-bar="before"]', root), 100);
      setBar($('[data-bar="after"]', root), base > 0 ? after / base * 100 : 0);
      $('[data-val="before"]', root).textContent = rub(base);
      $('[data-val="after"]', root).textContent = rub(after);
      odo($('[data-o="saveM"]', root), fmt(Math.max(0, saveM)));
      odo($('[data-o="saveY"]', root), fmt(Math.max(0, saveY)));
      const pb = $('[data-o="payback"]', root);
      pb.textContent = isFinite(payback) ? (payback < 1 ? 'меньше месяца' : payback.toFixed(1).replace('.', ',') + ' мес.') : 'не окупается';
      pb.classList.toggle('is-neg', !isFinite(payback));
      $('[data-o="income"]', root).textContent = rub(S) + ' → ' + rub(salaryAfter);
      $('[data-o="output"]', root).textContent = '×' + outRate;
      $('[data-o="staff"]', root).textContent = m === 'lean' ? `${N} → ${staffAfter}` : `${N + hiresNo} → ${staffAfter}`;
      const neg = $('[data-negative]', root); if (neg) neg.hidden = saveM > 0;
      window.__capture.fot = {
        title: 'Оценка экономии ФОТ с ИИ',
        lines: [
          `Сценарий: ${m === 'lean' ? 'та же работа меньшим составом' : 'рост без найма'}`,
          `Сотрудников: ${N}, зарплата ${rub(S)}, допущение о росте выработки ×${outRate}`,
          `ФОТ с начислениями: ${rub(base)} → ${rub(after)} в месяц`,
          `Оценка экономии: ${rub(Math.max(0, saveM))} в месяц, ${rub(Math.max(0, saveY))} за год`,
          `Расчётная окупаемость при затратах ${rub(v.impl)}: ${pb.textContent}`
        ]
      };
    };
    update();
  });

  /* ============ 2. Неделя отдела: до и после ============ */
  const DEPTS = {
    marketing: { name: 'Маркетинг', tasks: [['Посты и тексты для соцсетей', 10, 4], ['Креативы и баннеры', 6, 2.5], ['Отчёт по рекламе', 4, 1], ['Анализ конкурентов', 4, 1], ['Рассылки и лендинги', 6, 2.5]] },
    sales: { name: 'Продажи', tasks: [['Подготовка КП', 8, 3], ['Заметки по звонкам и CRM', 6, 1.5], ['Ответы на типовые вопросы', 7, 2.5], ['Разбор отказов', 3, 0.75], ['Отчёт руководителю', 3, 0.75]] },
    finance: { name: 'Аналитика и финансы', tasks: [['Сбор данных из систем', 8, 3], ['Сводные таблицы', 6, 2], ['Комментарии к отчётам', 4, 1.25], ['Проверка договоров и счетов', 5, 2.5], ['Ответы на запросы руководства', 4, 1.5]] },
    ceo: { name: 'Руководитель', tasks: [['Чтение отчётов отделов', 6, 1.5], ['Подготовка к встречам', 4, 1.5], ['Переписка и поручения', 8, 4], ['Мониторинг рынка и новостей', 3, 0.5], ['Протоколы и контроль задач', 3, 1]] },
    hr: { name: 'HR', tasks: [['Тексты вакансий', 3, 0.75], ['Первичный отбор резюме', 8, 2.5], ['Ответы кандидатам', 4, 1], ['Онбординг-материалы', 4, 1.5], ['Опросы и аналитика', 3, 1]] }
  };
  $$('[data-tool="week"]').forEach(root => {
    let dept = 'marketing';
    const read = bindRanges(root, () => update());
    const sw = $('[data-ai-switch]', root);
    $$('[data-dept]', root).forEach(b => b.addEventListener('click', () => {
      dept = b.dataset.dept;
      $$('[data-dept]', root).forEach(x => x.setAttribute('aria-pressed', String(x === b)));
      update();
    }));
    sw && sw.addEventListener('change', () => update());
    const update = () => {
      const v = read(), d = DEPTS[dept], on = !sw || sw.checked;
      const max = Math.max(...d.tasks.map(t => t[1]));
      $('[data-tasks]', root).innerHTML = d.tasks.map(([n, b, a]) => `
        <li class="dept-task"><span class="name">${n}</span><span class="hrs">${b} ч → <b>${on ? a : b} ч</b></span>
        <span class="track"><i class="b" style="--b:${b / max * 100}%"></i><i class="a" style="--a:${(on ? a : b) / max * 100}%"></i></span></li>`).join('');
      const B = d.tasks.reduce((s, t) => s + t[1], 0), A = d.tasks.reduce((s, t) => s + t[2], 0);
      const team = v.team, freedWeek = (B - A) * team;
      const mult = B / A;
      odo($('[data-o="freed"]', root), fmt(on ? freedWeek * 4.33 : 0));
      $('[data-o="mult"]', root).textContent = on ? '×' + mult.toFixed(1).replace('.', ',') : '×1';
      $('[data-o="fte"]', root).textContent = on ? (freedWeek / 40).toFixed(1).replace('.', ',') : '0';
      setBar($('[data-bar="wb"]', root), 100);
      setBar($('[data-bar="wa"]', root), on ? A / B * 100 : 100);
      $('[data-val="wb"]', root).textContent = fmt(B * team) + ' ч';
      $('[data-val="wa"]', root).textContent = fmt((on ? A : B) * team) + ' ч';
      window.__capture.week = { title: `Неделя отдела «${d.name}»: оценка до и после ИИ`, lines: [`Команда: ${team} чел.`, `Рутина в неделю (ориентир): ${fmt(B * team)} ч → ${fmt(A * team)} ч`, `Оценка: освобождается в месяц ${fmt(freedWeek * 4.33)} ч, это ${(freedWeek / 40).toFixed(1).replace('.', ',')} ставки`] };
    };
    update();
  });

  /* ============ 3. Скорость решений ============ */
  $$('[data-tool="decisions"]').forEach(root => {
    const read = bindRanges(root, () => update());
    const update = () => {
      const v = read(), f = 1 - v.speed / 100;
      // этапы решения в днях: сбор данных, анализ, отчёт и согласование, само решение
      const before = [v.collect, v.analysis, v.wait, 0.5];
      const after = [v.collect * f, v.analysis * f, v.wait * Math.max(0.25, f), 0.5];
      const tb = before.reduce((a, b) => a + b, 0), ta = after.reduce((a, b) => a + b, 0);
      const paint = (sel, arr) => $$(`${sel} .tl-seg`, root).forEach((s, i) => { s.style.flexGrow = arr[i]; s.textContent = arr[i] >= 0.6 ? arr[i].toFixed(1).replace('.', ',') + ' дн' : ''; });
      paint('[data-tl="before"]', before); paint('[data-tl="after"]', after);
      $('[data-tl-total="before"]', root).textContent = tb.toFixed(1).replace('.', ',') + ' дн';
      $('[data-tl-total="after"]', root).textContent = ta.toFixed(1).replace('.', ',') + ' дн';
      $('[data-tl="after"]', root).style.width = (ta / tb * 100) + '%';
      const hours = v.decisions * v.mgrHours * (v.speed / 100);
      odo($('[data-o="days"]', root), (tb - ta).toFixed(1).replace('.', ','));
      $('[data-o="hours"]', root).textContent = fmt(hours) + ' ч';
      $('[data-o="money"]', root).textContent = rub(hours * v.rate);
      $('[data-o="more"]', root).textContent = '×' + (tb / ta).toFixed(1).replace('.', ',');
      window.__capture.decisions = { title: 'Скорость управленческих решений: оценка', lines: [`Решений в месяц: ${v.decisions}`, `От вопроса до решения: ${tb.toFixed(1)} → ${ta.toFixed(1)} дн. при ускорении ${v.speed}%`, `Оценка: освобождается часов руководителей ${fmt(hours)} в месяц (${rub(hours * v.rate)})`] };
    };
    update();
  });

  /* ============ 4. Анализ конкурентов ============ */
  $$('[data-tool="competitors"]').forEach(root => {
    const read = bindRanges(root, () => update());
    const chips = $$('[data-channel]', root);
    chips.forEach(c => c.addEventListener('click', () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); update(); }));
    let played = false;
    const playReport = () => {
      if (played || reduce) return; played = true;
      const items = $$('.report li', root); items.forEach(li => li.classList.add('is-wait'));
      items.forEach((li, i) => setTimeout(() => li.classList.remove('is-wait'), 400 + i * 650));
    };
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { playReport(); o.disconnect(); } }, { threshold: .4 }).observe(root);
    $('[data-replay]', root)?.addEventListener('click', () => { played = false; playReport(); });
    const update = () => {
      const v = read();
      const ch = chips.filter(c => c.getAttribute('aria-pressed') === 'true').length;
      const perYear = { 4: 4, 12: 12, 52: 52 }[v.freq] || v.freq;
      const manual = v.rivals * ch * 1.5 * perYear;  // 1,5 ч на канал конкурента вручную
      const ai = v.rivals * ch * 0.25 * perYear;     // 15 мин на проверку отчёта агента
      odo($('[data-o="saved"]', root), fmt(manual - ai));
      $('[data-o="manual"]', root).textContent = fmt(manual) + ' ч';
      $('[data-o="ai"]', root).textContent = fmt(ai) + ' ч';
      $('[data-o="money"]', root).textContent = rub((manual - ai) * v.rate);
      setBar($('[data-bar="cm"]', root), 100); setBar($('[data-bar="ca"]', root), manual ? ai / manual * 100 : 0);
      window.__capture.competitors = { title: 'Мониторинг конкурентов с ИИ-агентом: оценка', lines: [`Конкурентов: ${v.rivals}, каналов: ${ch}, проверок в год: ${perYear}`, `Вручную: ${fmt(manual)} ч в год, с агентом: ${fmt(ai)} ч`, `Оценка экономии: ${rub((manual - ai) * v.rate)} в год`] };
    };
    update();
  });

  /* ============ 5. Один материал - все площадки ============ */
  $$('[data-tool="publish"]').forEach(root => {
    const read = bindRanges(root, () => update());
    const chips = $$('[data-platform]', root);
    chips.forEach(c => c.addEventListener('click', () => { c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true')); update(); pulse(); }));
    const pulse = () => {
      if (reduce) return;
      const on = $$('.fan-tile:not(.is-off)', root);
      on.forEach((t, i) => setTimeout(() => { t.classList.add('is-pulse'); setTimeout(() => t.classList.remove('is-pulse'), 500); }, i * 120));
    };
    new IntersectionObserver(([e], o) => { if (e.isIntersecting) { pulse(); o.disconnect(); } }, { threshold: .5 }).observe(root);
    const update = () => {
      const v = read();
      const sel = chips.filter(c => c.getAttribute('aria-pressed') === 'true').map(c => c.dataset.platform);
      $$('.fan-tile', root).forEach(t => t.classList.toggle('is-off', !sel.includes(t.dataset.tile)));
      const perMonth = v.items * 4.33;
      const manual = perMonth * sel.length * (v.manualMin / 60);
      const ai = perMonth * sel.length * (8 / 60);   // 8 минут: проверить и поправить адаптацию
      odo($('[data-o="saved"]', root), fmt(manual - ai));
      $('[data-o="posts"]', root).textContent = fmt(perMonth * sel.length);
      $('[data-o="money"]', root).textContent = rub((manual - ai) * v.rate);
      window.__capture.publish = { title: 'Публикация во все площадки: оценка', lines: [`Материалов в неделю: ${v.items}, площадок: ${sel.length}`, `Публикаций в месяц: ${fmt(perMonth * sel.length)}`, `Оценка экономии: ${fmt(manual - ai)} ч, ${rub((manual - ai) * v.rate)} в месяц`] };
    };
    update();
  });

  /* ============ 6. Цена промедления ============ */
  $$('[data-tool="delay"]').forEach(root => {
    const read = bindRanges(root, () => update());
    const svg = $('svg.chart', root);
    const update = () => {
      const v = read();
      const months = v.months, monthly = v.monthly;
      const pts = Array.from({ length: months + 1 }, (_, i) => i * monthly);
      const W = 520, H = 220, L = 54, R = 14, T = 14, B = 30;
      const max = Math.max(1, pts[pts.length - 1]);
      const x = i => L + i / months * (W - L - R), y = val => T + (1 - val / max) * (H - T - B);
      const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)}`).join('');
      const ticks = [0, .5, 1].map(t => `<line x1="${L}" x2="${W - R}" y1="${y(max * t)}" y2="${y(max * t)}"/>`).join('');
      const labels = [0, .5, 1].map(t => `<text x="${L - 8}" y="${y(max * t) + 3}" text-anchor="end">${fmt(max * t / 1000)}к</text>`).join('');
      const mlabels = [0, Math.round(months / 2), months].map(i => `<text x="${x(i)}" y="${H - 8}" text-anchor="middle">${i} мес</text>`).join('');
      svg.innerHTML = `<g class="grid">${ticks}</g><g class="axis">${labels}${mlabels}</g>
        <path class="area" d="${line}L${x(months)},${y(0)}L${x(0)},${y(0)}Z"/><path class="line" d="${line}"/>
        <circle class="dot" cx="${x(months)}" cy="${y(max)}" r="5"/>`;
      odo($('[data-o="lost"]', root), fmt(monthly * months));
      $('[data-o="months"]', root).textContent = months + ' мес.';
      window.__capture.delay = { title: 'Цена промедления с ИИ: оценка', lines: [`Ожидаемая экономия по вашей оценке: ${rub(monthly)} в месяц`, `Отложили на ${months} мес.: условно не получено ${rub(monthly * months)}`] };
    };
    // взять экономию из ФОТ-калькулятора на этой же странице
    $('[data-from-fot]', root)?.addEventListener('click', () => {
      const fot = $('[data-tool="fot"] [data-o="saveM"]');
      const val = fot ? +(fot.dataset.v || fot.textContent).replace(/\D/g, '') : 0;
      const r = $('input[name="monthly"]', root);
      if (val && r) { r.value = Math.min(+r.max, Math.round(val / +r.step) * +r.step); r.dispatchEvent(new Event('input')); }
    });
    update();
  });

  /* ============ 7. ИИ-аудит за 2 минуты ============ */
  $$('[data-tool="audit"]').forEach(root => {
    const form = $('form', root);
    const ring = $('.ring .fg', root), C = 2 * Math.PI * 62;
    if (ring) { ring.style.strokeDasharray = C; ring.style.strokeDashoffset = C; }
    const LEVELS = [
      [0, 'Старт', 'ИИ используют отдельные сотрудники по своей инициативе. Главный риск - данные клиентов в чужих сервисах.', ['Ввести короткую политику: какие сервисы и данные можно', 'Провести вводное обучение руководителей на их задачах', 'Выбрать один процесс для пилота']],
      [40, 'Пилоты', 'Есть попытки и энтузиасты, но эффект не измерен и не масштабируется.', ['Замерить базовую линию времени до пилота', 'Назначить владельца ИИ-направления', 'Обучить команду отдела, где идёт пилот']],
      [70, 'Система', 'ИИ встроен в процессы, эффект измеряется. Следующий шаг - агенты и автоматизация связок между системами.', ['Автоматизировать связки CRM, таблиц и отчётов', 'Посчитать экономию ФОТ по отделам', 'Регламенты и обучение новых сотрудников']]
    ];
    const update = () => {
      const qs = $$('fieldset', form);
      const answered = qs.filter(f => $('input:checked', f));
      const score = answered.reduce((s, f) => s + +$('input:checked', f).value, 0);
      const maxScore = qs.length * 3;
      const pct = Math.round(score / maxScore * 100);
      const lvl = [...LEVELS].reverse().find(l => pct >= l[0]);
      $('[data-o="answered"]', root).textContent = `${answered.length} из ${qs.length}`;
      $('.ring text', root).textContent = answered.length ? pct : '?';
      if (ring) ring.style.strokeDashoffset = C * (1 - (answered.length ? pct : 0) / 100);
      $('[data-o="level"]', root).textContent = answered.length === qs.length ? lvl[1] : 'Ответьте на все вопросы';
      $('[data-o="desc"]', root).textContent = answered.length === qs.length ? lvl[2] : 'Результат и рекомендации появятся здесь. Вопросов шесть, это займёт две минуты.';
      $('[data-o="recs"]', root).innerHTML = (answered.length === qs.length ? lvl[3] : []).map(r => `<li>${r}</li>`).join('');
      window.__capture.audit = { title: 'ИИ-аудит компании', lines: [`Индекс ИИ-зрелости: ${pct} из 100 (${lvl[1]})`, ...qs.map(f => `${$('legend', f).textContent}: ${$('input:checked', f)?.nextElementSibling.textContent || 'нет ответа'}`)] };
    };
    form.addEventListener('change', update);
    update();
  });

  /* Активный пункт навигации по инструментам */
  const nav = $$('.tool-nav a');
  if (nav.length) {
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) nav.forEach(a => a.classList.toggle('is-active', a.hash === '#' + e.target.id));
    }), { rootMargin: '-40% 0px -55% 0px' });
    nav.forEach(a => { const s = document.getElementById(a.hash.slice(1)); s && io.observe(s); });
  }
})();
