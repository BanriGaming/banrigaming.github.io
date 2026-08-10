import {
  defaultActivity,
  fetchLatestMedalClip,
  loadActivityData,
  normalizeActivityEntry
} from "./site-store.js";

const PAGE_SIZE = 5;

const state = {
  recent: [],
  archive: [],
  recentPage: 1,
  archivePage: 1
};

async function init() {
  const target = document.getElementById("activityFeedList");
  if (!target) return;

  const clipEntry = await loadLatestClipEntry();

  try {
    const data = await loadActivityData();
    state.recent = [
      ...(clipEntry ? [clipEntry] : []),
      ...(data.recent.length ? data.recent : defaultActivity.map(normalizeActivityEntry))
    ].filter((entry) => entry.enabled !== false);
    state.archive = data.archive.filter((entry) => entry.enabled !== false);
  } catch {
    state.recent = [
      ...(clipEntry ? [clipEntry] : []),
      ...defaultActivity.map(normalizeActivityEntry)
    ];
    state.archive = [];
  }

  render();
  bind();
}

async function loadLatestClipEntry() {
  try {
    const clip = await fetchLatestMedalClip();
    if (!clip?.url) return null;
    const createdAt = Number(new Date(clip.timestamp).getTime()) || Date.now();
    return normalizeActivityEntry({
      id: "latest-medal-clip",
      category: "Clips",
      title: cleanMedalTitle(clip.title || "Latest Medal Clip"),
      message: "Latest public Medal capture went live.",
      date: new Date(createdAt).toISOString().slice(0, 10),
      time: new Date(createdAt).toTimeString().slice(0, 5),
      actorName: "Medal",
      url: clip.url,
      createdAt
    });
  } catch {
    return normalizeActivityEntry({
      id: "latest-medal-unavailable",
      category: "Clips",
      title: "Medal vault unavailable",
      message: "Latest clip data could not be reached from the activity page.",
      actorName: "System",
      createdAt: Date.now()
    });
  }
}

function render() {
  const target = document.getElementById("activityFeedList");
  if (!target) return;

  target.innerHTML = `
    <section class="activity-record-panel panel-frame">
      <div class="activity-record-head">
        <div>
          <p>// Recent Records</p>
          <h2>Last 25 Signals</h2>
        </div>
        <span>${state.recent.length} live record${state.recent.length === 1 ? "" : "s"}</span>
      </div>
      <div class="activity-record-list">
        ${renderPage(state.recent, state.recentPage)}
      </div>
      ${renderPager("recent", state.recentPage, pageCount(state.recent))}
    </section>

    <section class="activity-record-panel panel-frame activity-archive-panel">
      <div class="activity-record-head">
        <div>
          <p>// Archive Vault</p>
          <h2>Older Records</h2>
        </div>
        <span>${state.archive.length} archived</span>
      </div>
      <div class="activity-record-list">
        ${state.archive.length ? renderPage(state.archive, state.archivePage) : '<div class="relay-empty">No archived records yet.</div>'}
      </div>
      ${state.archive.length ? renderPager("archive", state.archivePage, pageCount(state.archive)) : ""}
    </section>
  `;
}

function renderPage(entries, page) {
  const start = (page - 1) * PAGE_SIZE;
  const visible = entries.slice(start, start + PAGE_SIZE);
  return visible.length ? visible.map(renderEntry).join("") : '<div class="relay-empty">No records on this page.</div>';
}

function renderEntry(entry) {
  return `
    <article class="activity-card">
      <div class="activity-card-index">${escapeHtml(entry.category || "Update")}</div>
      <div>
        <h2>${escapeHtml(entry.title || "Activity")}</h2>
        <p>${escapeHtml(entry.message || "")}</p>
        <small>Updated by ${escapeHtml(entry.actorName || "Banri")}</small>
        ${entry.url ? `<a href="${escapeAttr(entry.url)}" target="_blank" rel="noopener">Open Signal <span aria-hidden="true">-&gt;</span></a>` : ""}
      </div>
      <time datetime="${escapeAttr(toDateTime(entry))}">${escapeHtml(formatDateTime(entry))}</time>
    </article>
  `;
}

function renderPager(kind, page, pages) {
  if (pages <= 1) return "";
  return `
    <nav class="activity-pager" aria-label="${kind} activity pages">
      <button type="button" data-activity-page="${kind}" data-page="${Math.max(1, page - 1)}"${page <= 1 ? " disabled" : ""}>Prev</button>
      ${Array.from({ length: pages }, (_, index) => {
        const number = index + 1;
        return `<button type="button" data-activity-page="${kind}" data-page="${number}"${number === page ? ' class="active"' : ""}>${number}</button>`;
      }).join("")}
      <button type="button" data-activity-page="${kind}" data-page="${Math.min(pages, page + 1)}"${page >= pages ? " disabled" : ""}>Next</button>
    </nav>
  `;
}

function bind() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-activity-page]");
    if (!button) return;
    const kind = button.dataset.activityPage;
    const page = Number(button.dataset.page || 1);
    if (kind === "recent") state.recentPage = page;
    if (kind === "archive") state.archivePage = page;
    render();
  });
}

function pageCount(entries) {
  return Math.max(1, Math.ceil(entries.length / PAGE_SIZE));
}

function cleanMedalTitle(title) {
  return String(title)
    .replace(/\s*-\s*Clipped.*$/i, "")
    .trim();
}

function formatDateTime(entry) {
  const date = new Date(entry.createdAt || `${entry.date}T${entry.time || "00:00"}`);
  if (Number.isNaN(date.getTime())) return `${entry.date || "Live"} ${entry.time || ""}`.trim();
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDateTime(entry) {
  const date = new Date(entry.createdAt || `${entry.date}T${entry.time || "00:00"}`);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

init();
