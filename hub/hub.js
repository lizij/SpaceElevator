/* 合集首页：数据由构建器内联到 #se-data，无运行时依赖 */
(function () {
  const dataEl = document.getElementById('se-data');
  const data = JSON.parse(dataEl.textContent || '{}');
  const projects = data.projects || [];

  const promptEl = document.getElementById('prompt-text');
  if (data.prompt && promptEl) promptEl.textContent = data.prompt;
  const countEl = document.getElementById('project-count');
  if (countEl) countEl.textContent = projects.length;

  const grid = document.getElementById('cards');

  const esc = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const arrow = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

  grid.innerHTML = projects
    .map((p, i) => {
      const href = `projects/${p.dir.join('/')}/`;
      const thumb = `thumbs/${p.dir.join('/')}.png`;
      const highlights = (p.highlights || [])
        .map((h) => `<li>${esc(h)}</li>`)
        .join('');
      return `
      <article class="card">
        <a class="card-thumb" href="${href}" aria-label="${esc(p.agent)} × ${esc(p.model)}">
          <img src="${thumb}" alt="" loading="lazy"
               onerror="this.style.display='none';this.nextElementSibling.style.display='flex'" />
          <div class="thumb-fallback" style="display:none">THUMBNAIL PENDING</div>
          <span class="card-idx">No.${String(i + 1).padStart(2, '0')}</span>
        </a>
        <div class="card-body">
          <h2 class="card-title">${esc(p.agent)} × ${esc(p.model)}</h2>
          <div class="badges">
            <span class="badge agent"><span class="k">AGENT</span>&nbsp;${esc(p.agent)}</span>
            <span class="badge model"><span class="k">MODEL</span>&nbsp;${esc(p.model)}</span>
          </div>
          <div class="card-meta">
            <span>${esc(p.date)}</span><span class="dot"></span>
            <span>${esc(p.rounds)}</span>
          </div>
          <ul class="card-highlights">${highlights}</ul>
          <div class="card-stack">${esc(p.stack)}</div>
          <div class="card-cta">
            <a class="btn-enter" href="${href}">进入体验 ${arrow}</a>
            <span class="card-date">${esc(p.date)}</span>
          </div>
        </div>
      </article>`;
    })
    .join('');
})();
