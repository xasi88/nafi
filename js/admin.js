// Страница Миланы: цена, скидка, «Хит продаж», «Продано», размеры, название, категория, «Скрыть с сайта»,
// акция и категории (js/admin-obshchee.js). Два входа:
// - в Telegram (мини-приложение «Мой магазин», js/admin-tg.js): сохраняет бот NAFI, ключа в телефоне нет;
// - в браузере с ключом GitHub (js/github.js): один коммит в data/tovary.json.
// Новые вещи и новые фото идут через бота. Устройство: docs/ARCHITECTURE.md, «Страница Миланы».
import { PUT, SKIDKI, zagruzit, rub, cenaSeychas, slit, oshibka, oshibkaObshchego, razmery, razmeryVozrasta, kategorii, chistyj } from './dannye.js?v=a36433cd';
import { repo, proverit, prochitat, zapisat } from './github.js?v=a36433cd';
import { TG, tgStart, tgZakryt, bot, sohranitCherezBota, cherezTelegram } from './admin-tg.js?v=a36433cd';
import { narisovatObshchee, kategoriiSejchas } from './admin-obshchee.js?v=a36433cd';

const KLYUCH = 'nafi-klyuch', CHERNOVIK = 'nafi-pravki', OTPRAVLENO = 'nafi-otpravleno';
const hran = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* без хранилища правки живут до перезагрузки */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* нечего удалять */ } },
};
const $ = (s) => document.querySelector(s);

let dannye = null;   // файл, как он лежит на GitHub (или на сайте)
let pravki = {};     // id -> { поле: новое значение }, только то, что отличается от файла
let obshchee = {};   // akciya, kategorii: только если отличаются от файла

const ishod = (id) => dannye.tovary.find((t) => t.id === id);
const sejchas = (id) => ({ ...ishod(id), ...(pravki[id] || {}) });
const chislo = () => Object.values(pravki).reduce((n, p) => n + Object.keys(p).length, 0) + Object.keys(obshchee).length;
// Поле для сравнения: у вещи без размеров пустой список, без категории null. Списки сравниваются по содержимому.
const znachPolya = (t, pole) => (pole === 'razmery' ? razmery(t) : pole === 'kategoriya' ? t.kategoriya || null : pole === 'skryto' ? !!t.skryto : t[pole]);
const vFajle = (k) => (k === 'akciya' ? dannye.akciya || { vkl: false, tekst: '' } : kategorii(dannye));
const ravno = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function tost(text, ploho = false) {
  const t = $('[data-tost]');
  t.textContent = text;
  t.classList.toggle('ploho', ploho);
  t.classList.add('vidno');
  clearTimeout(t._t);
  t._t = setTimeout(() => t.classList.remove('vidno'), ploho ? 6000 : 3500);
}

function itog(t) {
  if (t.skryto) return 'Скрыто: на сайте этой вещи нет';
  if (t.prodano) return 'На сайте: продано, кнопки заказа нет';
  const c = cenaSeychas(t);
  if (!c) return 'На сайте: «Цена в WhatsApp»';
  return t.skidka ? `На сайте: ${rub(c)} вместо ${rub(t.cena)}` : `На сайте: ${rub(c)}`;
}

