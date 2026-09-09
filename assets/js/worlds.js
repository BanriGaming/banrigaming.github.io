import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirebaseServices,
  isAdminUid,
  loadServerControllerConfig,
  loadWorldServers,
  normalizeServerControllerConfig,
  normalizeWorldServer
} from "./site-store.js?v=20260909b";

const { auth } = getFirebaseServices();
let currentUser = null;
let currentServers = [];
let controllerConfig = normalizeServerControllerConfig();
let controllerSnapshot = null;
let controllerPollTimer = 0;
let controllerBusy = "";
let controllerMessage = "";
let controllerAllowed = false;
let controllerStatusAvailable = false;
const SERVER_WARMUP_MS = 180000;
const SERVER_WARMUP_CLOSE_MS = 1400;
let serverWarmupTimer = 0;
let serverWarmupCloseTimer = 0;
let serverWarmupState = null;
const revealedPasswords = new Set();

const elements = {
  locked: document.getElementById("worldsLocked"),
  app: document.getElementById("worldsApp"),
  grid: document.getElementById("worldsGrid"),
  summary: document.getElementById("worldsSummary"),
  total: document.getElementById("worldsTotalCount"),
  online: document.getElementById("worldsOnlineCount"),
  steam: document.getElementById("worldsSteamCount"),
  tabs: document.querySelectorAll("[data-worlds-view]"),
  panels: document.querySelectorAll("[data-worlds-panel]"),
  controllerTab: document.getElementById("worldsControllerTab"),
  controllerPanel: document.getElementById("worldsControllerPanel"),
  controllerSummary: document.getElementById("worldsControllerSummary"),
  controllerRefresh: document.getElementById("worldsControllerRefresh"),
  controllerGrid: document.getElementById("worldsControllerGrid")
};

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

function setText(element, value) {
  if (element) element.textContent = value || "";
}

async function copyTextToClipboard(value) {
  const text = String(value || "");
  if (!text) return;
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function showLocked() {
  stopControllerPolling();
  elements.locked?.classList.remove("d-none");
  elements.app?.classList.add("d-none");
}

function showApp() {
  elements.locked?.classList.add("d-none");
  elements.app?.classList.remove("d-none");
}

function setWorldsView(view) {
  const safeView = view === "controller" && !elements.controllerTab?.classList.contains("d-none") ? "controller" : "registry";
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.worldsView === safeView;
    tab.classList.toggle("active", active);
    tab.setAttribute("aria-selected", active ? "true" : "false");
  });
  elements.panels.forEach((panel) => {
    panel.classList.toggle("d-none", panel.dataset.worldsPanel !== safeView);
  });
}

function getControllerServer(server = {}) {
  if (server.statusSource !== "blackbox" || !server.controllerServerId) return null;
  return (controllerSnapshot?.servers || []).find((item) => item.id === server.controllerServerId) || null;
}

function statusFromController(status = "") {
  if (status === "running") return "Online";
  if (status === "missing") return "Missing";
  return "Offline";
}

function formatServerStatus(server) {
  const controllerServer = getControllerServer(server);
  if (controllerServer) return statusFromController(controllerServer.status);
  return String(server.status || "Online").trim() || "Online";
}

function getStatusTone(status = "") {
  if (status === "Online") return "online";
  if (status === "Missing") return "missing";
  return "offline";
}

function clampLiveNumber(value, min = 0, max = 9999) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function getServerActivity(server, displayStatus) {
  if (displayStatus !== "Online") return 0;
  if (server.playersMax > 0 && server.playersOnline > 0) {
    return Math.max(0, Math.min(100, Math.round((server.playersOnline / server.playersMax) * 100)));
  }
  return server.playersOnline > 0 ? 100 : 0;
}

function getConnectionRecordCount(server = {}) {
  return [server.steamAddress, server.password].filter(Boolean).length;
}

function getActivityLabel(level = 0, status = "") {
  if (status === "Missing") return "Missing";
  if (level >= 80) return "High";
  if (level >= 55) return "Active";
  if (level >= 25) return "Steady";
  if (level > 0) return "Quiet";
  return "No activity";
}

function renderActivitySegments(level = 0) {
  const activeSegments = Math.ceil(Math.max(0, Math.min(100, Number(level || 0))) / 20);
  return Array.from({ length: 5 }, (_, segment) => `<i class="${segment < activeSegments ? "is-active" : ""}"></i>`).join("");
}

