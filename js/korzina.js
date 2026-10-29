// NAFI: корзина покупателя. В телефоне лежат только id вещи и размер (localStorage), цены и «Продано» всегда из свежего файла.
// Заказ уходит в WhatsApp магазина одним сообщением (js/dannye.js). Движение: docs/Раскадровка движения.md, «Корзина».
import { gotovo, tovar, cenaHtml } from './tovary.js?v=e9d92d71';
import { sostav, itogo, soobshchenie, waUrl, veshchej, rub, razmery } from './dannye.js?v=e9d92d71';

const KLYUCH = 'nafi-korzina';
const TIHO = matchMedia('(prefers-reduced-motion: reduce)').matches;
const okno = document.querySelector('[data-korzina]');
const $ = (s) => okno.querySelector(s);
let TOVARY = [];
// Запись корзины: «id» или «id|размер». Одна вещь в двух размерах: две записи.
let zapisi = prochitat();
let tajmer;

const kl = (id, r) => (r ? `${id}|${r}` : id);
const razobrat = (k) => { const [id, r] = k.split('|'); return { id, r: r ? Number(r) : null }; };

function prochitat() {
  try {
    const v = JSON.parse(localStorage.getItem(KLYUCH));
    return Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === 'string'))] : [];
  } catch { return []; }
}
function zapisat() {
  try { localStorage.setItem(KLYUCH, JSON.stringify(zapisi)); } catch { /* без хранилища корзина живёт до закрытия страницы */ }
}

const vKorzine = (id, r) => zapisi.includes(kl(id, r));
const sejchas = () => sostav(zapisi.map(razobrat), TOVARY);

// Размер, выбранный в карточке кнопки (у витрины выбора нет)
function razmerKarty(b) {
  const r = b.closest('.tovar')?.querySelector('[data-razmer][aria-pressed="true"]');
  return r ? Number(r.dataset.razmer) : null;
}

// Кнопка вещи: в корзине ли вещь в выбранном размере. Витрина у вещи с размерами: «Выбрать размер».
export function knopka(b) {
  const t = tovar(b.dataset.vKorzinu);
  if (!t) return;
  const da = vKorzine(t.id, razmerKarty(b));
  b.classList.toggle('v-korzine', da);
  b.classList.toggle('s-razmerom', !b.closest('.tovar') && razmery(t).length > 0);
  if (b.hasAttribute('aria-pressed')) b.setAttribute('aria-pressed', da);
}

// Число у значка: только вещи, которые можно заказать
function chislo() {
  const n = sejchas().est.length;
  document.querySelectorAll('[data-chislo]').forEach((c) => { c.textContent = n; c.hidden = !n; });
}

function obnovit(sChislom = true) {
  const { est, net } = sejchas();
  if (sChislom) chislo();
  document.querySelectorAll('[data-v-korzinu]').forEach(knopka);
  $('[data-k-schet]').textContent = est.length ? veshchej(est.length) : '';
  $('[data-k-spisok]').innerHTML = [...est, ...net].map(({ t, r }, i) => {
    const nelzya = net.some((z) => z.t === t && z.r === r);
    return `<li class="${nelzya ? 'prodano' : ''}" data-k="${kl(t.id, r)}" style="--i:${i}">
    <img src="${t.foto}" alt="" width="64" height="80">
    <div><b>${t.name}</b><span class="k-vozrast">${r ? `Размер ${r}` : t.vozrast}</span><span class="k-cena">${nelzya && !t.prodano ? 'Размера больше нет' : cenaHtml(t)}</span></div>
    <button class="korzina-ubrat" type="button" data-k-ubrat="${kl(t.id, r)}" aria-label="Убрать из корзины: ${t.name}${r ? `, размер ${r}` : ''}">Убрать</button>
  </li>`;
  }).join('');
  $('[data-k-pusto]').hidden = est.length + net.length > 0;
  $('[data-k-niz]').hidden = !est.length;
  const { summa, bezCeny } = itogo(est);
  $('[data-k-itog]').textContent = summa ? rub(summa) : 'Цена в WhatsApp';
  $('[data-k-primech]').textContent = summa && bezCeny ? `Без цены: ${veshchej(bezCeny)}. Цену скажут в WhatsApp.` : '';
  $('[data-k-zakaz]').href = waUrl(soobshchenie(est));
}

const pereklyuchit = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };

// Фото летит дугой из карточки в видимый значок корзины и тает в нём
function polet(img, cel) {
  const a = img.getBoundingClientRect(), b = cel.getBoundingClientRect();
  if (!a.width || a.bottom < 0 || a.top > innerHeight) return Promise.resolve();
  const k = img.cloneNode();
  k.className = 'let'; k.alt = ''; k.removeAttribute('loading');
  Object.assign(k.style, { left: a.left + 'px', top: a.top + 'px', width: a.width + 'px', height: a.height + 'px' });
  document.body.append(k);
  const dx = b.left + b.width / 2 - (a.left + a.width / 2), dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const m = 28 / a.width;
  return k.animate([
    { transform: 'none', opacity: 1 },
    { transform: `translate(${dx * 0.4}px, ${dy * 0.4 - 90}px) scale(${Math.max(m, 0.5)})`, opacity: 1, offset: 0.45 },
    { transform: `translate(${dx}px, ${dy}px) scale(${m})`, opacity: 0.15, borderRadius: '50%' },
  ], { duration: 780, easing: 'cubic-bezier(.45, 0, .25, 1)' }).finished.catch(() => {}).finally(() => k.remove());
}

