/* Анкета заявки: пять вопросов + контакт. Уходит на /api/leads (сервер в РФ) с source=anketa,
   ответы лежат в payload. Вход в работу только через платную консультацию, анкету Александр смотрит вручную.
   Без сервера форма честно показывает демо-режим. */
(() => {
  const form = document.getElementById('zv-form');
  if (!form) return;
  const status = document.getElementById('zv-status');
  const submit = document.getElementById('zv-submit');
  const consent = document.getElementById('zv-pd');
  const err = (id, msg) => { const e = form.querySelector(`[data-err="${id}"]`); if (e) e.textContent = msg || ''; };
  const sync = () => { submit.disabled = !consent.checked; };
  consent.addEventListener('change', sync); sync();

  const phoneRe = /^(\+7|8)?[\s-]?\(?9\d{2}\)?[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/;
  const tgRe = /^@[A-Za-z][A-Za-z0-9_]{4,31}$/;
  const Q = { role: 'Кто в компании', size: 'Сотрудников', task: 'Задача', when: 'Когда начать', budget: 'Бюджет' };

  form.addEventListener('submit', async e => {
    e.preventDefault();
    const fd = Object.fromEntries(new FormData(form));
    let ok = true, first = null;
    ['name', 'contact', 'task', 'form'].forEach(k => err(k));
    for (const k of ['role', 'size', 'when', 'budget']) if (!fd[k]) { ok = false; first = first || form.querySelector(`[name="${k}"]`); }
    if (!fd.task || fd.task.trim().length < 10) { err('task', 'Опишите задачу хотя бы одной фразой.'); ok = false; first = first || form.task; }
    if (!fd.name || fd.name.trim().length < 2) { err('name', 'Как к вам обращаться?'); ok = false; first = first || form.name; }
    const contact = (fd.contact || '').trim();
    if (!phoneRe.test(contact) && !tgRe.test(contact)) { err('contact', 'Российский мобильный (+7 9XX...) или ник Telegram в формате @username'); ok = false; first = first || form.contact; }
    if (!ok) { err('form', 'Ответьте, пожалуйста, на все пять вопросов и оставьте контакт.'); first?.focus(); return; }
    if (!consent.checked) return;

    submit.disabled = true; const label = submit.textContent; submit.textContent = 'Отправляю...';
    const body = {
      name: fd.name.trim(), role: fd.role, company: (fd.company || '').trim(), companySize: fd.size,
      contact, source: 'anketa',
      payload: { title: 'Анкета', calc: false, lines: ['role', 'size', 'task', 'when', 'budget'].map(k => `${Q[k]}: ${String(fd[k]).trim()}`) },
      consentPd: true, consentAds: !!fd.ads
    };
    let sent = false;
    try {
      const r = await fetch('/api/leads', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), credentials: 'same-origin' });
      sent = r.ok;
    } catch (_) { sent = false; }
    form.hidden = true; status.hidden = false; status.className = 'zv-status status is-ok';
    status.innerHTML = sent
      ? '<b>Анкета у меня.</b><span>Посмотрю лично и отвечу в течение рабочего дня в Telegram или по телефону.</span>'
      : '<b>Демо-режим.</b><span>Сервер заявок пока не подключён, данные никуда не отправлены. На рабочем сайте анкета сразу придёт Александру. Пока можно <a href="https://t.me/starostinpro">написать в Telegram</a>.</span>';
    const lenis = window.__site?.lenis;
    if (lenis) lenis.scrollTo(status, { offset: -140, immediate: matchMedia('(prefers-reduced-motion: reduce)').matches });
    else status.scrollIntoView({ block: 'center' });
    submit.textContent = label; sync();
  });
})();
