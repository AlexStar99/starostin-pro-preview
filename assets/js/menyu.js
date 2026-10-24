/* Страница «Решения»: выбор пунктов меню, корзина-пакет и передача списка в форму захвата.
   Без JS чекбоксы просто видны и отмечаются, корзина не показывается.
   Выбор хранится в localStorage (в try/catch: в приватном режиме хранилище может быть недоступно).
   Сводку для формы кладём в window.__capture.paket при каждом изменении, поэтому порядок
   обработчиков клика с capture.js не важен. */
(() => {
  const boxes = [...document.querySelectorAll('.mn-item input[type="checkbox"][name="paket"]')];
  const cart = document.querySelector('[data-mn-cart]');
  if (!boxes.length || !cart) return;

  const KEY = 'starostin:menyu-paket';
  const root = document.documentElement;
  const nEl = cart.querySelector('[data-mn-n]');
  const listEl = cart.querySelector('[data-mn-list]');
  const clearBtn = cart.querySelector('[data-mn-clear]');
  const counters = [...document.querySelectorAll('[data-dir-count]')];

  const load = () => {
    try {
      const v = JSON.parse(localStorage.getItem(KEY) || '[]');
      return Array.isArray(v) ? v.filter(x => typeof x === 'string') : [];
    } catch (_) { return []; }
  };
  const save = ids => {
    try { ids.length ? localStorage.setItem(KEY, JSON.stringify(ids)) : localStorage.removeItem(KEY); } catch (_) { /* хранилище недоступно: выбор живёт до перезагрузки */ }
  };

  // Высота панели нужна CSS, чтобы зарезервировать место под ней в конце страницы.
  const sizeCart = () => { if (!cart.hidden) root.style.setProperty('--mn-cart-h', cart.offsetHeight + 'px'); };
  if ('ResizeObserver' in window) new ResizeObserver(sizeCart).observe(cart);
  else addEventListener('resize', sizeCart);

  const render = () => {
    const on = boxes.filter(b => b.checked);
    boxes.forEach(b => b.closest('.mn-item')?.classList.toggle('is-on', b.checked));

    counters.forEach(el => {
      const inSec = boxes.filter(b => el.closest('section')?.contains(b));
      const c = inSec.filter(b => b.checked).length;
      el.textContent = `Отмечено: ${c} из ${inSec.length}`;
      el.classList.toggle('is-on', c > 0);
      el.hidden = false;
    });

    nEl.textContent = String(on.length);
    listEl.textContent = on.map(b => b.dataset.name).join(' · ');

    window.__capture = window.__capture || {};
    window.__capture.paket = {
      title: 'Выбранные решения', calc: false,
      lines: on.map(b => `${b.dataset.dir}: ${b.dataset.name}`)
    };

    const show = on.length > 0;
    cart.hidden = !show;
    root.classList.toggle('mn-has-cart', show);
    sizeCart();
  };

  const apply = ids => { boxes.forEach(b => { b.checked = ids.includes(b.value); }); render(); };
  const ids = () => boxes.filter(b => b.checked).map(b => b.value);

  boxes.forEach(b => b.addEventListener('change', () => { save(ids()); render(); }));

  clearBtn?.addEventListener('click', () => {
    boxes.forEach(b => { b.checked = false; });
    save([]); render();
    // панель скрылась вместе с кнопкой: возвращаем фокус к первому пункту меню, без прокрутки
    boxes[0].focus({ preventScroll: true });
  });

  // Выбор из другой вкладки
  addEventListener('storage', e => { if (e.key === KEY) apply(load()); });
  // Возврат по «Назад» из кэша страницы: браузер мог восстановить состояние чекбоксов
  addEventListener('pageshow', e => { if (e.persisted) apply(load()); });

  apply(load());
})();
