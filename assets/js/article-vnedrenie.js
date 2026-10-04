/* Статья «Как внедрить ИИ в компанию»: тест готовности, матрица процессов, чек-лист политики.
   Весь смысловой текст есть в HTML; скрипт только считает и подсказывает. Данные никуда не уходят. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
    del(k) { try { localStorage.removeItem(k); } catch (e) {} }
  };
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const NB = ' ';
  // ширина шкалы ставится после отрисовки, чтобы сработал transition
  const fill = (el, pct) => { el.style.setProperty('--w', '0%'); requestAnimationFrame(() => requestAnimationFrame(() => el.style.setProperty('--w', pct + '%'))); };

  /* ================= 1. Тест ИИ-готовности ================= */
  const quiz = $('[data-readiness]');
  if (quiz) {
    const qs = $$('[data-q]', quiz);
    const total = qs.length, max = total * 2;
    const answers = new Array(total).fill(null);
    const out = $('[data-r-result]', quiz);
    const count = $('[data-r-count]', quiz);
    const initial = out.innerHTML;

    const REC = [
      'Проведите анонимный опрос: кто и для каких задач уже пользуется нейросетями. Это готовая карта спроса для пилота.',
      'Подключите один разрешённый инструмент на компанию, например GigaChat или YandexGPT для задач с данными.',
      'Утвердите политику работы с ИИ на 1-2 страницы. Начните с чек-листа ниже в этой статье.',
      'Замерьте базовую линию: время на 3-5 типовых задач до ИИ, хватит 10-20 замеров на задачу.',
      'Дайте пилотной группе не меньше 5 часов практики на задачах их отдела, а не обзорную лекцию.',
      'Назначьте владельца ИИ-проекта и выделите ему 3-5 часов в неделю на эту работу.',
      'Запустите пилот на одном процессе с журналом задач и сравнением «до и после».'
    ];
    const LEVELS = [
      { max: 4, name: 'Хаотичный', text: 'Нейросетями пользуются отдельные люди на свой страх и риск. Правил, замеров и ответственного пока нет, а данные клиентов могут уходить в публичные сервисы.',
        extra: ['Составьте карту повторяющихся задач по отделам.', 'Выберите один процесс для пилота по матрице ниже.'],
        cta: { href: '../../komandam/#diagnostika', label: 'Стратегическая сессия: план на квартал' } },
      { max: 9, name: 'Пилотный', text: 'Доступы и энтузиасты уже есть, но эффект никто не мерил, и в процессы ИИ не встроен. Здесь компании застревают чаще всего.',
        extra: ['Выберите один процесс для пилота по матрице ниже.', 'Запустите пилот на одном процессе с журналом задач и сравнением «до и после».'],
        cta: { href: '../../komandam/', label: 'Программа для компании: пилот с замером' } },
      { max: max, name: 'Системный', text: 'Политика, обучение и замеры уже работают. Следующая задача: переносить доказанные сценарии в другие отделы и не отставать от новинок.',
        extra: ['Перенесите сценарий, который доказал эффект, во второй отдел.', 'Раз в месяц разбирайте с командой новинки ИИ под ваши задачи.', 'Пересматривайте политику работы с ИИ раз в квартал.'],
        cta: { href: '../../obuchenie/', label: 'Обучение команды и разбор новинок' } }
    ];

    const render = () => {
      const done = answers.filter(a => a !== null).length;
      count.textContent = `Отвечено ${done} из ${total}`;
      if (done < total) {
        out.innerHTML = done === 0 ? initial
          : `<p>Осталось ответить на ${total - done} ${total - done === 1 ? 'вопрос' : total - done < 5 ? 'вопроса' : 'вопросов'}. Результат появится здесь.</p>`;
        return;
      }
      const score = answers.reduce((s, a) => s + a, 0);
      const li = LEVELS.findIndex(l => score <= l.max);
      const lvl = LEVELS[li];
      // рекомендации: сначала самые слабые ответы, затем общие для уровня
      const weak = answers.map((a, i) => ({ a, i })).filter(x => x.a < 2).sort((x, y) => x.a - y.a || x.i - y.i).map(x => REC[x.i]);
      const recs = [...new Set([...weak, ...lvl.extra])].slice(0, 3);
      const pct = Math.round(score / max * 100);
      out.innerHTML =
        `<p class="r-kicker">Уровень компании</p>` +
        `<p class="r-level">${lvl.name}<small>${score} из ${max} баллов</small></p>` +
        `<div class="meter" role="img" aria-label="${score} из ${max} баллов"><i></i></div>` +
        `<div class="r-scale">${LEVELS.map((l, k) => `<span${k === li ? ' aria-current="true"' : ''}>${l.name}</span>`).join('')}</div>` +
        `<p>${lvl.text}</p>` +
        `<p><b>Что сделать первым:</b></p>` +
        `<ol>${recs.map(r => `<li>${esc(r)}</li>`).join('')}</ol>` +
        `<a class="btn btn-primary btn-sm" href="${lvl.cta.href}">${lvl.cta.label}</a>`;
      fill($('.meter i', out), pct);
    };

    qs.forEach((q, i) => $$('.chip', q).forEach(ch => ch.addEventListener('click', () => {
      $$('.chip', q).forEach(c => c.setAttribute('aria-pressed', String(c === ch)));
      answers[i] = +ch.dataset.v;
      render();
    })));
    $('[data-r-reset]', quiz)?.addEventListener('click', () => {
      answers.fill(null);
      $$('.chip', quiz).forEach(c => c.setAttribute('aria-pressed', 'false'));
      render();
    });
  }

  /* ================= 2. Матрица выбора первого процесса ================= */
  const mx = $('[data-matrix]');
  if (mx) {
    const list = $('[data-mx-list]', mx);
    const addBtn = $('[data-mx-add]', mx);
    const out = $('[data-mx-result]', mx);
    const MIN = 2, MAX = 4;
    const SL = [
      { k: 'h', label: 'Часов в неделю на команду', min: 1, max: 40, fmt: v => v + NB + 'ч' },
      { k: 'rep', label: 'Повторяемость', min: 1, max: 5, fmt: v => ['раз в месяц', 'раз в неделю', 'пару раз в неделю', 'каждый день', 'много раз в день'][v - 1] },
      { k: 'risk', label: 'Риск ошибки', min: 1, max: 5, fmt: v => ['почти нет', 'низкий', 'средний', 'высокий', 'критичный'][v - 1] },
      { k: 'sens', label: 'Чувствительность данных', min: 1, max: 5, fmt: v => ['публичные', 'внутренние', 'обезличенные', 'персональные', 'ПДн и тайна'][v - 1] }
    ];
    let uid = 0;
    let rows = [
      { id: ++uid, name: 'Ответы на типовые письма клиентов', ex: true, h: 10, rep: 5, risk: 2, sens: 3 },
      { id: ++uid, name: 'Еженедельный отчёт для руководителя', ex: true, h: 4, rep: 4, risk: 2, sens: 2 },
      { id: ++uid, name: 'Подготовка договоров', ex: true, h: 6, rep: 3, risk: 5, sens: 5 }
    ];
    // балл 0-100: часы до 40, повторяемость до 30, низкий риск до 15, низкая чувствительность до 15
    const score = r => Math.round(Math.min(r.h, 20) / 20 * 40 + (r.rep - 1) / 4 * 30 + (5 - r.risk) / 4 * 15 + (5 - r.sens) / 4 * 15);
    const notes = r => {
      const n = [];
      if (r.sens >= 4) n.push('чувствительные данные: только российские модели, свой сервер или обезличивание');
      if (r.risk >= 4) n.push('высокая цена ошибки: обязательная проверка человеком');
      if (r.h < 3) n.push('мало часов: эффект будет трудно заметить');
      if (r.rep <= 2) n.push('редкая задача: за две недели не набрать замеров');
      return n;
    };
    const paint = inp => inp.style.setProperty('--p', ((inp.value - inp.min) / (inp.max - inp.min) * 100) + '%');

    const rowHTML = r => `
      <div class="mx-row" data-id="${r.id}">
        <div class="mx-head">
          <label class="sr-only" for="mx-name-${r.id}">Название процесса</label>
          <input class="input" id="mx-name-${r.id}" type="text" maxlength="70" placeholder="Например, протоколы встреч" value="${esc(r.name)}" data-k="name">
          ${r.ex ? '<span class="mx-tag">пример</span>' : ''}
          <button class="mx-del" type="button" data-del aria-label="Удалить процесс">×</button>
        </div>
        <div class="mx-grid">
          ${SL.map(s => `
          <div class="field">
            <div class="field-top"><label for="mx-${s.k}-${r.id}">${s.label}</label><output for="mx-${s.k}-${r.id}">${s.fmt(r[s.k])}</output></div>
            <input id="mx-${s.k}-${r.id}" type="range" min="${s.min}" max="${s.max}" step="1" value="${r[s.k]}" data-k="${s.k}">
          </div>`).join('')}
        </div>
      </div>`;

    const renderRows = () => {
      list.innerHTML = rows.map(rowHTML).join('');
      $$('input[type="range"]', list).forEach(paint);
      addBtn.hidden = false;
      addBtn.disabled = rows.length >= MAX;
      addBtn.textContent = rows.length >= MAX ? 'Максимум 4 процесса' : '+ Добавить процесс';
      $$('[data-del]', list).forEach(b => { b.hidden = rows.length <= MIN; });
      renderResult();
    };

    const renderResult = () => {
      const ranked = rows.map(r => ({ r, s: score(r) })).sort((a, b) => b.s - a.s);
      const best = ranked[0];
      $$('.mx-row', list).forEach(el => {
        const on = +el.dataset.id === best.r.id;
        el.classList.toggle('is-best', on);
        const head = $('.mx-head', el), badge = $('.mx-best', el);
        if (on && !badge) { const b = document.createElement('span'); b.className = 'mx-best'; b.textContent = 'лучший'; $('.mx-del', head).before(b); }
        if (!on && badge) badge.remove();
      });
      const verdict = best.s >= 60
        ? `Начните с процесса «${esc(best.r.name || 'Без названия')}»: у него лучший баланс часов, частоты и риска.`
        : best.s >= 40
          ? `Лучший вариант «${esc(best.r.name || 'Без названия')}», но запас небольшой. Проверьте, нет ли более частой рутины.`
          : 'Ни один процесс пока не подходит для первого пилота. Поищите более частую рутину с внутренними данными.';
      out.innerHTML =
        `<p class="r-kicker">Рейтинг процессов</p>` +
        `<ol class="mx-rank">${ranked.map((x, i) => {
          const n = notes(x.r);
          return `<li class="${i === 0 ? 'top' : ''}"><span class="pos">${i + 1}</span><span class="nm">${esc(x.r.name || 'Без названия')}</span><span class="sc">${x.s}/100</span>` +
            `<div class="meter" aria-hidden="true"><i style="--w:${x.s}%"></i></div>` +
            (n.length ? `<span class="why">${esc(n.join('; '))}</span>` : '') + `</li>`;
        }).join('')}</ol>` +
        `<p>${verdict}</p>`;
    };

    list.addEventListener('input', e => {
      const t = e.target, rowEl = t.closest('.mx-row'); if (!rowEl) return;
      const r = rows.find(x => x.id === +rowEl.dataset.id); if (!r) return;
      const k = t.dataset.k;
      if (k === 'name') {
        r.name = t.value.trim();
        if (r.ex) { r.ex = false; $('.mx-tag', rowEl)?.remove(); }
      } else if (k) {
        r[k] = +t.value; paint(t);
        const s = SL.find(x => x.k === k), o = $(`output[for="${t.id}"]`, rowEl);
        if (o) o.textContent = s.fmt(r[k]);
      }
      renderResult();
    });
    list.addEventListener('click', e => {
      const b = e.target.closest('[data-del]'); if (!b || rows.length <= MIN) return;
      const id = +b.closest('.mx-row').dataset.id;
      rows = rows.filter(r => r.id !== id);
      renderRows();
    });
    addBtn.addEventListener('click', () => {
      if (rows.length >= MAX) return;
      const r = { id: ++uid, name: '', ex: false, h: 5, rep: 3, risk: 2, sens: 2 };
      rows.push(r);
      renderRows();
      $(`#mx-name-${r.id}`)?.focus({ preventScroll: true });
    });
    renderRows();
  }

  /* ================= 3. Чек-лист политики ИИ ================= */
  const pl = $('[data-policy]');
  if (pl) {
    const boxes = $$('.pl-list input[type="checkbox"]', pl);
    const count = $('[data-pl-count]', pl), meter = $('[data-pl-meter]', pl), out = $('[data-pl-result]', pl);
    const KEY = 'vnedrenie-policy-v1';
    const titles = boxes.map(b => $('b', b.closest('label')).textContent.trim());
    const why = boxes.map(b => $('small', b.closest('label')).textContent.trim());
    try { (JSON.parse(store.get(KEY) || '[]') || []).forEach(i => { if (boxes[i]) boxes[i].checked = true; }); } catch (e) {}

    const render = () => {
      const done = boxes.filter(b => b.checked).length, total = boxes.length;
      count.textContent = `Готово ${done} из ${total}`;
      fill(meter, Math.round(done / total * 100));
      const next = boxes.findIndex(b => !b.checked);
      const coreLeft = boxes.slice(0, 5).filter(b => !b.checked).length;
      let html;
      if (next === -1) {
        html = '<p><b>Минимальная политика готова.</b> Дайте её прочитать команде под подпись и пересматривайте раз в квартал: сервисы и законы меняются быстро.</p>';
      } else {
        html = `<p><b>Закройте первым: ${esc(titles[next])}.</b> ${esc(why[next])}</p>`;
        html += coreLeft
          ? `<p>До минимальной рабочей политики (пункты 1-5) осталось ${coreLeft}. Без них пилот лучше не запускать.</p>`
          : '<p>Ядро политики готово, пилот можно запускать. Оставшиеся пункты закройте до масштабирования.</p>';
      }
      out.innerHTML = html;
      store.set(KEY, JSON.stringify(boxes.map((b, i) => b.checked ? i : -1).filter(i => i >= 0)));
    };
    boxes.forEach(b => b.addEventListener('change', render));
    $('[data-pl-reset]', pl)?.addEventListener('click', () => { boxes.forEach(b => { b.checked = false; }); store.del(KEY); render(); });
    render();
  }
})();