function sortWorldServers(a, b) {
  const rank = { Online: 0, Offline: 1, Missing: 2 };
  const statusRank = (rank[a.displayStatus] ?? 3) - (rank[b.displayStatus] ?? 3);
  if (statusRank) return statusRank;
  return Number(a.order || 0) - Number(b.order || 0) || a.title.localeCompare(b.title);
}

function decorateServer(server) {
  const normalized = normalizeWorldServer(server);
  const controllerServer = getControllerServer(normalized);
  const displayStatus = controllerServer ? statusFromController(controllerServer.status) : formatServerStatus(normalized);
  const liveState = controllerServer?.status || (displayStatus === "Online" ? "running" : displayStatus === "Missing" ? "missing" : "stopped");
  const playersOnline = clampLiveNumber(controllerServer?.playersOnline ?? controllerServer?.numplayers ?? normalized.playersOnline);
  const playersMax = clampLiveNumber(controllerServer?.playersMax ?? controllerServer?.maxplayers ?? normalized.playersMax);
  const activityLevel = getServerActivity({
    ...normalized,
    playersOnline,
    playersMax,
    activityLevel: controllerServer?.activityLevel ?? normalized.activityLevel
  }, displayStatus);
  return {
    ...normalized,
    controllerStatus: controllerServer?.status || "",
    displayStatus,
    liveState,
    playersOnline,
    playersMax,
    playerNames: Array.isArray(controllerServer?.playerNames)
      ? controllerServer.playerNames.map((name) => String(name || "").trim()).filter(Boolean).slice(0, 8)
      : normalized.playerNames || [],
    playerQueryStatus: controllerServer?.playerQueryStatus || normalized.playerQueryStatus || "",
    playerQueryError: controllerServer?.playerQueryError || normalized.playerQueryError || "",
    playerQueryUpdatedAt: controllerServer?.playerQueryUpdatedAt || normalized.playerQueryUpdatedAt || 0,
    activityLevel
  };
}

function updateWorldMetrics() {
  const online = currentServers.filter((server) => server.displayStatus === "Online").length;
  const connectionRecords = currentServers.reduce((total, server) => total + getConnectionRecordCount(server), 0);
  setText(elements.total, `${currentServers.length} world${currentServers.length === 1 ? "" : "s"}`);
  setText(elements.online, `${online} online`);
  setText(elements.steam, `${connectionRecords} connection record${connectionRecords === 1 ? "" : "s"}`);
  setText(elements.summary, `${currentServers.length} hosted world${currentServers.length === 1 ? "" : "s"} synced`);
}

function renderConnectionLine(label, value, rawValue = "", rawLabel = "Copy Raw") {
  if (!value) return "";
  return `
    <div class="worlds-connection-line">
      <span>${escapeHtml(label)}</span>
      <code>${escapeHtml(value)}</code>
      <button type="button" data-copy-world-server="${escapeAttr(value)}" data-copy-world-label="Copy">Copy</button>
      ${rawValue ? `<button type="button" data-copy-world-server="${escapeAttr(rawValue)}" data-copy-world-label="${escapeAttr(rawLabel)}">${escapeHtml(rawLabel)}</button>` : ""}
    </div>
  `;
}

function renderPasswordLine(server) {
  if (!server.password) return "";
  const revealed = revealedPasswords.has(server.id);
  return `
    <div class="worlds-connection-line worlds-password-line" data-world-password="${escapeAttr(server.id)}" data-world-password-value="${escapeAttr(server.password)}">
      <span>Server Password</span>
      <code>${revealed ? escapeHtml(server.password) : "************"}</code>
      <button type="button" data-reveal-world-password="${escapeAttr(server.id)}">${revealed ? "Hide" : "Reveal"}</button>
      <button type="button" data-copy-world-server="${escapeAttr(server.password)}" data-copy-world-label="Copy">Copy</button>
    </div>
  `;
}

function renderServerGrid() {
  if (!elements.grid) return;
  elements.grid.innerHTML = currentServers.length
    ? currentServers.map((server, index) => renderServerCard(server, index, index < 2)).join("")
    : '<div class="panel-frame placeholder-panel"><p class="banri-modal-kicker">No Signals</p><h2>No hosted worlds are published yet.</h2></div>';
}

