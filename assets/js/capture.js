/* Форма захвата: открывается кнопками [data-capture="<id калькулятора>"].
   Данные уходят на /api/leads (сервер в РФ). Согласие на ПДн - отдельный обязательный чекбокс,
   согласие на рассылку - отдельный необязательный. Без сервера форма работает в демо-режиме. */
(() => {
  const dlg = document.getElementById('capture');
  if (!dlg) return;
  const $ = (s, c = dlg) => c.querySelector(s);
  const form = $('form');
  const sum = $('[data-cap-sum]');
  const title = $('[data-cap-title]');
  const status = $('[data-cap-status]');
  const submit = $('button[type="submit"]');
  const submitText = submit.textContent;
  let source = '';

  const open = (src, heading) => {
    source = src;
    const data = (window.__capture || {})[src];
    title.textContent = heading || 'Получить расчёт';
    sum.hidden = !data;
    // оговорка про расчёт только у калькуляторов; у пакета решений и консультаций её нет
    if (data) sum.innerHTML = `<b>${data.title}</b>` + data.lines.map(l => `<span>${l}</span>`).join('') + (data.calc === false ? '' : '<span>Расчёт ознакомительный, по вашим вводным: не прогноз и не обещание результата.</span>');
    status.hidden = true; form.hidden = false;
    if (typeof dlg.showModal === 'function') dlg.showModal(); else dlg.setAttribute('open', '');
    window.__site?.lenis?.stop();
    setTimeout(() => $('#cap-name')?.focus(), 60);
  };
  const close = () => { dlg.close ? dlg.close() : dlg.removeAttribute('open'); };
  dlg.addEventListener('close', () => window.__site?.lenis?.start());
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-capture]');
    if (b) { e.preventDefault(); open(b.dataset.capture, b.dataset.captureTitle); }
  });
  $('[data-cap-close]').addEventListener('click', close);
  dlg.addEventListener('click', e => { if (e.target === dlg) close(); });

  const consent = $('#cap-pd');
  const sync = () => { submit.disabled = !consent.checked; };
  consent.addEventListener('change', sync); sync();

  const phoneRe = /^(\+7|8)?[\s-]?\(?9\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  const tgRe = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/;
  const err = (id, msg) => { const e = $(`[data-err="${id}"]`); if (e) e.textContent = msg || ''; };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    let ok = true;
    err('name'); err('contact');
    if (!fd.name || fd.name.trim().length < 2) { err('name', 'Как к вам обращаться?'); ok = false; }
    const contact = (fd.contact || '').trim();
    if (!phoneRe.test(contact) && !tgRe.test(contact)) { err('contact', 'Российский мобильный (+7 9XX...) или ник Telegram в формате @username'); ok = false; }
    if (!consent.checked) ok = false;
    if (!ok) return;
    submit.disabled = true; submit.textContent = 'Отправляю...';
    const body = {
      name: fd.name.trim(), role: fd.role || '', company: (fd.company || '').trim(), companySize: fd.size || '',
      contact, source, payload: (window.__capture || {})[source] || null,
      consentPd: true, consentAds: !!fd.ads
    };
    let sent = false;
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      sent = r.ok;
    } catch (_) { sent = false; }
    form.hidden = true; status.hidden = false;
    status.className = 'status is-ok';
    status.innerHTML = sent
      ? '<span>Готово. Александр ответит лично в удобный вам канал, обычно в течение рабочего дня.</span>'
      : '<span>Демо-режим: сервер заявок не подключён, данные никуда не отправлены. На рабочем сайте заявка сразу уйдёт Александру. Пока можно <a href="https://t.me/starostinpro">написать в Telegram</a>.</span>';
    submit.textContent = submitText; sync();
  });
})();
