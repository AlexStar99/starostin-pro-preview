/* Статья «Нейросети для маркетинга»: три интерактива.
   Без JS в HTML уже есть значения по умолчанию и статичные таблицы под каждым демо. */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const dec = n => (Math.round(n * 10) / 10).toLocaleString('ru-RU');
  const rub = n => (Math.round(n / 100) * 100).toLocaleString('ru-RU');
  const plural = (n, f) => { const a = Math.abs(n) % 100, b = a % 10; return a > 10 && a < 20 ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; };
  const pressed = el => el.getAttribute('aria-pressed') === 'true';
  const toggle = el => el.setAttribute('aria-pressed', String(!pressed(el)));
  const WEEKS = 4.33;
  let pickerSaved = null;

  /* ---------- 1. Подборщик задач ---------- */
  const picker = $('[data-picker]');
  if (picker) {
    const chips = $$('.chip[data-task]', picker);
    const rows = $('[data-pk-rows]', picker);
    const out = k => $(`[data-pk="${k}"]`, picker);
    const set = (k, v) => { const el = out(k); if (el) el.textContent = v; };

    const update = () => {
      const on = chips.filter(pressed);
      let before = 0, saved = 0;
      on.forEach(c => { const h = Math.max(0, parseFloat(c.dataset.hours) || 0); before += h; saved += h * (+c.dataset.share / 100); });
      const after = before - saved;
      set('before', dec(before));
      set('after', dec(after));
      set('saved', dec(saved));
      set('month', Math.round(saved * WEEKS).toLocaleString('ru-RU'));
      set('count', on.length);
      set('pct', before ? Math.round(saved / before * 100) : 0);
      const mb = $('[data-pk-meter="before"]', picker), ma = $('[data-pk-meter="after"]', picker);
      mb && mb.style.setProperty('--w', before ? '100%' : '0%');
      ma && ma.style.setProperty('--w', before ? (after / before * 100).toFixed(1) + '%' : '0%');
      pickerSaved = saved;
      const fill = $('[data-from-picker]');
      if (fill) fill.textContent = `Подставить из подборщика (${dec(saved)} ч)`;
    };

    const renderRows = () => {
      const on = chips.filter(pressed);
      rows.textContent = '';
      on.forEach(c => {
        const row = document.createElement('div'); row.className = 'pk-row';
        const name = document.createElement('span'); name.textContent = c.dataset.task;
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.type = 'number'; input.className = 'input'; input.min = '0'; input.max = '60'; input.step = '0.5';
        input.inputMode = 'decimal'; input.value = c.dataset.hours;
        input.setAttribute('aria-label', `Часов в неделю: ${c.dataset.task}`);
        input.addEventListener('input', () => {
          const v = parseFloat(String(input.value).replace(',', '.'));
          c.dataset.hours = Number.isFinite(v) ? String(Math.min(60, Math.max(0, v))) : '0';
          update();
        });
        label.append(input, document.createTextNode('ч/нед'));
        const share = document.createElement('span'); share.className = 'share'; share.textContent = `ИИ берёт ${c.dataset.share}%`;
        row.append(name, label, share);
        rows.append(row);
      });
      rows.hidden = !on.length;
    };

    chips.forEach(c => c.addEventListener('click', () => { toggle(c); renderRows(); update(); }));
    renderRows(); update();
  }

  /* ---------- 2. Конструктор промпта ---------- */
  const pb = $('[data-prompt]');
  if (pb) {
    const pre = $('#prompt-out', pb);
    const val = id => { const el = $('#' + id, pb); return el ? String(el.value).trim() : ''; };
    const rules = $$('.chip[data-rule]', pb);
    const dot = s => s && !/[.!?…]$/.test(s) ? s + '.' : s;
    const build = () => {
      const lines = [
        `Роль: ты - ${val('pb-role')}.`,
        `Задача: ${dot(val('pb-task'))}`,
        `Продукт: ${dot(val('pb-product') || 'опишите свой продукт')}`,
        `Аудитория: ${dot(val('pb-aud'))}`,
        `Тон: ${dot(val('pb-tone'))}`,
        `Формат ответа: ${dot(val('pb-fmt'))}`
      ];
      const on = rules.filter(pressed);
      if (on.length) { lines.push('Ограничения:'); on.forEach(r => lines.push('- ' + r.dataset.rule)); }
      lines.push('Если данных не хватает, сначала задай мне до 3 уточняющих вопросов.');
      pre.textContent = lines.join('\n');
    };
    $$('select, input', pb).forEach(el => el.addEventListener('input', build));
    $$('select', pb).forEach(el => el.addEventListener('change', build));
    rules.forEach(r => r.addEventListener('click', () => { toggle(r); build(); }));
    build();
  }

  /* ---------- 3. Калькулятор окупаемости ---------- */
  const roi = $('[data-roi]');
  if (roi) {
    const inputs = $$('input[type="range"]', roi);
    const get = name => +inputs.find(i => i.name === name).value;
    const out = k => $(`[data-roi-out="${k}"]`, roi);
    const paint = i => i.style.setProperty('--p', ((i.value - i.min) / (i.max - i.min) * 100) + '%');
    const update = () => {
      inputs.forEach(i => {
        paint(i);
        const o = $(`output[for="${i.id}"]`, roi);
        if (o) o.textContent = (+i.value).toLocaleString('ru-RU') + (i.dataset.suffix || '');
      });
      const hours = get('hours'), rate = get('rate'), cost = get('cost');
      const value = hours * WEEKS * rate;
      const days = cost === 0 ? 0 : Math.ceil(cost / (value / 30));
      out('value').textContent = rub(value);
      out('net').textContent = rub(value - cost);
      out('days').textContent = days.toLocaleString('ru-RU');
      out('unit').textContent = plural(days, ['день', 'дня', 'дней']);
      let verdict;
      if (cost === 0) verdict = 'Инструменты бесплатные, так что считать остаётся только время команды на обучение.';
      else if (days <= 7) verdict = 'По этим вводным подписка окупается за первую неделю. Дальше вопрос только в том, куда пойдут свободные часы.';
      else if (days <= 30) verdict = 'По этим вводным подписка окупится в течение месяца. Посмотрите, нельзя ли начать с бесплатных инструментов.';
      else verdict = 'По этим вводным окупаемость дольше месяца. Начните с бесплатных сервисов или найдите задачу, где рутины больше.';
      out('verdict').textContent = verdict;
    };
    inputs.forEach(i => i.addEventListener('input', update));
    const fill = $('[data-from-picker]', roi);
    if (fill) {
      if (!picker) fill.hidden = true;
      fill.addEventListener('click', () => {
        if (pickerSaved == null) return;
        const h = inputs.find(i => i.name === 'hours');
        h.value = String(Math.min(+h.max, Math.max(+h.min, Math.round(pickerSaved))));
        update();
      });
    }
    update();
  }
})();
