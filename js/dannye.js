// Данные NAFI: вещи лежат в data/tovary.json. Его меняют страница Миланы (admin.html, цена, скидка, хит, продано)
// и Claude через код (новые вещи). Здесь общее для сайта, страницы Миланы и проверок (tests/).

export const PUT = 'data/tovary.json';
// Что Милана меняет сама. Остальное (новые вещи, фото, названия) идёт через код.
export const POLYA = ['cena', 'skidka', 'hit', 'prodano'];
export const SKIDKI = [0, 5, 10, 15, 20, 25, 30, 40, 50];

export async function zagruzit(put = PUT) {
  const r = await fetch(put, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Нет файла ${put}`);
  return r.json();
}

export const rub = (n) => n.toLocaleString('ru-RU') + ' ₽';

// Цена со скидкой, вниз до десятка рублей
export function cenaSeychas(t) {
  if (!t.cena) return null;
  return t.skidka ? Math.round((t.cena * (100 - t.skidka)) / 1000) * 10 : t.cena;
}

export function cenaText(t) {
  if (t.prodano) return 'Продано';
  const c = cenaSeychas(t);
  if (!c) return 'Цена в WhatsApp';
  return t.skidka ? `${rub(c)}, скидка ${t.skidka}%` : rub(c);
}

// Правки Миланы ложатся на свежий файл с GitHub только по своим полям.
// Так вещь, которую Claude добавил через код, пока Милана правила цены, не пропадает.
export function slit(svezhij, pravki) {
  const out = structuredClone(svezhij);
  for (const t of out.tovary) {
    const p = pravki[t.id];
    if (!p) continue;
    for (const k of POLYA) if (k in p) t[k] = p[k];
  }
  return out;
}

// Проверка правки перед сохранением: понятная причина вместо сломанного файла
export function oshibka(p) {
  if ('cena' in p && p.cena !== null && !(Number.isInteger(p.cena) && p.cena > 0 && p.cena <= 1000000)) return 'Цена: целое число рублей больше нуля';
  if ('skidka' in p && !SKIDKI.includes(p.skidka)) return 'Скидка: выберите из списка';
  if ('hit' in p && typeof p.hit !== 'boolean') return 'Хит: да или нет';
  if ('prodano' in p && typeof p.prodano !== 'boolean') return 'Продано: да или нет';
  return '';
}