// Названия чистые (js/dannye.js, chistyj): в разметку их можно ставить как есть
function stroka(id) {
  const t = sejchas(id);
  const sw = (pole, text) => `<button type="button" class="pereklyuchatel" role="switch" aria-checked="${!!t[pole]}" data-pole="${pole}"><span aria-hidden="true"></span>${text}</button>`;
  const est = razmery(t);
  const spisok = [...new Set([...razmeryVozrasta(t), ...est])].sort((a, b) => a - b);
  const kat = kategoriiSejchas(dannye, obshchee);
  return `<article class="adm-vesh${pravki[id] ? ' pravlena' : ''}${t.prodano ? ' prodano' : ''}${t.skryto ? ' skryto' : ''}" data-id="${id}">
    <img src="${t.foto}" alt="" width="640" height="800" loading="lazy">
    <div class="adm-info">
      <h3>${chistyj(t.name)}</h3>
      <p>${t.vozrast}</p>
      <p class="adm-itog">${itog(t)}</p>
    </div>
    <div class="adm-polya">
      <label class="pole">Цена, ₽<input type="number" inputmode="numeric" min="1" step="10" placeholder="нет" value="${t.cena ?? ''}" data-pole="cena"></label>
      <label class="pole">Скидка<select data-pole="skidka">${SKIDKI.map((s) => `<option value="${s}"${s === t.skidka ? ' selected' : ''}>${s ? s + '%' : 'нет'}</option>`).join('')}</select></label>
      ${sw('hit', 'Хит продаж')}
      ${sw('prodano', 'Продано')}
      <div class="adm-razmery"><span>Размеры в наличии, рост в см</span>
        <div role="group" aria-label="Размеры в наличии">${spisok.map((r) => `<button type="button" aria-pressed="${est.includes(r)}" data-razmer="${r}">${r}</button>`).join('')}</div>
      </div>
      <label class="pole adm-shiroko">Название<input type="text" maxlength="60" value="${chistyj(t.name)}" data-pole="name"></label>
      ${kat.length ? `<label class="pole adm-shiroko">Категория<select data-pole="kategoriya"><option value="">без категории</option>${kat.map((k) => `<option value="${k.id}"${k.id === t.kategoriya ? ' selected' : ''}>${k.name}</option>`).join('')}</select></label>` : ''}
      ${sw('skryto', 'Скрыть с сайта')}
      ${TG ? '<button type="button" class="knopka-vtor" data-foto>Новое фото</button>' : ''}
    </div>
  </article>`;
}

// Скрытые вещи внизу списка
function narisovat() {
  const vse = dannye.tovary.map((t) => t.id);
  const skr = (id) => !!sejchas(id).skryto;
  $('[data-spisok]').innerHTML = [...vse.filter((id) => !skr(id)), ...vse.filter(skr)].map(stroka).join('');
  niz();
}

function obnovitStroku(id) {
  const el = document.querySelector(`.adm-vesh[data-id="${id}"]`);
  const t = sejchas(id);
  el.classList.toggle('pravlena', !!pravki[id]);
  el.classList.toggle('prodano', !!t.prodano);
  el.classList.toggle('skryto', !!t.skryto);
  el.querySelector('.adm-itog').textContent = itog(t);
  niz();
}

function niz() {
  const n = chislo();
  $('[data-izmeneno]').textContent = n ? `Изменено: ${n}` : 'Изменений нет';
  $('[data-sohranit]').disabled = !n;
  $('[data-otmena]').hidden = !n;
  if (n) hran.set(CHERNOVIK, JSON.stringify({ p: pravki, o: obshchee })); else hran.del(CHERNOVIK);
}

// Новое значение поля: правка остаётся, только если отличается от файла
function postavit(id, pole, znach) {
  const p = { ...(pravki[id] || {}) };
  if (ravno(znachPolya(ishod(id), pole), znach)) delete p[pole]; else p[pole] = znach;
  if (Object.keys(p).length) pravki[id] = p; else delete pravki[id];
  obnovitStroku(id);
}

function izmenitObshchee(k, v) {
  if (ravno(vFajle(k), v)) delete obshchee[k]; else obshchee[k] = v;
  niz();
}

function znachenie(el) {
  const pole = el.dataset.pole;
  if (pole === 'cena') return el.value === '' ? null : Math.round(Number(el.value));
  if (pole === 'skidka') return Number(el.value);
  if (pole === 'name') return el.value;
  if (pole === 'kategoriya') return el.value || null;
  return el.getAttribute('aria-checked') !== 'true';
}

