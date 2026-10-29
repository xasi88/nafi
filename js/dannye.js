// Данные NAFI: вещи лежат в data/tovary.json. Его меняют страница Миланы (admin.html, цена, скидка, хит, продано)
// и Claude через код (новые вещи). Здесь общее для сайта, страницы Миланы и проверок (tests/).

export const PUT = 'data/tovary.json';
// Что Милана меняет сама. Остальное (новые вещи, фото, названия) идёт через код.
export const POLYA = ['cena', 'skidka', 'hit', 'prodano', 'razmery'];
export const SKIDKI = [0, 5, 10, 15, 20, 25, 30, 40, 50];

// Размер: рост в сантиметрах и возраст в месяцах, с которого он обычно подходит
export const RAZMERY = [[56, 0], [62, 1], [68, 3], [74, 6], [80, 9], [86, 12], [92, 18], [98, 24], [104, 36], [110, 48],
  [116, 60], [122, 72], [128, 84], [134, 96], [140, 108], [146, 120], [152, 132], [158, 144], [164, 156]];

// Размеры в наличии: отмечает Милана. Нет отметок: карточка без выбора размера.
export const razmery = (t) => t.razmery || [];

// Размеры, которые подходят возрасту вещи: из них Милана отмечает те, что есть
export function razmeryVozrasta(t) {
  return RAZMERY.filter(([, s], i) => s <= t.do && (RAZMERY[i + 1]?.[1] ?? 999) >= t.ot).map(([r]) => r);
}

export async function zagruzit(put = PUT) {
  const r = await fetch(put, { cache: 'no-cache' });
  if (!r.ok) throw new Error(`Нет файла ${put}`);
  return r.json();
}

// Неразрывный пробел: «₽» не уходит на новую строку без числа
export const rub = (n) => n.toLocaleString('ru-RU') + '\u00a0₽';

// WhatsApp магазина (шапка Instagram NAFI). Любой заказ уходит сюда готовым сообщением.
export const WA = '79280080809';
export const waUrl = (msg) => `https://wa.me/${WA}?text=${encodeURIComponent(msg)}`;

export function veshchej(n) {
  const d = n % 10, s = n % 100;
  if (d === 1 && s !== 11) return `${n} вещь`;
  if (d >= 2 && d <= 4 && (s < 12 || s > 14)) return `${n} вещи`;
  return `${n} вещей`;
}

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
  if ('razmery' in p && !(Array.isArray(p.razmery) && p.razmery.every((r) => RAZMERY.some(([x]) => x === r)))) return 'Размеры: выберите из списка';
  return '';
}

// Корзина: в телефоне покупателя лежат только id вещи и выбранный размер (r, рост в см или null).
// Цена, «Продано» и размеры в наличии всегда из свежего файла, поэтому правки Миланы сразу видны в корзине.
// Вещи, которой больше нет в файле, нет и в корзине. Проданная вещь и размер, которого больше нет, идут в net.
export function sostav(zapisi, tovary) {
  const vse = zapisi.map(({ id, r }) => ({ t: tovary.find((x) => x.id === id), r: r || null })).filter((z) => z.t);
  const nelzya = (z) => z.t.prodano || (z.r && !razmery(z.t).includes(z.r));
  return { est: vse.filter((z) => !nelzya(z)), net: vse.filter(nelzya) };
}

// Сумма вещей с ценой и сколько вещей без цены
export function itogo(est) {
  const ceny = est.map((z) => cenaSeychas(z.t));
  return { summa: ceny.reduce((s, c) => s + (c || 0), 0), bezCeny: ceny.filter((c) => !c).length };
}

// Заказ в WhatsApp: каждая вещь с размером (или возрастом) и ценой, итог. Есть вещь без размера: вопрос о размерах.
export function soobshchenie(est) {
  const stroki = est.map(({ t, r }, i) => {
    const c = cenaSeychas(t);
    return `${i + 1}. ${t.name}, ${r ? `размер ${r}` : t.vozrast}, ${c ? rub(c) + (t.skidka ? ` (скидка ${t.skidka}%)` : '') : 'цена в WhatsApp'}`;
  });
  const { summa, bezCeny } = itogo(est);
  const itog = summa ? [`Итого: ${rub(summa)}${bezCeny ? `, ещё ${veshchej(bezCeny)} без цены` : ''}`] : [];
  const vopros = est.some((z) => !z.r) ? ['Какие размеры есть?'] : [];
  return ['Здравствуйте! Хочу заказать в NAFI:', ...stroki, ...itog, ...vopros].join(String.fromCharCode(10));
}
