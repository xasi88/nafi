// NAFI: движение по раскадровке (docs/Раскадровка движения.md). При «уменьшить движение» всё стоит.
import { gotovo, waLink, cenaText } from './tovary.js';

const TIHO = matchMedia('(prefers-reduced-motion: reduce)').matches;

const vidim = (el) => el && el.offsetParent !== null;

// Подпись меняется: новое слово встаёт снизу
function zamenit(el, text) {
  if (!el || el.textContent === text) return;
  el.textContent = text;
  el.classList.remove('smena'); void el.offsetWidth; el.classList.add('smena');
}

// Заголовок: каждое слово в своей маске
function razbitSlova() {
  document.querySelectorAll('h1[data-slova]').forEach((h) => {
    const slova = h.textContent.trim().split(/ +/);
    h.setAttribute('aria-label', h.textContent.trim());
    h.innerHTML = slova.map((s, n) => `<span class="slovo" aria-hidden="true"><span style="--n:${n}">${s}</span></span>`).join(' ');
    h.classList.add('razbit');
  });
}

// Светлая тема: арка, вещи сменяются наплывом с медленным приближением
function arka(spisok) {
  const okno = document.querySelector('.arka-okno');
  if (!okno || !spisok.length) return;
  okno.innerHTML = spisok.map((t) => `<img src="${t.foto}" alt="" width="640" height="800">`).join('');
  const imgs = [...okno.children];
  const name = document.querySelector('[data-arka-name]'), info = document.querySelector('[data-arka-info]');
  let i = 0;
  const pokaz = () => {
    imgs.forEach((im, k) => im.classList.toggle('aktiv', k === i));
    zamenit(name, spisok[i].name);
    zamenit(info, `${spisok[i].vozrast}, ${cenaText(spisok[i])}`);
  };
  pokaz();
  if (!TIHO) setInterval(() => {
    if (document.hidden || !vidim(okno)) return;
    i = (i + 1) % imgs.length; pokaz();
  }, 4200);
}

// Тёмная тема: витрина в глубину, листается кнопками, пальцем и сама
function vitrina(spisok) {
  const lenta = document.querySelector('[data-lenta]');
  if (!lenta || !spisok.length) return;
  const L = spisok.length;
  lenta.innerHTML = spisok.map((t) => `<div class="arka"><img src="${t.foto}" alt="${t.name}" width="640" height="800"></div>`).join('');
  const arki = [...lenta.children];
  const svet = document.querySelector('.svet');
  const imya = document.querySelector('[data-v-name]'), info = document.querySelector('[data-v-info]'), wa = document.querySelector('[data-v-wa]');
  let tek = 0, tajmer;
  const pereklyuchit = (el, cls) => { el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); };
  const pokaz = (n, sDvizh) => {
    tek = (n + L) % L;
    arki.forEach((a, i) => {
      let d = i - tek;
      if (d > L / 2) d -= L;
      if (d < -L / 2) d += L;
      a.style.setProperty('--d', d);
      a.style.setProperty('--ad', Math.abs(d));
      a.classList.toggle('centr', d === 0);
      a.classList.toggle('skryt', Math.abs(d) > 1);
    });
    const t = spisok[tek];
    zamenit(imya, t.name);
    zamenit(info, `${t.vozrast}, ${cenaText(t)}`);
    wa.href = waLink(t);
    if (sDvizh && !TIHO) { pereklyuchit(lenta, 'dvizh'); pereklyuchit(svet, 'vspyshka'); }
  };
  const avto = () => {
    clearInterval(tajmer);
    if (!TIHO) tajmer = setInterval(() => { if (!document.hidden && vidim(lenta)) pokaz(tek + 1, true); }, 4600);
  };
  if (!TIHO) lenta.classList.add('vhod');
  pokaz(0);
  if (!TIHO) setTimeout(() => lenta.classList.remove('vhod'), 450);
  document.querySelectorAll('[data-shag]').forEach((b) => b.addEventListener('click', () => { pokaz(tek + Number(b.dataset.shag), true); avto(); }));
  let x0 = null;
  lenta.addEventListener('pointerdown', (e) => { x0 = e.clientX; });
  lenta.addEventListener('pointerup', (e) => {
    if (x0 !== null && Math.abs(e.clientX - x0) > 40) { pokaz(tek + (e.clientX < x0 ? 1 : -1), true); avto(); }
    x0 = null;
  });
  arki.forEach((a, i) => a.addEventListener('click', () => { if (i !== tek) { pokaz(i, true); avto(); } }));
  avto();
}

