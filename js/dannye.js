// Данные NAFI: вещи лежат в data/tovary.json. Его меняют бот NAFI (новая вещь по фото, правки из мини-приложения),
// страница Миланы с ключом GitHub и Claude через код. Здесь общее для сайта, страницы Миланы, бота (bot/) и проверок (tests/).

export const PUT = 'data/tovary.json';
// Что Милана меняет сама в мини-приложении и на своей странице. Новые вещи и фото идут через бота.
export const POLYA = ['cena', 'skidka', 'hit', 'prodano', 'razmery', 'name', 'kategoriya', 'skryto'];
// Общее для всего магазина: акция (баннер вверху сайта) и список категорий
export const OBSHCHEE = ['akciya', 'kategorii'];
export const AKCIYA_DLINA = 120, IMYA_DLINA = 60;
// Названия вставляются в разметку сайта: знаки разметки в них не пускаем
const ZNAKI = /[<>"&`]/g;
export const chistyj = (s) => String(s || '').replace(ZNAKI, '').replace(/\s+/g, ' ').trim();
const chist = (s) => typeof s === 'string' && s === chistyj(s);
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
// Так вещь, которую бот добавил, пока Милана правила цены, не пропадает. obshchee: акция и категории.
export function slit(svezhij, pravki, obshchee = {}) {
  const out = structuredClone(svezhij);
  for (const t of out.tovary) {
    const p = pravki[t.id];
    if (!p) continue;
    for (const k of POLYA) if (k in p) t[k] = p[k];
  }
  for (const k of OBSHCHEE) if (k in obshchee) out[k] = structuredClone(obshchee[k]);
  return out;
}

// Вещь на сайте: не скрыта Миланой
export const naSajte = (t) => !!t && !t.skryto;
export const kategorii = (d) => d.kategorii || [];
export const akciya = (d) => (d.akciya && d.akciya.vkl && String(d.akciya.tekst || '').trim() ? d.akciya.tekst.trim() : '');

// Возраст словами в месяцы: «3-5 лет», «0-12 мес», «1,5-8 лет», «2 года», «от 3 до 5 лет».
// Верно: { vozrast, ot, do }, иначе null.
export function razobratVozrast(tekst) {
  const s = String(tekst || '').toLowerCase().replace(/ё/g, 'е');
  const ed = /мес/.test(s) ? 1 : /(лет|год)/.test(s) ? 12 : 0;
  const chisla = (s.match(/\d+(?:[.,]\d+)?/g) || []).map((x) => Number(x.replace(',', '.')));
  if (!ed || !chisla.length || chisla.length > 2) return null;
  const [a, b = chisla[0]] = chisla;
  const ot = Math.round(a * ed), dO = Math.round(b * ed);
  if (ot > dO || dO > 216) return null;
  const n = (x) => String(x).replace('.', ',');
  const god = (x) => (x % 1 ? 'года' : x % 10 === 1 && x % 100 !== 11 ? 'год' : x % 10 >= 2 && x % 10 <= 4 && (x % 100 < 12 || x % 100 > 14) ? 'года' : 'лет');
  return { vozrast: a === b ? `${n(a)} ${ed === 1 ? 'мес' : god(a)}` : `${n(a)}-${n(b)} ${ed === 1 ? 'мес' : 'лет'}`, ot, do: dO };
}

// Проверка правки перед сохранением: понятная причина вместо сломанного файла
export function oshibka(p) {
  if ('cena' in p && p.cena !== null && !(Number.isInteger(p.cena) && p.cena > 0 && p.cena <= 1000000)) return 'Цена: целое число рублей больше нуля';
  if ('skidka' in p && !SKIDKI.includes(p.skidka)) return 'Скидка: выберите из списка';
  if ('hit' in p && typeof p.hit !== 'boolean') return 'Хит: да или нет';
  if ('prodano' in p && typeof p.prodano !== 'boolean') return 'Продано: да или нет';
  if ('razmery' in p && !(Array.isArray(p.razmery) && p.razmery.every((r) => RAZMERY.some(([x]) => x === r)))) return 'Размеры: выберите из списка';
  if ('name' in p && !(chist(p.name) && p.name && p.name.length <= IMYA_DLINA)) return `Название: от 1 до ${IMYA_DLINA} знаков`;
  if ('kategoriya' in p && p.kategoriya !== null && !(typeof p.kategoriya === 'string' && /^[a-z0-9-]{1,40}$/.test(p.kategoriya))) return 'Категория: выберите из списка';
  if ('skryto' in p && typeof p.skryto !== 'boolean') return 'Скрыто: да или нет';
  return '';
}

// Проверка акции и списка категорий
export function oshibkaObshchego(o) {
  if ('akciya' in o) {
    const a = o.akciya;
    if (!a || typeof a.vkl !== 'boolean' || typeof a.tekst !== 'string' || a.tekst.length > AKCIYA_DLINA) return `Акция: текст до ${AKCIYA_DLINA} знаков`;
    if (a.vkl && !a.tekst.trim()) return 'Акция: напишите текст';
  }
  if ('kategorii' in o) {
    const k = o.kategorii;
    if (!Array.isArray(k) || k.length > 20) return 'Категории: не больше 20';
    const ids = new Set();
    for (const x of k) {
      if (!x || !/^[a-z0-9-]{1,40}$/.test(x.id) || !chist(x.name) || !x.name || x.name.length > 30 || ids.has(x.id)) return 'Категория: название от 1 до 30 знаков';
      ids.add(x.id);
    }
  }
  return '';
}

// Латиница для id вещи и категории: «Джинсовое платье» → dzhinsovoe-plate
const LAT = { а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'j', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya' };
export function latinica(tekst, zanyato = []) {
  const baza = [...String(tekst).toLowerCase()].map((c) => (c in LAT ? LAT[c] : c)).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 30).replace(/-+$/, '') || 'vesh';
  let id = baza, n = 2;
  while (zanyato.includes(id)) id = `${baza}-${n++}`;
  return id;
}

// Корзина: в телефоне покупателя лежат только id вещи и выбранный размер (r, рост в см или null).
// Цена, «Продано» и размеры в наличии всегда из свежего файла, поэтому правки Миланы сразу видны в корзине.
// Вещи, которой больше нет в файле, нет и в корзине. Проданная вещь и размер, которого больше нет, идут в net.
export function sostav(zapisi, tovary) {
  const vse = zapisi.map(({ id, r }) => ({ t: tovary.find((x) => x.id === id), r: r || null })).filter((z) => naSajte(z.t));
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
