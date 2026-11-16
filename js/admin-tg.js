// Страница Миланы внутри Telegram: мини-приложение «Мой магазин» (кнопка в боте NAFI). Вход без ключа GitHub:
// Telegram кладёт данные входа в адрес страницы (#tgWebAppData=...), бот проверяет подпись (bot/src/prilozhenie.js)
// и сам пишет правки в GitHub. Скрипт Telegram (telegram-web-app.js) не грузим: в России без VPN он не открывается.
// Запросы к адресу бота до 4 КБ: из России без VPN Cloudflare больше не принимает (замер Рамбургера 2026-11-08).
// У Миланы адрес бота не открывается совсем, поэтому главный путь: через Telegram (cherezTelegram).

const BOT = 'https://nafi-bot.gmarbigm.workers.dev';
const KOPIYA = 'nafi-tg'; // данные входа на время вкладки: адрес страницы может потерять #
const KUSOK = 1800;       // правки одного запроса без данных входа, знаков
const TELEGRAM_BAJT = 4096; // sendData: не больше 4096 байт

// Данные Telegram из адреса страницы (#tgWebAppData=...&tgWebAppVersion=...&tgWebAppPlatform=...)
function izAdresa() {
  let h = '';
  try { h = location.hash.slice(1); } catch { /* адрес без данных */ }
  const est = /tgWebApp(Version|Platform|Data)=/.test(h);
  try {
    if (est) sessionStorage.setItem(KOPIYA, h);
    else h = sessionStorage.getItem(KOPIYA) || '';
  } catch { /* хранилище закрыто */ }
  return new URLSearchParams(/tgWebApp/.test(h) ? h : '');
}

const adres = izAdresa();
const initData = adres.get('tgWebAppData') || '';
const vTelegram = adres.has('tgWebAppVersion') || adres.has('tgWebAppPlatform') || !!initData || !!window.TelegramWebviewProxy;
// Открыто кнопкой «Мой магазин» внизу чата: у такого приложения нет query_id, и правки уходят боту через Telegram
// (sendData). Это работает у Миланы в Чечне без VPN, где Cloudflare не открывается (2026-11-16).
// Открыто кнопкой под сообщением или в меню: sendData нет, правки идут на адрес бота (у автора с VPN работает).
const klaviatura = !new URLSearchParams(initData).get('query_id');
// null: страницу открыли в браузере, сохранение ключом GitHub (js/github.js)
export const TG = vTelegram ? { initData, klaviatura } : null;

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

// Через Telegram: приложение закрывается, бот отвечает в чате. Верно: true. Большое: false (сохранить частями).
export function cherezTelegram(dannye) {
  const tekst = JSON.stringify(dannye);
  if (new TextEncoder().encode(tekst).length > TELEGRAM_BAJT) return false;
  signal('web_app_data_send', { data: tekst });
  return true;
}

// Сохранение через адрес бота: правки вещей частями, чтобы каждый запрос был маленьким. Общее (акция, категории) первым.
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
