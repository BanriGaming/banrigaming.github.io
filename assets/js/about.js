import {
  loadPublicSiteData,
  normalizeSteamSignal
} from "./site-store.js?v=20260811c";

const panel = document.getElementById("steamSignalPanel");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNumber(value, digits = 0) {
  return Number(value || 0).toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits
  });
}

function formatSyncDate(value) {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime()) || !Number(value)) return "Awaiting first sync";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function renderEmptySignal() {
  panel.innerHTML = `
    <div class="steam-signal-empty">
      <p class="eyebrow-line mb-2">Steam Web API</p>
      <h3>Signal Awaiting First Sync</h3>
      <p>Once the admin console runs the Steam sync, this module will show public Steam profile metrics, total hours, playtime averages, and games grouped by time played.</p>
    </div>
  `;
}

function renderSteamSignal(signal) {
  const steam = normalizeSteamSignal(signal);
  const { profile, summary, buckets } = steam;

  if (!summary.totalGames) {
    renderEmptySignal();
    return;
  }

  const avatar = profile.avatarFull || profile.avatar || "/assets/favicon.svg";
  const playedLabel = `${formatNumber(summary.playedGames)} out of ${formatNumber(summary.totalGames)} games played`;
  const percent = Math.max(0, Math.min(100, Number(summary.playedPercent || 0)));

  panel.innerHTML = `
    <div class="steam-signal-header">
      <a class="steam-avatar" href="${escapeHtml(profile.profileUrl)}" target="_blank" rel="noopener noreferrer">
        <img src="${escapeHtml(avatar)}" alt="${escapeHtml(profile.personaName)} Steam avatar" />
      </a>
      <div>
        <p class="eyebrow-line mb-2">Steam Web API / Public Profile</p>
        <h3>${escapeHtml(profile.personaName || "Banri")}</h3>
        <div class="steam-profile-meta">
          <span>Level ${formatNumber(profile.level)}</span>
          ${profile.accountAgeYears ? `<span>${formatNumber(profile.accountAgeYears, 1)} years</span>` : ""}
          ${profile.countryCode ? `<span>${escapeHtml(profile.countryCode)}</span>` : ""}
        </div>
      </div>
      <a class="btn btn-banri-outline" href="${escapeHtml(profile.profileUrl)}" target="_blank" rel="noopener noreferrer">Open Steam</a>
    </div>

    <div class="steam-progress-block">
      <div class="steam-progress-meta">
        <span>${playedLabel}</span>
        <strong>${formatNumber(percent, 1)}%</strong>
      </div>
      <div class="steam-progress-track" aria-label="${escapeHtml(playedLabel)}">
        <span style="width: ${percent}%"></span>
      </div>
    </div>

    <div class="steam-stat-grid">
      <div>
        <span>Hours on Record</span>
        <strong>${formatNumber(summary.totalHours, 1)}h</strong>
      </div>
      <div>
        <span>Average Playtime</span>
        <strong>${formatNumber(summary.averagePlaytime, 1)}h</strong>
      </div>
      <div>
        <span>Games Played</span>
        <strong>${formatNumber(summary.playedGames)}</strong>
      </div>
      <div>
        <span>Never Played</span>
        <strong>${formatNumber(summary.neverPlayedGames)}</strong>
      </div>
    </div>

    <div class="steam-bucket-panel">
      <div class="admin-card-heading">
        <span>Games by Time Played</span>
        <small>Synced ${escapeHtml(formatSyncDate(summary.syncedAt))}</small>
      </div>
      <div class="steam-bucket-list">
        ${buckets.map((bucket) => `
          <div>
            <span>${escapeHtml(bucket.label)}</span>
            <strong>${formatNumber(bucket.count)}</strong>
          </div>
        `).join("")}
      </div>
    </div>
  `;
}

async function initSteamSignal() {
  if (!panel) return;

  try {
    const data = await loadPublicSiteData();
    renderSteamSignal(data.steamSignal);
  } catch (error) {
    panel.innerHTML = `
      <div class="steam-signal-empty">
        <p class="eyebrow-line mb-2">Steam Web API</p>
        <h3>Signal Offline</h3>
        <p>${escapeHtml(error.message || "Steam metrics could not be loaded yet.")}</p>
      </div>
    `;
  }
}

initSteamSignal();
