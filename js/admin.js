// Страница Миланы: цена, скидка, «Хит продаж», «Продано». Сохранение одним коммитом в data/tovary.json.
// Новые вещи сюда не добавляются: их добавляет Claude через код. Устройство: docs/ARCHITECTURE.md, «Страница Миланы».
import { PUT, SKIDKI, zagruzit, rub, cenaSeychas, slit, oshibka, razmery, razmeryVozrasta } from './dannye.js?v=e9d92d71';
import { repo, proverit, prochitat, zapisat } from './github.js?v=e9d92d71';

const KLYUCH = 'nafi-klyuch', CHERNOVIK = 'nafi-pravki';
const hran = {
  get: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch { /* без хранилища правки живут до перезагрузки */ } },
  del: (k) => { try { localStorage.removeItem(k); } catch { /* нечего удалять */ } },
};
const $ = (s) => document.querySelector(s);

let dannye = null;   // файл, как он лежит на GitHub (или на сайте, если ключа нет)
let pravki = {};     // id -> { поле: новое значение }, только то, что отличается от файла

const ishod = (id) => dannye.tovary.find((t) => t.id === id);
const sejchas = (id) => ({ ...ishod(id), ...(pravki[id] || {}) });
const chislo = () => Object.values(pravki).reduce((n, p) => n + Object.keys(p).length, 0);
// Поле для сравнения: у вещи без размеров пустой список. Списки сравниваются по содержимому.
const znachPolya = (t, pole) => (pole === 'razmery' ? razmery(t) : t[pole]);
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
  if (t.prodano) return 'На сайте: продано, кнопки заказа нет';
  const c = cenaSeychas(t);
  if (!c) return 'На сайте: «Цена в WhatsApp»';
  return t.skidka ? `На сайте: ${rub(c)} вместо ${rub(t.cena)}` : `На сайте: ${rub(c)}`;
}

function stroka(id) {
  const t = sejchas(id);
  const pravlena = !!pravki[id];
  const sw = (pole, text) => `<button type="button" class="pereklyuchatel" role="switch" aria-checked="${!!t[pole]}" data-pole="${pole}"><span aria-hidden="true"></span>${text}</button>`;
  const est = razmery(t);
  const spisok = [...new Set([...razmeryVozrasta(t), ...est])].sort((a, b) => a - b);
  return `<article class="adm-vesh${pravlena ? ' pravlena' : ''}${t.prodano ? ' prodano' : ''}" data-id="${id}">
    <img src="${t.foto}" alt="" width="640" height="800" loading="lazy">
    <div class="adm-info">
      <h3>${t.name}</h3>
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
    </div>
  </article>`;
}

function narisovat() {
  $('[data-spisok]').innerHTML = dannye.tovary.map((t) => stroka(t.id)).join('');
  niz();
}

function obnovitStroku(id) {
  const el = document.querySelector(`.adm-vesh[data-id="${id}"]`);
  const t = sejchas(id);
  el.classList.toggle('pravlena', !!pravki[id]);
  el.classList.toggle('prodano', !!t.prodano);
  el.querySelector('.adm-itog').textContent = itog(t);
  niz();
}

function niz() {
  const n = chislo();
  $('[data-izmeneno]').textContent = n ? `Изменено: ${n}` : 'Изменений нет';
  $('[data-sohranit]').disabled = !n;
  $('[data-otmena]').hidden = !n;
  if (n) hran.set(CHERNOVIK, JSON.stringify(pravki)); else hran.del(CHERNOVIK);
}

// Новое значение поля: правка остаётся, только если отличается от файла
function postavit(id, pole, znach) {
  const p = { ...(pravki[id] || {}) };
  if (ravno(znachPolya(ishod(id), pole), znach)) delete p[pole]; else p[pole] = znach;
  if (Object.keys(p).length) pravki[id] = p; else delete pravki[id];
  obnovitStroku(id);
}