function renderServerCard(server, index, isFeatured = false) {
  const tags = (server.tags || []).slice(0, 5);
  const playersOnline = Math.max(0, Number(server.playersOnline || 0));
  const playerLabel = String(playersOnline);
  const queryFailed = server.playerQueryStatus === "query_failed";
  const activityLabel = queryFailed ? "Query issue" : getActivityLabel(server.activityLevel, server.displayStatus);
  const hasMemberSignal = playersOnline > 0;
  const rankLabel = hasMemberSignal ? `#${String(index + 1).padStart(2, "0")}` : "Not Ranked";
  const updated = server.playerQueryUpdatedAt
    ? formatControllerTime(server.playerQueryUpdatedAt)
    : server.updatedAt ? formatControllerTime(server.updatedAt) : "Firebase";
  const statusTone = getStatusTone(server.displayStatus);
  const activityTone = queryFailed ? "missing" : hasMemberSignal ? "online" : "offline";
  const host = server.host || "Private";
  const signalLabel = queryFailed ? "Player Query Needs Attention" : hasMemberSignal ? "Members Playing Now" : "No Current Member Activity";
  const playerNames = Array.isArray(server.playerNames) ? server.playerNames.slice(0, 5) : [];

  return `
    <article id="${escapeAttr(server.id)}" class="world-server-card ${isFeatured ? "world-server-card-featured" : "world-server-card-compact"} is-${escapeAttr(statusTone)}" style="--server-image: url('${escapeAttr(server.image)}')">
      <div class="world-server-card-media" aria-hidden="true"></div>
      <div class="world-server-card-body">
        <section class="world-server-copy">
          <div class="world-server-rank">
            <span>Community Member Activity Rank</span>
            <strong>${escapeHtml(rankLabel)}</strong>
          </div>

          <header class="world-server-card-head">
            <p><span>${String(index + 1).padStart(2, "0")}</span> Hosted World / ${escapeHtml(server.game)}</p>
            <strong>${escapeHtml(server.title)}</strong>
            <small>${escapeHtml(host)} hosted server</small>
          </header>

          <p class="world-server-description">${escapeHtml(server.description)}</p>

          ${tags.length ? `<div class="world-server-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        </section>

        <aside class="world-server-live-panel ${hasMemberSignal ? "has-players" : "has-no-players"} ${queryFailed ? "has-query-error" : ""}" aria-label="${escapeAttr(server.title)} live server signal">
          <div>
            <p><i class="server-status-dot ${escapeAttr(activityTone)}"></i>${escapeHtml(signalLabel)}</p>
            <div class="world-server-live-counts">
              <span><strong>${escapeHtml(playerLabel)}</strong><em>Players</em></span>
            </div>
            <div class="world-server-player-list">
              ${playerNames.length
                ? playerNames.map((name) => `<span>${escapeHtml(name)}</span>`).join("")
                : `<span>${queryFailed ? escapeHtml(server.playerQueryError || "Check query type, host, and port") : playersOnline > 0 ? "Players connected" : "No players connected"}</span>`}
            </div>
          </div>

          <div class="world-server-activity">
            <div>
              <span>Community Signal</span>
              <strong>${escapeHtml(activityLabel)}</strong>
            </div>
            <div class="world-server-signal-bars" aria-hidden="true">${renderActivitySegments(server.activityLevel)}</div>
          </div>

          <footer class="world-server-live-footer">
            <small>Updated ${escapeHtml(updated)}</small>
            <button class="btn btn-banri-outline" type="button" data-world-details="${escapeAttr(server.id)}">Details</button>
          </footer>
        </aside>
      </div>
    </article>
  `;
}

function ensureDetailsModal() {
  let modal = document.getElementById("worldServerDetailsModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "worldServerDetailsModal";
  modal.className = "modal fade banri-login-modal worlds-details-modal";
  modal.tabIndex = -1;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-xl">
      <div class="modal-content">
        <div class="modal-header">
          <div>
            <p class="banri-modal-kicker mb-1">World Server Record</p>
            <h2 class="modal-title" id="worldServerDetailsTitle">Hosted World</h2>
          </div>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div id="worldServerDetailsBody" class="modal-body banri-login-form"></div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function openServerDetails(serverId) {
  const server = currentServers.find((item) => item.id === serverId);
  if (!server) return;
  const modal = ensureDetailsModal();
  const title = modal.querySelector("#worldServerDetailsTitle");
  const body = modal.querySelector("#worldServerDetailsBody");
  if (title) title.textContent = server.title;
  if (body) body.innerHTML = renderServerDetails(server);
  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function renderServerDetails(server) {
  const steamAddress = server.steamAddress || "";
  const rules = server.rules || [];
  return `
    <div class="world-server-details">
      <div class="world-server-details-art">
        <img src="${escapeAttr(server.image)}" alt="" loading="lazy" />
      </div>
      <section>
        <div class="world-server-momentum">
          <span>Status <strong>${escapeHtml(server.displayStatus)}</strong></span>
          <span>Host <strong>${escapeHtml(server.host || "Private")}</strong></span>
          <span>Region <strong>${escapeHtml(server.region || "Hidden")}</strong></span>
        </div>
        <p class="world-server-description mt-3">${escapeHtml(server.description)}</p>
        ${server.notes ? `<p class="world-server-notes mt-3">${escapeHtml(server.notes)}</p>` : ""}
        ${rules.length ? `
          <ul class="server-rule-list mt-3">
            ${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
        </ul>
        ` : ""}
        <div class="worlds-connection-stack mt-3">
          ${renderConnectionLine("Steam IPv4", steamAddress, server.steamAddress, "Copy IP")}
          ${renderPasswordLine(server)}
        </div>
      </section>
    </div>
  `;
}

async function renderWorlds() {
  showApp();
  setText(elements.summary, "Loading hosted worlds...");

  try {
    currentServers = (await loadWorldServers())
      .map(normalizeWorldServer)
      .filter((server) => server.enabled !== false)
      .map(decorateServer)
      .sort(sortWorldServers);

    updateWorldMetrics();
    renderServerGrid();
  } catch (error) {
    setText(elements.summary, "World sync failed");
    if (elements.grid) {
      elements.grid.innerHTML = `<div class="panel-frame placeholder-panel"><p class="banri-modal-kicker">Firebase Relay</p><h2>${escapeHtml(error.message || "Could not load hosted worlds.")}</h2></div>`;
    }
  }
}

async function loadControllerForUser() {
  stopControllerPolling();
  controllerConfig = normalizeServerControllerConfig(await loadServerControllerConfig());
  const userIsAdmin = currentUser?.uid ? await isAdminUid(currentUser.uid).catch(() => false) : false;
  controllerStatusAvailable = controllerConfig.enabled && Boolean(controllerConfig.apiUrl) && Boolean(currentUser);
  controllerAllowed = controllerStatusAvailable && (controllerConfig.allowedUids?.[currentUser?.uid] === true || userIsAdmin);

  elements.controllerTab?.classList.toggle("d-none", !controllerAllowed);
  if (!controllerStatusAvailable) {
    setWorldsView("registry");
    controllerSnapshot = null;
    renderControllerPanel();
    return;
  }

  renderControllerPanel();
  if (controllerAllowed && window.location.hash === "#controller") setWorldsView("controller");
  if (!controllerAllowed) setWorldsView("registry");
  await refreshControllerStatus({ silent: !controllerAllowed });
  startControllerPolling();
}

function startControllerPolling() {
  stopControllerPolling();
  if (!controllerStatusAvailable) return;
  controllerPollTimer = window.setInterval(() => {
    if (!controllerBusy) refreshControllerStatus({ silent: true }).catch(() => {});
  }, controllerConfig.pollSeconds * 1000);
}

function stopControllerPolling() {
  if (controllerPollTimer) window.clearInterval(controllerPollTimer);
  controllerPollTimer = 0;
}

async function refreshControllerStatus({ silent = false } = {}) {
  if (!controllerStatusAvailable) return;
  if (!silent) controllerMessage = "Contacting Blackbox controller...";
  renderControllerPanel();

  try {
    controllerSnapshot = await controllerRequest("/api/servers");
    controllerMessage = `Controller synced ${formatControllerTime(controllerSnapshot.updatedAt)}.`;
  } catch (error) {
    controllerMessage = error.message || "Controller status could not be loaded.";
  }

  renderControllerPanel();
  if (currentServers.length) {
    currentServers = currentServers.map(decorateServer);
    currentServers.sort(sortWorldServers);
    updateWorldMetrics();
    renderServerGrid();
  }
}

async function controllerRequest(path, options = {}) {
  if (!controllerConfig.apiUrl) throw new Error("Controller API URL is not configured.");
  const token = await currentUser.getIdToken();
  const response = await fetch(`${controllerConfig.apiUrl}${path}`, {
    ...options,
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data.ok === false) {
    throw new Error(data.message || data.error || `Controller returned ${response.status}.`);
  }
  return data;
}

function renderControllerPanel() {
  if (!elements.controllerGrid) return;
  setText(elements.controllerSummary, controllerMessage || (controllerAllowed ? "Awaiting controller status..." : "Controller is not enabled for this account."));
  if (elements.controllerRefresh) elements.controllerRefresh.disabled = Boolean(controllerBusy) || !controllerAllowed;

  if (!controllerAllowed) {
    elements.controllerGrid.innerHTML = `
      <div class="panel-frame placeholder-panel">
        <p class="banri-modal-kicker">No Clearance</p>
        <h2>Controller relay locked.</h2>
      </div>
    `;
    return;
  }

  const servers = controllerSnapshot?.servers || [];
  if (!servers.length) {
    elements.controllerGrid.innerHTML = `
      <div class="panel-frame placeholder-panel">
        <p class="banri-modal-kicker">Blackbox Signal</p>
        <h2>${escapeHtml(controllerMessage || "No controller status has been loaded yet.")}</h2>
      </div>
    `;
    return;
  }

  const sortedServers = [...servers].sort((a, b) => {
    const statusRank = (a.status === "running" ? 0 : a.status === "missing" ? 2 : 1) - (b.status === "running" ? 0 : b.status === "missing" ? 2 : 1);
    return statusRank || Number(a.order || 0) - Number(b.order || 0) || a.label.localeCompare(b.label);
  });
  const running = sortedServers.filter((server) => server.status === "running").length;
  const stopped = sortedServers.filter((server) => server.status === "stopped").length;
  const missing = sortedServers.filter((server) => server.status === "missing").length;
  const active = sortedServers.find((server) => server.status === "running");
  const updated = controllerSnapshot?.updatedAt ? formatControllerTime(controllerSnapshot.updatedAt) : "Awaiting sync";

  elements.controllerGrid.innerHTML = `
    <div class="server-controller-shell">
      <aside class="server-controller-rail">
        <div class="server-controller-brand">
          <span aria-hidden="true">Blackbox</span>
          <strong>Blackbox<br />Control</strong>
        </div>
        <div class="server-controller-rail-status">
          <span class="server-status-dot ${running ? "online" : "offline"}"></span>
          <div>
            <strong>Controller</strong>
            <small>${running ? "Online" : "Standing By"}</small>
          </div>
        </div>
      </aside>
      <section class="server-controller-stage">
        <div class="server-controller-status-strip" aria-label="Controller status overview">
          <span><i class="server-controller-icon icon-total"></i><strong>${sortedServers.length}</strong><em>Total Servers</em></span>
          <span><i class="server-controller-icon icon-running is-running"></i><strong>${running}</strong><em>Running</em></span>
          <span><i class="server-controller-icon icon-stopped is-stopped"></i><strong>${stopped}</strong><em>Stopped</em></span>
          <span><i class="server-controller-icon icon-sync"></i><strong>${escapeHtml(updated)}</strong><em>Last Sync</em></span>
        </div>
        ${active
          ? `<p class="server-controller-active-signal"><span class="server-status-dot online"></span>Active server: <strong>${escapeHtml(active.label)}</strong>${missing ? `<small>${missing} missing from Docker</small>` : ""}</p>`
          : `<p class="server-controller-active-signal"><span class="server-status-dot offline"></span>No server is currently running.${missing ? ` <small>${missing} missing from Docker</small>` : ""}</p>`}
        <div class="server-controller-cards">
          ${sortedServers.map(renderControllerCard).join("")}
        </div>
      </section>
    </div>
  `;
}

function renderControllerCard(server) {
  const isRunning = server.status === "running";
  const isMissing = server.status === "missing";
  const busy = controllerBusy === server.id;
  const activeServer = controllerSnapshot?.activeServer || "";
  const startLabel = activeServer && activeServer !== server.id ? "Switch" : "Start";
  const statusTone = isRunning ? "online" : isMissing ? "missing" : "offline";
  return `
    <article class="server-control-card is-${escapeAttr(statusTone)} ${isRunning ? "is-running" : ""} ${isMissing ? "is-missing" : ""}">
      ${isRunning ? '<span class="server-control-active-tag">Active Server</span>' : ""}
      <div class="server-control-sigil" aria-hidden="true"><span></span></div>
      <div class="server-control-main">
        <p class="banri-modal-kicker">${escapeHtml(server.id)}</p>
        <h3>${escapeHtml(server.label)}</h3>
        <span class="server-control-container">${escapeHtml(server.container)}</span>
      </div>
      <div class="server-control-command">
        <strong class="server-control-status"><i class="server-status-dot ${statusTone}"></i>${escapeHtml(formatControllerStatus(server.status))}</strong>
        <div class="server-control-actions">
          <button class="btn btn-banri-primary btn-sm server-control-button" type="button" data-controller-action="start" data-controller-server="${escapeAttr(server.id)}" ${busy || isRunning || isMissing ? "disabled" : ""}>${busy ? "Working" : startLabel}</button>
          <button class="btn btn-banri-outline btn-sm server-control-button" type="button" data-controller-action="restart" data-controller-server="${escapeAttr(server.id)}" ${busy || isMissing ? "disabled" : ""}>Restart</button>
          <button class="btn btn-banri-danger btn-sm server-control-button" type="button" data-controller-action="stop" data-controller-server="${escapeAttr(server.id)}" ${busy || !isRunning || isMissing ? "disabled" : ""}>Stop</button>
        </div>
      </div>
    </article>
  `;
}

function formatControllerStatus(status) {
  return {
    running: "Running",
    stopped: "Stopped",
    missing: "Missing"
  }[status] || "Unknown";
}

function formatControllerTime(value) {
  const date = new Date(Number(value || Date.now()));
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit"
  }).format(date);
}

function ensureSwitchConfirmModal() {
  let modal = document.getElementById("worldServerSwitchConfirmModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "worldServerSwitchConfirmModal";
  modal.className = "modal fade banri-login-modal worlds-confirm-modal";
  modal.tabIndex = -1;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered">
      <div class="modal-content panel-frame">
        <div class="modal-header">
          <div>
            <p class="banri-modal-kicker">Blackbox Relay</p>
            <h2 class="modal-title">Switch Hosted World</h2>
          </div>
          <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
        </div>
        <div class="modal-body">
          <p data-switch-confirm-body></p>
          <small class="admin-help">The currently running container will stop before the selected one starts.</small>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-banri-outline" data-bs-dismiss="modal">Cancel</button>
          <button type="button" class="btn btn-banri-primary" data-switch-confirm-accept>Switch Server</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function confirmServerSwitch(activeServer, targetServer) {
  const modal = ensureSwitchConfirmModal();
  const body = modal.querySelector("[data-switch-confirm-body]");
  const acceptButton = modal.querySelector("[data-switch-confirm-accept]");
  if (body) {
    body.textContent = `Switch from ${activeServer.label} to ${targetServer.label}?`;
  }

  if (!window.bootstrap?.Modal) {
    console.warn("Bootstrap modal support is required for server switch confirmation.");
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const instance = window.bootstrap.Modal.getOrCreateInstance(modal, { backdrop: "static" });
    let settled = false;
    const cleanup = () => {
      acceptButton?.removeEventListener("click", handleAccept);
      modal.removeEventListener("hidden.bs.modal", handleHidden);
    };
    const finish = (value) => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve(value);
    };
    const handleAccept = () => {
      finish(true);
      instance.hide();
    };
    const handleHidden = () => finish(false);

    acceptButton?.addEventListener("click", handleAccept);
    modal.addEventListener("hidden.bs.modal", handleHidden);
    instance.show();
  });
}

function ensureServerWarmupModal() {
  let modal = document.getElementById("worldServerWarmupModal");
  if (modal) return modal;

  modal = document.createElement("div");
  modal.id = "worldServerWarmupModal";
  modal.className = "modal fade banri-login-modal worlds-warmup-modal";
  modal.tabIndex = -1;
  modal.setAttribute("aria-hidden", "true");
  modal.innerHTML = `
    <div class="modal-dialog modal-dialog-centered modal-sm">
      <div class="modal-content panel-frame">
        <div class="modal-body">
          <p class="banri-modal-kicker" data-warmup-kicker>Blackbox Relay</p>
          <h2 class="modal-title" data-warmup-title>Starting Server</h2>
          <p class="server-warmup-copy" data-warmup-copy>Sending the command to Blackbox.</p>
          <strong class="server-warmup-countdown" data-warmup-countdown>03:00</strong>
          <div class="server-warmup-bar" role="progressbar" aria-label="Server warmup progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <span data-warmup-fill></span>
          </div>
          <small class="server-warmup-status" data-warmup-status>Preparing hosted world...</small>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  return modal;
}

function formatWarmupCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getWarmupProgress() {
  if (!serverWarmupState) return 0;
  const elapsed = Date.now() - serverWarmupState.startedAt;
  return Math.max(0, Math.min(100, Math.round((elapsed / SERVER_WARMUP_MS) * 100)));
}

function updateServerWarmupModal() {
  if (!serverWarmupState) return;
  const modal = ensureServerWarmupModal();
  const progress = getWarmupProgress();
  const remaining = Math.max(0, SERVER_WARMUP_MS - (Date.now() - serverWarmupState.startedAt));
  const actionVerb = serverWarmupState.action === "restart" ? "Restarting" : "Starting";
  const waitingForCommand = !serverWarmupState.commandSettled;
  const title = modal.querySelector("[data-warmup-title]");
  const copy = modal.querySelector("[data-warmup-copy]");
  const countdown = modal.querySelector("[data-warmup-countdown]");
  const bar = modal.querySelector(".server-warmup-bar");
  const fill = modal.querySelector("[data-warmup-fill]");
  const status = modal.querySelector("[data-warmup-status]");

  if (title) title.textContent = `${actionVerb} ${serverWarmupState.label}`;
  if (copy) copy.textContent = waitingForCommand ? "Sending the command to Blackbox." : "Blackbox accepted the command. Waiting for the world to come online.";
  if (countdown) countdown.textContent = formatWarmupCountdown(remaining);
  if (bar) bar.setAttribute("aria-valuenow", String(progress));
  if (fill) fill.style.width = `${progress}%`;
  if (status) {
    status.textContent = progress >= 100 && waitingForCommand
      ? "Warmup estimate complete. Waiting for Blackbox acknowledgement..."
      : `${progress}% warmup complete`;
  }
}