function polozhit(k, img) {
  zapisi = [...zapisi, k];
  zapisat();
  const cel = [...document.querySelectorAll('[data-korzina-otkryt]')].find((b) => b.offsetParent !== null);
  const doletelo = () => { chislo(); const c = cel && cel.querySelector('[data-chislo]'); if (c && !TIHO) pereklyuchit(c, 'podskok'); };
  if (TIHO || !img || !cel) { obnovit(); return doletelo(); }
  obnovit(false);
  polet(img, cel.querySelector('svg') || cel).then(doletelo);
}

function ubrat(k) {
  const konec = () => { zapisi = zapisi.filter((x) => x !== k); zapisat(); obnovit(); };
  const li = okno.open && [...okno.querySelectorAll('[data-k]')].find((x) => x.dataset.k === k);
  if (!li || TIHO) return konec();
  li.animate([
    { opacity: 1, transform: 'none', height: li.offsetHeight + 'px' },
    { opacity: 0, transform: 'translateX(-40px)', height: '0px', paddingTop: '0px', paddingBottom: '0px', borderBottomWidth: '0px' },
  ], { duration: 340, easing: 'cubic-bezier(.2, .7, .2, 1)', fill: 'forwards' }).finished.then(konec, konec);
}

// Размер не выбран: ряд размеров вздрагивает, под названием золотом «выберите размер». С витрины сначала едем к карточке.
function vyberiRazmer(karta, ehat) {
  if (!karta) return;
  if (karta.hidden) document.querySelector('[data-vozrast="all"]')?.click();
  const pokazat = () => { pereklyuchit(karta, 'vyberi'); clearTimeout(karta.tajmer); karta.tajmer = setTimeout(() => karta.classList.remove('vyberi'), 2600); };
  if (!ehat) return pokazat();
  setTimeout(() => {
    karta.scrollIntoView({ behavior: TIHO ? 'auto' : 'smooth', block: 'center' });
    setTimeout(pokazat, TIHO ? 0 : 650);
  }, karta.hidden ? 300 : 0);
}

function otkryt() {
  clearTimeout(tajmer);
  obnovit();
  if (!okno.open) okno.showModal();
  document.documentElement.classList.add('korzina-otkryta');
  void okno.offsetWidth;
  okno.classList.add('otkryta');
}

function zakryt(potom) {
  if (!okno.open) return;
  okno.classList.remove('otkryta');
  document.documentElement.classList.remove('korzina-otkryta');
  clearTimeout(tajmer);
  tajmer = setTimeout(() => { okno.close(); if (potom) potom(); }, TIHO ? 0 : 450);
}

// Фото и кнопка витрины кладут вещь, а если она уже в корзине, открывают корзину. Круглая кнопка у вещи кладёт и убирает.
// У вещи есть размеры: сначала размер.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-v-korzinu]');
  if (b) {
    const t = tovar(b.dataset.vKorzinu);
    if (!t) return;
    const karta = b.closest('.tovar'), r = razmerKarty(b);
    if (razmery(t).length && !r) return vyberiRazmer(karta || document.querySelector(`.tovar[data-id="${t.id}"]`), !karta);
    if (!vKorzine(t.id, r)) polozhit(kl(t.id, r), karta ? karta.querySelector('img') : document.querySelector('.arka.centr img'));
    else if (b.hasAttribute('aria-pressed')) ubrat(kl(t.id, r));
    else otkryt();
    return;
  }
  // Сменили размер в карточке (js/tovary.js уже отметил его): кнопка показывает, есть ли этот размер в корзине
  const r = e.target.closest('.tovar [data-razmer]');
  if (r) { const k = r.closest('.tovar'); k.classList.remove('vyberi'); k.querySelectorAll('[data-v-korzinu]').forEach(knopka); return; }
  if (e.target.closest('[data-korzina-otkryt]')) otkryt();
});

okno.addEventListener('click', (e) => {
  const u = e.target.closest('[data-k-ubrat]');
  if (u) return ubrat(u.dataset.kUbrat);
  if (e.target.closest('[data-k-zakryt]') || e.target.classList.contains('korzina-ten')) return zakryt();
  if (e.target.closest('[data-k-katalog]')) {
    e.preventDefault();
    return zakryt(() => document.getElementById('katalog').scrollIntoView({ behavior: TIHO ? 'auto' : 'smooth' }));
  }
  if (e.target.closest('[data-k-ochistit]')) { zapisi = []; zapisat(); obnovit(); }
});
// Esc и «назад» на Android закрывают плавно
okno.addEventListener('cancel', (e) => { e.preventDefault(); zakryt(); });

gotovo.then((d) => { TOVARY = d.tovary; obnovit(); }, () => { /* нет связи: каталог сам скажет об этом */ });