// Цена берётся на каждой цифре (input). Одного change мало: на iPhone он приходит только после ухода из поля,
// а у цифровой клавиатуры нет «Готово», и «Сохранить» оставалась серой.
// Поле, убранное перерисовкой («Отменить», «Сохранить»), шлёт change при уходе фокуса: его не слушаем, иначе правка вернётся.
const pravka = (e) => {
  const el = e.target.closest('[data-pole]');
  if (el && el.isConnected && el.tagName !== 'BUTTON') postavit(el.closest('.adm-vesh').dataset.id, el.dataset.pole, znachenie(el));
};
['input', 'change'].forEach((s) => $('[data-spisok]').addEventListener(s, pravka));
$('[data-spisok]').addEventListener('click', async (e) => {
  const id = e.target.closest('.adm-vesh')?.dataset.id;
  // Размер: нажатие отмечает или снимает, список держится по порядку
  const r = e.target.closest('button[data-razmer]');
  if (r) {
    const n = Number(r.dataset.razmer), est = razmery(sejchas(id));
    r.setAttribute('aria-pressed', !est.includes(n));
    return postavit(id, 'razmery', est.includes(n) ? est.filter((x) => x !== n) : [...est, n].sort((a, b) => a - b));
  }
  // Новое фото: бот ждёт его в чате, приложение закрывается
  if (e.target.closest('[data-foto]')) {
    try {
      if (TG.klaviatura) return void cherezTelegram({ t: 'f', id, imya: ishod(id).name });
      await bot('/foto', { id, imya: ishod(id).name });
      tost('Пришлите фото в чат с ботом');
      setTimeout(tgZakryt, 900);
    } catch (err) { tost(err.message, true); }
    return;
  }
  const el = e.target.closest('button[data-pole]');
  if (!el) return;
  const v = znachenie(el);
  el.setAttribute('aria-checked', v);
  postavit(id, el.dataset.pole, v);
});

$('[data-otmena]').addEventListener('click', () => { pravki = {}; obshchee = {}; narisovatVse(); tost('Правки отменены'); });

$('[data-novaya]').addEventListener('click', async () => {
  try {
    if (TG.klaviatura) return void cherezTelegram({ t: 'n' });
    await bot('/novaya');
    tost('Пришлите фото в чат с ботом');
    setTimeout(tgZakryt, 900);
  } catch (err) { tost(err.message, true); }
});

async function sohranitKlyuchom(klyuch) {
  const svezhij = JSON.parse(await prochitat(klyuch, PUT));
  const novyj = slit(svezhij, pravki, obshchee);
  const imena = [...Object.keys(pravki).map((id) => ishod(id).name), ...Object.keys(obshchee).map((k) => (k === 'akciya' ? 'акция' : 'категории'))];
  await zapisat(klyuch, PUT, JSON.stringify(novyj, null, 2) + '\n', `Милана: ${imena.slice(0, 3).join(', ')}${imena.length > 3 ? ' и другие' : ''}`);
  return novyj;
}

$('[data-sohranit]').addEventListener('click', async () => {
  const klyuch = hran.get(KLYUCH);
  if (!TG && !klyuch) { $('[data-dostup]').hidden = false; $('[data-klyuch]').focus(); return tost('Сначала подключите сохранение', true); }
  for (const p of Object.values(pravki)) if ('name' in p) p.name = chistyj(p.name);
  const oo = oshibkaObshchego(obshchee);
  if (oo) return tost(oo, true);
  for (const [id, p] of Object.entries(pravki)) {
    const o = oshibka(p);
    if (o) return tost(`${ishod(id).name}: ${o}`, true);
  }
  const knopka = $('[data-sohranit]');
  knopka.disabled = true; knopka.textContent = 'Сохраняю…';
  try {
    if (TG && TG.klaviatura) {
      // Приложение закрывается, бот пишет в чат «Сохранил». Черновик остаётся до обновления сайта:
      // при следующем открытии правки, которые уже на сайте, отпадут сами (chernovik)
      if (!cherezTelegram({ t: 's', p: pravki, o: obshchee })) throw new Error('Слишком много правок сразу. Сохраните часть, потом остальное.');
      hran.set(OTPRAVLENO, String(Date.now()));
      return;
    } else if (TG) {
      await sohranitCherezBota(pravki, obshchee);
      dannye = slit(dannye, pravki, obshchee);
    } else {
      dannye = await sohranitKlyuchom(klyuch);
    }
    pravki = {}; obshchee = {};
    narisovatVse();
    tost('Сохранено. На сайте через 1-2 минуты.');
  } catch (err) {
    tost(err.message, true);
  } finally {
    knopka.textContent = 'Сохранить';
    niz();
  }
});

