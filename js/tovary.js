// NAFI: карточки вещей, фильтр по возрасту, заказ в WhatsApp. Вещи берутся из data/tovary.json (js/dannye.js).
import { zagruzit, rub, cenaSeychas, cenaText } from './dannye.js';

const WA = '79280080809';
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

export function waLink(t) {
  const c = t && cenaSeychas(t);
  const msg = t
    ? `Здравствуйте! Хочу заказать: ${t.name}, ${t.vozrast}${c ? ', ' + rub(c) : ''}. Какие размеры есть?`
    : 'Здравствуйте! Хочу подобрать одежду в NAFI.';
  return `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;
}

function veshchej(n) {
  const d = n % 10, s = n % 100;
  if (d === 1 && s !== 11) return `${n} вещь`;
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return `${n} вещи`;
  return `${n} вещей`;
}

const WA_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.2-.2-.5-.3Z"/></svg>';

function cenaHtml(t) {
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
    ${t.prodano ? `<div class="tovar-foto">${foto}` : `<a class="tovar-foto" href="${waLink(t)}" target="_blank" rel="noopener">${foto}`}
      ${metki ? `<div class="metki">${metki}</div>` : ''}
    ${t.prodano ? '</div>' : '</a>'}
    <div class="tovar-tekst">
      <h3>${t.name}</h3>
      <p class="tovar-vozrast">${t.vozrast}</p>
      <p class="tovar-cena">${cenaHtml(t)}</p>
    </div>
    ${t.prodano ? '' : `<a class="tovar-wa" href="${waLink(t)}" target="_blank" rel="noopener" aria-label="Заказать в WhatsApp: ${t.name}">${WA_ICON}</a>`}
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
  return { arka: d.arka.filter(est).map(tovar), vitrina: d.vitrina.filter(est).map(tovar) };
});

const ryad = document.querySelector('[data-vozrasty]');
ryad.innerHTML = VOZRASTY.map((v) => `<button type="button" data-vozrast="${v.id}" aria-pressed="${v.id === 'all'}">${v.t}</button>`).join('');
ryad.addEventListener('click', (e) => {
  const b = e.target.closest('[data-vozrast]');
  if (b && b.getAttribute('aria-pressed') !== 'true') vybratVozrast(b.dataset.vozrast);
});
document.querySelectorAll('[data-wa]').forEach((a) => { a.href = waLink(); });
