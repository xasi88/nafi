// NAFI: карточки вещей, фильтр по возрасту, выбор размера, кнопки «В корзину» (js/korzina.js). Вещи берутся из data/tovary.json (js/dannye.js).
import { zagruzit, rub, cenaSeychas, cenaText, waUrl, veshchej, razmery } from './dannye.js';

let TOVARY = [];

const VOZRASTY = [
  { id: 'all', t: 'Все', ot: 0, do: 999 },
  { id: 'm', t: '0-12 мес', ot: 0, do: 12 },
  { id: 's', t: '1-3 года', ot: 12, do: 36 },
  { id: 'd', t: '4-7 лет', ot: 37, do: 95 },
  { id: 'v', t: '8-14 лет', ot: 96, do: 168 },
];

export const tovar = (id) => TOVARY.find((t) => t.id === id);
export { cenaText };

// Общая ссылка WhatsApp: шапка, первый экран, подвал. Заказ вещей идёт через корзину.
export const waLink = () => waUrl('Здравствуйте! Хочу подобрать одежду в NAFI.');

// Сумка: положить в корзину. Галочка: вещь уже в корзине. Кнопка показывает одно из двух.
const SUMKA = '<svg class="ikon-sumka" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1.2 12H6.2z"/><path d="M9 10V7a3 3 0 0 1 6 0v3"/></svg>';
const GALOCHKA = '<svg class="ikon-galochka" viewBox="0 0 24 24" aria-hidden="true"><path pathLength="1" d="M5 12.5l4.5 4.5L19 7.5"/></svg>';

export function cenaHtml(t) {
  if (t.prodano) return 'Продано';
  const c = cenaSeychas(t);
  if (!c) return 'Цена в WhatsApp';
  return t.skidka ? `${rub(c)} <s>${rub(t.cena)}</s>` : rub(c);
}

function kartochka(t) {
  const metki = [t.hit && !t.prodano && '<span class="metka">Хит продаж</span>',
    t.skidka && !t.prodano && `<span class="metka metka-skidka">-${t.skidka}%</span>`,
    t.prodano && '<span class="metka metka-prodano">Продано</span>'].filter(Boolean).join('');
  const foto = `<img src="${t.foto}" alt="${t.name}, ${t.vozrast}" loading="lazy" width="640" height="800">`;
  return `<article class="tovar${t.prodano ? ' prodano' : ''}" data-id="${t.id}">
    ${t.prodano ? `<div class="tovar-foto">${foto}` : `<button class="tovar-foto" type="button" data-v-korzinu="${t.id}" aria-label="В корзину: ${t.name}">${foto}`}
      ${metki ? `<div class="metki">${metki}</div>` : ''}
    ${t.prodano ? '</div>' : '</button>'}
    <div class="tovar-tekst">
      <h3>${t.name}</h3>
      <p class="tovar-vozrast">${t.vozrast}</p>
      ${!t.prodano && razmery(t).length ? `<div class="tovar-razmery" role="group" aria-label="Размер, рост в см">${razmery(t).map((r) => `<button type="button" aria-pressed="false" data-razmer="${r}">${r}</button>`).join('')}</div>` : ''}
      <p class="tovar-cena">${cenaHtml(t)}</p>
    </div>
    ${t.prodano ? '' : `<button class="tovar-v" type="button" data-v-korzinu="${t.id}" aria-pressed="false" aria-label="В корзину: ${t.name}">${SUMKA}${GALOCHKA}</button>`}
  </article>`;
}

// Смена возраста: лишние карточки гаснут, оставшиеся плывут на новые места (FLIP), новые встают
function vybratVozrast(id) {
  const v = VOZRASTY.find((x) => x.id === id) || VOZRASTY[0];
  const podhodit = (t) => t.ot <= v.do && t.do >= v.ot;
  const karty = [...document.querySelectorAll('.tovar')];
  const tiho = matchMedia('(prefers-reduced-motion: reduce)').matches;
  document.querySelectorAll('[data-vozrast]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.vozrast === v.id));
  document.querySelector('[data-schet]').textContent = veshchej(TOVARY.filter((t) => podhodit(t) && !t.prodano).length);

  const do_ = new Map(karty.filter((k) => !k.hidden).map((k) => [k, k.getBoundingClientRect()]));
  const uhodyat = karty.filter((k) => !k.hidden && !podhodit(tovar(k.dataset.id)));
  uhodyat.forEach((k) => k.classList.add('uhod'));
  setTimeout(() => {
    karty.forEach((k) => {
      const nado = podhodit(tovar(k.dataset.id));
      k.classList.remove('uhod');
      if (!nado) { k.hidden = true; return; }
      if (k.hidden) { k.hidden = false; k.classList.remove('vidno'); k.style.setProperty('--i', 0); }
    });
    if (tiho) return karty.forEach((k) => k.classList.add('vidno'));
    let n = 0;
    karty.filter((k) => !k.hidden).forEach((k) => {
      const a = do_.get(k);
      if (a && !uhodyat.includes(k)) {
        const b = k.getBoundingClientRect();
        k.animate([{ translate: `${a.left - b.left}px ${a.top - b.top}px` }, { translate: '0 0' }], { duration: 750, easing: 'cubic-bezier(.2,.7,.2,1)' });
      }
      // Новая или ещё не показанная карточка встаёт из глубины
      if (!k.classList.contains('vidno')) {
        k.style.setProperty('--i', n++ % 4);
        void k.offsetWidth;
        k.classList.add('vidno', 'pervyj');
        setTimeout(() => k.classList.remove('pervyj'), 1400);
      }
    });
  }, uhodyat.length && !tiho ? 220 : 0);
}

// Вещи загружены: карточки нарисованы. Проданные стоят в конце.
export const gotovo = zagruzit().then((d) => {
  TOVARY = [...d.tovary.filter((t) => !t.prodano), ...d.tovary.filter((t) => t.prodano)];
  const setka = document.querySelector('[data-setka]');
  setka.innerHTML = TOVARY.map(kartochka).join('');
  setka.querySelectorAll('.tovar').forEach((k, i) => k.style.setProperty('--i', i % 4));
  document.querySelector('[data-schet]').textContent = veshchej(TOVARY.filter((t) => !t.prodano).length);
  const est = (id) => tovar(id) && !tovar(id).prodano;
  return { tovary: TOVARY, arka: d.arka.filter(est).map(tovar), vitrina: d.vitrina.filter(est).map(tovar) };
});

const ryad = document.querySelector('[data-vozrasty]');
ryad.innerHTML = VOZRASTY.map((v) => `<button type="button" data-vozrast="${v.id}" aria-pressed="${v.id === 'all'}">${v.t}</button>`).join('');
ryad.addEventListener('click', (e) => {
  const b = e.target.closest('[data-vozrast]');
  if (b && b.getAttribute('aria-pressed') !== 'true') vybratVozrast(b.dataset.vozrast);
});
document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(); });

// Размер в карточке: один на выбор, второе нажатие снимает. Выбранный размер кладёт в корзину js/korzina.js.
document.querySelector('[data-setka]').addEventListener('click', (e) => {
  const b = e.target.closest('[data-razmer]');
  if (!b) return;
  const vybran = b.getAttribute('aria-pressed') !== 'true';
  b.closest('.tovar').querySelectorAll('[data-razmer]').forEach((x) => x.setAttribute('aria-pressed', x === b && vybran));
});
