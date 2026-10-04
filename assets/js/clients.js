/* Блок «Мне доверяют».
   1. Для каждого .client пробует загрузить картинку из data-logo.
      Успех: типографская вордмарка .wm заменяется на <img class="client-logo">.
      Ошибка (файла пока нет): остаётся вордмарка, ничего не ломается.
   2. На страницах без модификатора .clients--grid дублирует элементы
      для бесшовной бегущей ленты на мобильном (CSS включает её только
      до 760px, при prefers-reduced-motion лента не собирается).
   Файлы логотипов: assets/img/clients/README.md */
(function () {
  'use strict';
  var lists = document.querySelectorAll('[data-clients]');
  if (!lists.length) return;

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function swap(li, src, probe) {
    var wm = li.querySelector('.wm');
    if (!wm) return;
    var img = document.createElement('img');
    img.className = 'client-logo';
    img.src = src;
    img.alt = wm.textContent.trim();
    img.decoding = 'async';
    if (probe.naturalWidth && probe.naturalHeight) {
      img.width = probe.naturalWidth;
      img.height = probe.naturalHeight;
    }
    wm.replaceWith(img);
    li.classList.add('has-logo');
  }

  Array.prototype.forEach.call(lists, function (list) {
    var strip = list.parentElement;
    var items = Array.prototype.slice.call(list.querySelectorAll('.client'));
    var marquee = !reduce && strip && !list.closest('.clients--grid');

    if (marquee) {
      items.forEach(function (li) {
        var clone = li.cloneNode(true);
        clone.classList.add('is-clone');
        clone.setAttribute('aria-hidden', 'true');
        clone.removeAttribute('data-logo');
        li._clone = clone;
        list.appendChild(clone);
      });
      strip.classList.add('is-marquee');
    }

    items.forEach(function (li) {
      var src = li.getAttribute('data-logo');
      if (!src) return;
      var probe = new Image();
      probe.onload = function () {
        swap(li, src, probe);
        if (li._clone) swap(li._clone, src, probe);
      };
      probe.src = src;
    });
  });
})();
