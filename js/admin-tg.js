// Страница Миланы внутри Telegram: мини-приложение «Мой магазин» (кнопка в боте NAFI). Вход без ключа GitHub:
// Telegram кладёт данные входа в адрес страницы (#tgWebAppData=...), бот проверяет подпись (bot/src/prilozhenie.js)
// и сам пишет правки в GitHub. Скрипт Telegram (telegram-web-app.js) не грузим: в России без VPN он не открывается.
// Запросы к боту до 4 КБ: из России без VPN Cloudflare больше не принимает (замер Рамбургера 2026-11-08).

const BOT = 'https://nafi-bot.gmarbigm.workers.dev';
const KOPIYA = 'nafi-tg'; // данные входа на время вкладки: адрес страницы может потерять #
const KUSOK = 1800;       // правки одного запроса без данных входа, знаков

function dannyeVhoda() {
  let d = '';
  try { d = new URLSearchParams(location.hash.slice(1)).get('tgWebAppData') || ''; } catch { /* адрес без данных */ }
  try {
    if (d) sessionStorage.setItem(KOPIYA, d);
    else d = sessionStorage.getItem(KOPIYA) || '';
  } catch { /* хранилище закрыто */ }
  return d;
}

const initData = dannyeVhoda();
// null: страницу открыли в браузере, сохранение ключом GitHub (js/github.js)
export const TG = initData ? { initData } : null;

// Сигналы Telegram, как в telegram-web-app.js: на телефоне TelegramWebviewProxy, в Telegram Web окно-родитель
function signal(tip, dannye) {
  try {
    if (window.TelegramWebviewProxy) window.TelegramWebviewProxy.postEvent(tip, JSON.stringify(dannye || {}));
    else if (window.parent !== window) window.parent.postMessage(JSON.stringify({ eventType: tip, eventData: dannye || {} }), '*');
  } catch { /* не Telegram */ }
}

export function tgStart() {
  document.body.classList.add('adm-telegram');
  const fon = getComputedStyle(document.documentElement).getPropertyValue('--fon').trim();
  if (fon) { signal('web_app_set_header_color', { color: fon }); signal('web_app_set_background_color', { color: fon }); }
  signal('web_app_expand');
  // Список длинный: смахивание вниз листает его, а не сворачивает приложение
  signal('web_app_setup_swipe_behavior', { allow_vertical_swipe: false });
  signal('web_app_ready');
}

export const tgZakryt = () => signal('web_app_close');

const PRICHINY = { 'net-dostupa': 'Нет доступа. Откройте «Мой магазин» из бота NAFI.', proverka: '', bolshoe: 'Слишком много правок сразу. Сохраните частями.' };

// Тело строкой без content-type: браузер не шлёт предварительный запрос
export async function bot(put, telo = {}) {
  let r;
  try {
    r = await fetch(BOT + put, { method: 'POST', body: JSON.stringify({ d: initData, ...telo }) });
  } catch {
    throw new Error('Нет связи с ботом. Проверьте интернет и нажмите ещё раз.');
  }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.tekst || PRICHINY[j.oshibka] || `Бот ответил ${r.status}. Нажмите ещё раз через минуту.`);
  return j;
}

// Сохранение через бота: правки вещей частями, чтобы каждый запрос был маленьким. Общее (акция, категории) первым.
export async function sohranitCherezBota(pravki, obshchee) {
  const kuski = [];
  let p = {};
  const dlina = (x) => JSON.stringify(x).length;
  for (const [id, pr] of Object.entries(pravki)) {
    if (Object.keys(p).length && dlina({ ...p, [id]: pr }) > KUSOK) { kuski.push(p); p = {}; }
    p[id] = pr;
  }
  if (Object.keys(p).length) kuski.push(p);
  if (Object.keys(obshchee).length) await bot('/sohranit', { p: {}, o: obshchee });
  for (const k of kuski) await bot('/sohranit', { p: k, o: {} });
}
