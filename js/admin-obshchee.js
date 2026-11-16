// Страница Миланы: общее для всего магазина. Акция (полоса вверху сайта) и список категорий.
// Правки лежат в obshchee (js/admin.js) и сохраняются вместе с правками вещей.
import { kategorii, latinica, chistyj, AKCIYA_DLINA } from './dannye.js?v=a36433cd';

// Как сейчас, с правками
export const akciyaSejchas = (d, o) => o.akciya || d.akciya || { vkl: false, tekst: '' };
export const kategoriiSejchas = (d, o) => o.kategorii || kategorii(d);

// el: блок на странице; d: файл; o: правки общего; izmenit(ключ, значение); pererisovat(): список вещей заново
export function narisovatObshchee(el, d, o, izmenit, pererisovat) {
  const a = akciyaSejchas(d, o);
  const kat = kategoriiSejchas(d, o);
  el.innerHTML = `<h2>Акция</h2>
    <p class="adm-podskazka">Полоса вверху сайта. Например: Скидка 20% на всё до 1 декабря</p>
    <button type="button" class="pereklyuchatel" role="switch" aria-checked="${!!a.vkl}" data-akciya-vkl><span aria-hidden="true"></span>Показывать на сайте</button>
    <label class="pole">Текст акции<input type="text" maxlength="${AKCIYA_DLINA}" data-akciya-tekst></label>
    <h2>Категории</h2>
    <p class="adm-podskazka">Кнопки на сайте рядом с возрастом. Категорию вещи выберите ниже, в её карточке.</p>
    <ul class="adm-kategorii">${kat.map((k) => `<li data-kat="${k.id}"><input type="text" maxlength="30" aria-label="Название категории"><button type="button" class="knopka-vtor" data-ubrat-kat>Убрать</button></li>`).join('')}</ul>
    <div class="adm-nov-kat"><input type="text" maxlength="30" placeholder="Новая категория" aria-label="Новая категория" data-nov-kat><button type="button" class="knopka" data-dob-kat>Добавить</button></div>`;
  // Тексты Миланы ставятся значением поля, не разметкой
  el.querySelector('[data-akciya-tekst]').value = a.tekst || '';
  el.querySelectorAll('[data-kat]').forEach((li, i) => { li.querySelector('input').value = kat[i].name; });

  const akciya = (izm) => izmenit('akciya', { ...akciyaSejchas(d, o), ...izm });
  el.querySelector('[data-akciya-vkl]').onclick = (e) => {
    const v = e.currentTarget.getAttribute('aria-checked') !== 'true';
    e.currentTarget.setAttribute('aria-checked', v);
    akciya({ vkl: v });
  };
  el.querySelector('[data-akciya-tekst]').oninput = (e) => akciya({ tekst: e.target.value });

  const spisok = (nov) => { izmenit('kategorii', nov); narisovatObshchee(el, d, o, izmenit, pererisovat); pererisovat(); };
  el.querySelectorAll('[data-kat] input').forEach((inp) => {
    const id = inp.closest('[data-kat]').dataset.kat;
    inp.oninput = () => izmenit('kategorii', kategoriiSejchas(d, o).map((k) => (k.id === id ? { ...k, name: chistyj(inp.value) } : k)));
    inp.onchange = pererisovat; // названия в выборе категории у вещей
  });
  el.querySelectorAll('[data-ubrat-kat]').forEach((b) => {
    b.onclick = () => spisok(kategoriiSejchas(d, o).filter((k) => k.id !== b.closest('[data-kat]').dataset.kat));
  });
  el.querySelector('[data-dob-kat]').onclick = () => {
    const inp = el.querySelector('[data-nov-kat]');
    const name = chistyj(inp.value);
    if (!name) return inp.focus();
    const sejchas = kategoriiSejchas(d, o);
    spisok([...sejchas, { id: latinica(name, sejchas.map((k) => k.id)), name }]);
  };
}
