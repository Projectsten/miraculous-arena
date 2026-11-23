/* Архив персонажей: каталог с поиском и страница анкеты.
   Данные: data/characters.json. Новый персонаж = новая запись в JSON.
   Страница персонажа ищется автоматически: pages/characters/<id>/index.html.
   Если такой папки нет, открывается стандартная анкета (character.html). */
(function () {
  const DATA = '../data/characters.json';
  const page = document.body.dataset.page;

  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  };
  const setPalette = (node, p) => {
    if (!p) return;
    node.style.setProperty('--c1', p.primary);
    node.style.setProperty('--c2', p.secondary);
  };
  const load = async () => {
    const r = await fetch(DATA);
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return (await r.json()).characters || [];
  };
  /* Путь к презентации строится по id (относительно папки pages/).
     Необязательное поле "page" в JSON позволяет задать другой путь. */
  const presentationUrl = (c) => c.page || 'characters/' + c.id + '/index.html';
  const fallbackUrl = (c) => 'character.html?id=' + encodeURIComponent(c.id);
  const cache = {};
  const hasPresentation = (c) => {
    const u = presentationUrl(c);
    if (!(u in cache)) {
      const ok = c.page || /^[a-z0-9-]+$/.test(c.id);
      cache[u] = ok ? fetch(u, { method: 'HEAD' }).then((r) => r.ok).catch(() => false) : Promise.resolve(false);
    }
    return cache[u];
  };
  const fail = (box) => {
    box.replaceChildren(el('p', 'empty', 'Не удалось загрузить данные. Если вы открыли сайт как файл, запустите его через локальный сервер или GitHub Pages.'));
  };

  async function catalog() {
    const grid = document.getElementById('grid');
    const count = document.getElementById('count');
    const search = document.getElementById('search');
    let list;
    try { list = await load(); } catch (e) { fail(grid); return; }

    const render = () => {
      const q = search.value.trim().toLowerCase();
      const shown = list.filter((c) => !q || [c.name].concat(c.aliases || []).join(' ').toLowerCase().includes(q));
      grid.replaceChildren(...shown.map((c) => {
        const a = el('a', 'card');
        a.href = fallbackUrl(c);
        setPalette(a, c.palette);
        const note = el('small', null, c.fields && c.fields.length ? 'Анкета' : 'Анкета готовится');
        a.append(el('h2', null, c.name), note);
        hasPresentation(c).then((ok) => { if (ok) { a.href = presentationUrl(c); note.textContent = 'Презентация'; } });
        return a;
      }));
      count.textContent = shown.length ? 'Найдено: ' + shown.length : 'Ничего не найдено. Попробуйте другое имя.';
    };
    search.addEventListener('input', render);
    render();
  }

  async function profile() {
    const box = document.getElementById('profile');
    const back = box.querySelector('.back');
    let list;
    try { list = await load(); } catch (e) { box.replaceChildren(back, el('p', 'empty', 'Не удалось загрузить данные.')); return; }
    const id = new URLSearchParams(location.search).get('id');
    const c = list.find((x) => x.id === id);
    if (!c) { box.replaceChildren(back, el('p', 'empty', 'Такой анкеты нет. Вернитесь в архив и выберите персонажа.')); return; }

    if (await hasPresentation(c)) { location.replace(presentationUrl(c)); return; }
    setPalette(document.body, c.palette);
    document.title = c.name + ' — Miraculous Arena';
    const out = [back, el('h1', null, c.name)];
    if (c.aliases && c.aliases.length) out.push(el('p', 'aliases', c.aliases.join(', ')));
    if (c.summary) out.push(el('p', 'summary', c.summary));
    const rows = (c.fields || []).filter((f) => f.label && f.value);
    if (rows.length) {
      const dl = el('dl', 'bio');
      rows.forEach((f) => { const d = el('div'); d.append(el('dt', null, f.label), el('dd', null, f.value)); dl.append(d); });
      out.push(dl);
    } else {
      out.push(el('p', 'note', 'Анкета готовится. Данные появятся после проверки по официальным источникам.'));
    }
    box.replaceChildren(...out);
  }

  if (page === 'catalog') catalog();
  if (page === 'profile') profile();
})();