// Прогулка: девочка въезжает, тормозит, стоит, идёт дальше. Колёса крутятся ровно по пути.
let tolchok = 0;
function progulka() {
  const zemli = [...document.querySelectorAll('[data-progulka]')];
  zemli.forEach((z) => {
    z.innerHTML = '<div class="progulka"><img class="progulka-telo" src="img/progulka.png" alt="" width="850" height="519">'
      + '<img class="koleso" src="img/koleso.png" alt="" style="left:19.06%"><img class="koleso" src="img/koleso.png" alt="" style="left:50.71%"></div>';
    z._p = { x: null, faza: 'zhdet', t: 0 };
  });
  const SKOROST = 24, VHOD = 2600, PAUZA = 2600;
  const ease = (k) => 1 - Math.pow(1 - k, 3);
  let proshloe = performance.now();
  const kadr = (seychas) => {
    const dt = Math.min(64, seychas - proshloe); proshloe = seychas;
    tolchok *= 0.93;
    zemli.forEach((z) => {
      if (!vidim(z)) return;
      const el = z.firstChild, p = z._p;
      const W = z.clientWidth, S = el.offsetWidth, cel = Math.max(8, W * 0.06), start = -S * 1.15;
      if (p.x === null) { p.x = start; p.faza = 'vhod'; p.t = seychas + 500; }
      if (TIHO) p.x = cel;
      else if (p.faza === 'vhod') {
        const k = Math.max(0, Math.min(1, (seychas - p.t) / VHOD));
        p.x = start + (cel - start) * ease(k);
        if (k >= 1) { p.faza = 'pauza'; p.t = seychas; }
      } else if (p.faza === 'pauza') {
        p.x += tolchok * dt / 1000;
        if (seychas - p.t > PAUZA) p.faza = 'idet';
      } else {
        p.x += (SKOROST + tolchok) * dt / 1000;
        if (p.x > W + 10) p.x = start;
      }
      const R = S * 50 / 850;
      const ugol = p.x / R * 57.2958;
      const shag = -Math.abs(Math.sin(p.x / (S * 0.09))) * S * 0.012;
      el.style.transform = `translate3d(${p.x.toFixed(1)}px, ${shag.toFixed(2)}px, 0)`;
      el.querySelectorAll('.koleso').forEach((k) => { k.style.transform = `rotate(${ugol.toFixed(1)}deg)`; });
    });
    if (!TIHO) requestAnimationFrame(kadr);
  };
  requestAnimationFrame(kadr);
}

// Камера и шапка: --sy для параллакса, прокрутка подталкивает прогулку
function kamera() {
  const shapka = document.querySelector('.shapka');
  let poslednij = scrollY, zhdet = false;
  const obnovit = () => {
    zhdet = false;
    const y = scrollY;
    tolchok = Math.min(420, tolchok + Math.abs(y - poslednij) * 2.2);
    poslednij = y;
    if (!TIHO) document.documentElement.style.setProperty('--sy', Math.min(y, 900).toFixed(0));
    shapka.classList.toggle('nizhe', y > 30);
  };
  addEventListener('scroll', () => { if (!zhdet) { zhdet = true; requestAnimationFrame(obnovit); } }, { passive: true });
  obnovit();
}

// Появление при прокрутке: карточки встают из глубины по очереди, веточка рисуется
function poyavlenie() {
  const sledit = () => document.querySelectorAll('.tovar:not(.vidno):not([hidden]), .poyav:not(.vidno), .vetka:not(.vidno)');
  if (TIHO || !('IntersectionObserver' in window)) return sledit().forEach((e) => e.classList.add('vidno'));
  const io = new IntersectionObserver((zapisi) => zapisi.forEach((z) => {
    if (!z.isIntersecting) return;
    const el = z.target;
    io.unobserve(el);
    el.classList.add('vidno');
    if (el.classList.contains('tovar')) { el.classList.add('pervyj'); setTimeout(() => el.classList.remove('pervyj'), 1400); }
  }), { rootMargin: '0px 0px -10% 0px' });
  sledit().forEach((e) => io.observe(e));
}

// Мышь: карточка наклоняется за курсором, по фото идёт блик. Палец: только нажатие.
function naklon() {
  const setka = document.querySelector('[data-setka]');
  if (TIHO || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  setka.addEventListener('pointermove', (e) => {
    const k = e.target.closest('.tovar.vidno');
    if (!k) return;
    const r = k.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5, py = (e.clientY - r.top) / r.height - 0.5;
    k.style.setProperty('--ry', `${(px * 7).toFixed(2)}deg`);
    k.style.setProperty('--rx', `${(-py * 5).toFixed(2)}deg`);
    k.style.setProperty('--mx', (px * 2).toFixed(2));
  });
  setka.addEventListener('pointerout', (e) => {
    const k = e.target.closest('.tovar');
    if (k && !k.contains(e.relatedTarget)) { k.style.setProperty('--rx', '0deg'); k.style.setProperty('--ry', '0deg'); }
  });
}

// Модуль идёт после разбора страницы: всё на месте
razbitSlova();
progulka();
kamera();
naklon();
gotovo.then(({ arka: a, vitrina: v }) => {
  arka(a);
  vitrina(v);
  poyavlenie();
}).catch(() => {
  document.querySelector('[data-setka]').innerHTML = '<p class="net-svyazi">Каталог не загрузился. Обновите страницу или напишите нам в WhatsApp.</p>';
});