$('[data-podklyuchit]').addEventListener('click', async () => {
  const pole = $('[data-klyuch]'), klyuch = pole.value.trim();
  const osh = $('[data-dostup-oshibka]');
  osh.textContent = '';
  if (!klyuch) { osh.textContent = 'Вставьте ключ'; return; }
  try {
    await proverit(klyuch);
    hran.set(KLYUCH, klyuch);
    pole.value = '';
    $('[data-dostup]').hidden = true;
    await start();
    tost('Сохранение подключено');
  } catch (err) {
    osh.textContent = err.message;
  }
});

function status() {
  const s = $('[data-status]');
  if (TG) return;
  const est = !!hran.get(KLYUCH);
  s.innerHTML = est
    ? `Сохранение подключено · <button type="button" class="ssylka-mal" data-otklyuchit>Отключить</button>`
    : `Сохранение не подключено · <button type="button" class="ssylka-mal" data-pokazat-dostup>Подключить</button>`;
  s.querySelector('[data-otklyuchit]')?.addEventListener('click', () => { hran.del(KLYUCH); status(); $('[data-dostup]').hidden = false; });
  s.querySelector('[data-pokazat-dostup]')?.addEventListener('click', () => { $('[data-dostup]').hidden = false; $('[data-klyuch]').focus(); });
}

function narisovatVse() {
  narisovatObshchee($('[data-obshchee]'), dannye, obshchee, izmenitObshchee, narisovat);
  narisovat();
}

// Черновик: несохранённые правки с прошлого раза, только то, что ещё отличается
function chernovik() {
  pravki = {}; obshchee = {};
  try {
    const cher = JSON.parse(hran.get(CHERNOVIK) || '{}');
    const p = cher.p || (cher.o ? {} : cher); // старый черновик: только правки вещей
    for (const [id, pr] of Object.entries(p)) {
      if (!ishod(id)) continue;
      for (const [k, v] of Object.entries(pr)) if (!ravno(znachPolya(ishod(id), k), v)) (pravki[id] ||= {})[k] = v;
    }
    for (const [k, v] of Object.entries(cher.o || {})) if (!ravno(vFajle(k), v)) obshchee[k] = v;
  } catch { pravki = {}; obshchee = {}; }
}

async function start() {
  if (TG) {
    tgStart();
    $('[data-novaya]').hidden = false;
    $('[data-novoe-tekst]').hidden = true;
    // Кнопкой внизу чата: адрес бота не нужен, правки уходят через Telegram, чужие правки бот не примет
    if (TG.klaviatura) {
      $('[data-status]').textContent = 'Сохранение через бота NAFI';
    } else {
      try {
        const kto = await bot('/vhod');
        $('[data-status]').textContent = `Telegram: ${kto.imya}`;
      } catch (err) {
        $('[data-status]').textContent = 'Откройте «Мой магазин» кнопкой внизу чата с ботом';
        return;
      }
    }
    dannye = await zagruzit(`${PUT}?t=${Date.now()}`);
  } else {
    const klyuch = hran.get(KLYUCH);
    try {
      dannye = klyuch ? JSON.parse(await prochitat(klyuch, PUT)) : await zagruzit();
    } catch (err) {
      if (!klyuch) throw err;
      dannye = await zagruzit();
      tost(`${err.message}. Показаны цены с сайта.`, true);
    }
    status();
    if (!klyuch) $('[data-dostup]').hidden = false;
  }
  chernovik();
  $('[data-obshchee]').hidden = false;
  narisovatVse();
  const nedavno = Date.now() - Number(hran.get(OTPRAVLENO) || 0) < 3 * 60 * 1000;
  if (chislo()) tost(nedavno ? 'Правки отправлены боту. Сайт обновится через 1-2 минуты.' : 'Есть несохранённые правки с прошлого раза');
}

// Номер версии внизу страницы (js/version.js)
if (window.Versii) $('[data-versiya]').textContent = `Версия ${window.Versii.nomer}: ${window.Versii.spisok[0].title}`;

start().catch(() => { $('[data-status]').textContent = 'Список не загрузился. Обновите страницу.'; });
console.info('NAFI: сохранение', TG ? 'через бота' : 'в ' + repo().owner + '/' + repo().name);