function startServerWarmup(server, action) {
  stopServerWarmup({ hide: false });
  const modal = ensureServerWarmupModal();
  serverWarmupState = {
    action,
    commandSettled: false,
    label: server.label,
    serverId: server.id,
    startedAt: Date.now()
  };
  updateServerWarmupModal();

  if (window.bootstrap?.Modal) {
    window.bootstrap.Modal.getOrCreateInstance(modal, { backdrop: "static", keyboard: false }).show();
  }

  serverWarmupTimer = window.setInterval(() => {
    updateServerWarmupModal();
    maybeCompleteServerWarmup();
  }, 1000);
}

function markServerWarmupAccepted() {
  if (!serverWarmupState) return;
  serverWarmupState.commandSettled = true;
  updateServerWarmupModal();
  maybeCompleteServerWarmup();
}

function maybeCompleteServerWarmup() {
  if (!serverWarmupState || serverWarmupCloseTimer || getWarmupProgress() < 100 || !serverWarmupState.commandSettled) return;
  finishServerWarmup(true);
}

function finishServerWarmup(success, message = "") {
  if (!serverWarmupState) return;
  const modal = ensureServerWarmupModal();
  if (serverWarmupTimer) window.clearInterval(serverWarmupTimer);
  serverWarmupTimer = 0;

  const title = modal.querySelector("[data-warmup-title]");
  const copy = modal.querySelector("[data-warmup-copy]");
  const countdown = modal.querySelector("[data-warmup-countdown]");
  const bar = modal.querySelector(".server-warmup-bar");
  const fill = modal.querySelector("[data-warmup-fill]");
  const status = modal.querySelector("[data-warmup-status]");
  const progress = success ? 100 : getWarmupProgress();

  modal.classList.toggle("is-error", !success);
  if (title) title.textContent = success ? `${serverWarmupState.label} is online` : "Command Failed";
  if (copy) copy.textContent = success ? "Server is online." : (message || "Blackbox could not complete that command.");
  if (countdown) countdown.textContent = success ? "Online" : "Check relay";
  if (bar) bar.setAttribute("aria-valuenow", String(progress));
  if (fill) fill.style.width = `${progress}%`;
  if (status) status.textContent = success ? "100% warmup complete" : "Startup sequence stopped";

  serverWarmupCloseTimer = window.setTimeout(() => {
    if (window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
    stopServerWarmup({ hide: false });
    refreshControllerStatus({ silent: true }).catch(() => {});
  }, success ? SERVER_WARMUP_CLOSE_MS : 2800);
}

function stopServerWarmup({ hide = true } = {}) {
  if (serverWarmupTimer) window.clearInterval(serverWarmupTimer);
  if (serverWarmupCloseTimer) window.clearTimeout(serverWarmupCloseTimer);
  serverWarmupTimer = 0;
  serverWarmupCloseTimer = 0;
  serverWarmupState = null;

  const modal = document.getElementById("worldServerWarmupModal");
  if (modal) {
    modal.classList.remove("is-error");
    if (hide && window.bootstrap?.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
  }
}

async function runControllerAction(action, serverId) {
  if (!controllerAllowed || controllerBusy) return;
  const server = controllerSnapshot?.servers?.find((item) => item.id === serverId);
  if (!server) return;
  const useWarmupModal = action === "start" || action === "restart";

  if (action === "start") {
    const activeServer = controllerSnapshot?.servers?.find((item) => item.status === "running" && item.id !== serverId);
    if (activeServer && !(await confirmServerSwitch(activeServer, server))) {
      return;
    }
  }

  if (useWarmupModal) startServerWarmup(server, action);
  controllerBusy = serverId;
  controllerMessage = `${actionLabel(action)} ${server.label}...`;
  renderControllerPanel();

  try {
    controllerSnapshot = await controllerRequest(`/api/servers/${encodeURIComponent(serverId)}/${action}`, { method: "POST", body: "{}" });
    controllerMessage = `${server.label} ${action === "start" ? "started" : action === "stop" ? "stopped" : "restarted"} ${formatControllerTime(controllerSnapshot.updatedAt)}.`;
    if (useWarmupModal) markServerWarmupAccepted();
  } catch (error) {
    controllerMessage = error.message || "Controller command failed.";
    if (useWarmupModal) finishServerWarmup(false, controllerMessage);
  } finally {
    controllerBusy = "";
    renderControllerPanel();
    currentServers = currentServers.map(decorateServer).sort(sortWorldServers);
    updateWorldMetrics();
    renderServerGrid();
  }
}

function actionLabel(action) {
  return {
    start: "Starting",
    stop: "Stopping",
    restart: "Restarting"
  }[action] || "Updating";
}

document.addEventListener("click", (event) => {
  const viewButton = event.target.closest("[data-worlds-view]");
  if (viewButton) {
    setWorldsView(viewButton.dataset.worldsView);
    return;
  }

  const refreshButton = event.target.closest("#worldsControllerRefresh");
  if (refreshButton) {
    refreshControllerStatus().catch(() => {});
    return;
  }

  const controllerButton = event.target.closest("[data-controller-action]");
  if (controllerButton) {
    runControllerAction(controllerButton.dataset.controllerAction, controllerButton.dataset.controllerServer).catch(() => {});
    return;
  }

  const detailsButton = event.target.closest("[data-world-details]");
  if (detailsButton) {
    openServerDetails(detailsButton.dataset.worldDetails || "");
    return;
  }

  const revealButton = event.target.closest("[data-reveal-world-password]");
  if (revealButton) {
    const id = revealButton.dataset.revealWorldPassword || "";
    if (revealedPasswords.has(id)) revealedPasswords.delete(id);
    else revealedPasswords.add(id);
    openServerDetails(id);
    return;
  }

  const copyButton = event.target.closest("[data-copy-world-server]");
  if (!copyButton) return;
  const value = copyButton.dataset.copyWorldServer || "";
  const label = copyButton.dataset.copyWorldLabel || "Copy";
  copyTextToClipboard(value)
    .then(() => {
      copyButton.textContent = "Copied";
      setTimeout(() => {
        if (copyButton.isConnected) copyButton.textContent = label;
      }, 1200);
    })
    .catch(() => {
      copyButton.textContent = "Copy failed";
    });
});

window.addEventListener("hashchange", () => {
  if (window.location.hash === "#controller") {
    setWorldsView("controller");
  }
});

onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    showLocked();
    return;
  }

  showApp();
  await loadControllerForUser();
  await renderWorlds();
});
