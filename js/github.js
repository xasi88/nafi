// Страница Миланы: запись в GitHub. Сайт лежит на GitHub Pages, новый коммит сам выкладывает новые цены.
// Ключ доступа хранится только в браузере телефона Миланы. В коде и в git его нет. Образец: меню «Катар».
const API = 'https://api.github.com';

// Открытый репозиторий сайта. На xasi88.github.io/nafi берётся из адреса.
export function repo() {
  const m = location.hostname.match(/^([\w-]+)\.github\.io$/);
  const path = location.pathname.split('/').filter(Boolean)[0];
  return m && path && !/\.html$/.test(path) ? { owner: m[1], name: path, branch: 'main' } : { owner: 'xasi88', name: 'nafi', branch: 'main' };
}

async function req(klyuch, method, path, body) {
  const r = repo();
  let res;
  try {
    res = await fetch(`${API}/repos/${r.owner}/${r.name}${path}`, {
      method,
      headers: { Authorization: `Bearer ${klyuch}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
      body: body ? JSON.stringify(body) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new Error('Нет связи с GitHub. Проверьте интернет и нажмите ещё раз.');
  }
  if (!res.ok) {
    const why = { 401: 'ключ неверный или истёк', 403: 'у ключа нет права на запись', 404: 'сайт не найден или ключ не даёт к нему доступа', 409: 'сайт занят, нажмите ещё раз', 422: 'GitHub не принял данные' }[res.status];
    throw new Error(why ? `GitHub: ${why}` : `GitHub ответил ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Ключ работает и даёт право записи
export async function proverit(klyuch) {
  const info = await req(klyuch, 'GET', '');
  if (info.permissions && !info.permissions.push) throw new Error('GitHub: у ключа нет права на запись');
  return info.full_name;
}

// Свежий файл прямо из репозитория, без задержки GitHub Pages
export async function prochitat(klyuch, path) {
  const f = await req(klyuch, 'GET', `/contents/${path}?ref=${repo().branch}`);
  const bytes = Uint8Array.from(atob(f.content.replace(/\n/g, '')), (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

// Один коммит с одним файлом
export async function zapisat(klyuch, path, text, message) {
  const r = repo();
  const ref = await req(klyuch, 'GET', `/git/ref/heads/${r.branch}`);
  const head = await req(klyuch, 'GET', `/git/commits/${ref.object.sha}`);
  const blob = await req(klyuch, 'POST', '/git/blobs', { content: text, encoding: 'utf-8' });
  const t = await req(klyuch, 'POST', '/git/trees', { base_tree: head.tree.sha, tree: [{ path, mode: '100644', type: 'blob', sha: blob.sha }] });
  const c = await req(klyuch, 'POST', '/git/commits', { message, tree: t.sha, parents: [ref.object.sha] });
  await req(klyuch, 'PATCH', `/git/refs/heads/${r.branch}`, { sha: c.sha });
  return c.sha;
}