function znachenie(el) {
  const pole = el.dataset.pole;
  if (pole === 'cena') return el.value === '' ? null : Math.round(Number(el.value));
  if (pole === 'skidka') return Number(el.value);
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
$('[data-spisok]').addEventListener('click', (e) => {
  // Размер: нажатие отмечает или снимает, список держится по порядку
  const r = e.target.closest('button[data-razmer]');
  if (r) {
    const id = r.closest('.adm-vesh').dataset.id, n = Number(r.dataset.razmer), est = razmery(sejchas(id));
    r.setAttribute('aria-pressed', !est.includes(n));
    return postavit(id, 'razmery', est.includes(n) ? est.filter((x) => x !== n) : [...est, n].sort((a, b) => a - b));
  }
  const el = e.target.closest('button[data-pole]');
  if (!el) return;
  const v = znachenie(el);
  el.setAttribute('aria-checked', v);
  postavit(el.closest('.adm-vesh').dataset.id, el.dataset.pole, v);
});

$('[data-otmena]').addEventListener('click', () => { pravki = {}; narisovat(); tost('Правки отменены'); });

$('[data-sohranit]').addEventListener('click', async () => {
  const klyuch = hran.get(KLYUCH);
  if (!klyuch) { $('[data-dostup]').hidden = false; $('[data-klyuch]').focus(); return tost('Сначала подключите сохранение', true); }
  for (const [id, p] of Object.entries(pravki)) {
    const o = oshibka(p);
    if (o) return tost(`${ishod(id).name}: ${o}`, true);
  }
  const knopka = $('[data-sohranit]');
  knopka.disabled = true; knopka.textContent = 'Сохраняю…';
  try {
    const svezhij = JSON.parse(await prochitat(klyuch, PUT));
    const novyj = slit(svezhij, pravki);
    const imena = Object.keys(pravki).map((id) => ishod(id).name).slice(0, 3).join(', ');
    await zapisat(klyuch, PUT, JSON.stringify(novyj, null, 2) + '\n', `Милана: ${imena}${Object.keys(pravki).length > 3 ? ' и другие' : ''}`);
    dannye = novyj; pravki = {};
    narisovat();
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
  const est = !!hran.get(KLYUCH);
  const s = $('[data-status]');
  s.innerHTML = est
    ? `Сохранение подключено · <button type="button" class="ssylka-mal" data-otklyuchit>Отключить</button>`
    : `Сохранение не подключено · <button type="button" class="ssylka-mal" data-pokazat-dostup>Подключить</button>`;
  s.querySelector('[data-otklyuchit]')?.addEventListener('click', () => { hran.del(KLYUCH); status(); $('[data-dostup]').hidden = false; });
  s.querySelector('[data-pokazat-dostup]')?.addEventListener('click', () => { $('[data-dostup]').hidden = false; $('[data-klyuch]').focus(); });
}

async function start() {
  const klyuch = hran.get(KLYUCH);
  try {
    dannye = klyuch ? JSON.parse(await prochitat(klyuch, PUT)) : await zagruzit();
  } catch (err) {
    if (!klyuch) throw err;
    dannye = await zagruzit();
    tost(`${err.message}. Показаны цены с сайта.`, true);
  }
  // Черновик: несохранённые правки с прошлого раза, только то, что ещё отличается
  try {
    const cher = JSON.parse(hran.get(CHERNOVIK) || '{}');
    pravki = {};
    for (const [id, p] of Object.entries(cher)) {
      if (!ishod(id)) continue;
      for (const [k, v] of Object.entries(p)) if (!ravno(znachPolya(ishod(id), k), v)) (pravki[id] ||= {})[k] = v;
    }
  } catch { pravki = {}; }
  status();
  if (!klyuch) $('[data-dostup]').hidden = false;
  narisovat();
  if (chislo()) tost('Есть несохранённые правки с прошлого раза');
}

start().catch(() => { $('[data-status]').textContent = 'Список не загрузился. Обновите страницу.'; });
console.info('NAFI: сохранение в', repo().owner + '/' + repo().name);
