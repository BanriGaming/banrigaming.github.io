import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  buildWorldServerJoinUrl,
  getFirebaseServices,
  loadWorldServers,
  normalizeWorldServer
} from "./site-store.js?v=20260827b";

const { auth } = getFirebaseServices();
let currentServers = [];
const revealedPasswords = new Set();

const elements = {
  locked: document.getElementById("worldsLocked"),
  app: document.getElementById("worldsApp"),
  grid: document.getElementById("worldsGrid"),
  summary: document.getElementById("worldsSummary"),
  total: document.getElementById("worldsTotalCount"),
  online: document.getElementById("worldsOnlineCount"),
  steam: document.getElementById("worldsSteamCount")
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
  elements.locked?.classList.remove("d-none");
  elements.app?.classList.add("d-none");
}

function showApp() {
  elements.locked?.classList.add("d-none");
  elements.app?.classList.remove("d-none");
}

function formatServerStatus(status) {
  const value = String(status || "Online").trim();
  return value || "Online";
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
    ? currentServers.map(renderServerCard).join("")
    : '<div class="panel-frame placeholder-panel"><p class="banri-modal-kicker">No Signals</p><h2>No hosted worlds are published yet.</h2></div>';
}

function renderServerCard(server, index) {
  const joinUrl = buildWorldServerJoinUrl(server);
  const launchDisabled = !joinUrl;
  const rules = (server.rules || []).slice(0, 10);
  const steamAddress = server.steamAddress ? `steamIPV4://${server.steamAddress}` : "";
  const steamP2P = server.steamP2P ? `SteamP2P://${server.steamP2P}` : "";

  return `
    <article id="${escapeAttr(server.id)}" class="world-server-card" style="--server-image: url('${escapeAttr(server.image)}')">
      <div class="world-server-card-media" aria-hidden="true"></div>
      <div class="world-server-card-body">
        <div class="world-server-card-head">
          <p><span>${String(index + 1).padStart(2, "0")}</span> ${escapeHtml(server.game)}</p>
          <strong>${escapeHtml(server.title)}</strong>
        </div>
        <div class="server-meta-grid">
          <span>Status <strong>${escapeHtml(formatServerStatus(server.status))}</strong></span>
          <span>Host <strong>${escapeHtml(server.host || "Private")}</strong></span>
          <span>Region <strong>${escapeHtml(server.region || "Hidden")}</strong></span>
        </div>
        <p class="world-server-description">${escapeHtml(server.description)}</p>
        ${rules.length ? `
          <ul class="server-rule-list">
            ${rules.map((rule) => `<li>${escapeHtml(rule)}</li>`).join("")}
          </ul>
        ` : ""}
        ${server.notes ? `<p class="world-server-notes">${escapeHtml(server.notes)}</p>` : ""}
        <div class="worlds-connection-stack">
          ${renderConnectionLine("Steam IPv4", steamAddress, server.steamAddress, "Copy IP")}
          ${renderConnectionLine("Steam P2P", steamP2P, server.steamP2P, "Copy P2P")}
          ${renderPasswordLine(server)}
        </div>
        <div class="server-join-actions">
          <a class="btn btn-banri-primary${launchDisabled ? " disabled" : ""}" href="${escapeAttr(joinUrl || "#")}" ${launchDisabled ? "aria-disabled=\"true\"" : ""}>
            Launch Via Steam
          </a>
          ${joinUrl ? `<button class="btn btn-banri-outline" type="button" data-copy-world-server="${escapeAttr(joinUrl)}" data-copy-world-label="Copy Launch Route">Copy Launch Route</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

async function renderWorlds() {
  showApp();
  setText(elements.summary, "Loading hosted worlds...");

  try {
    const servers = (await loadWorldServers())
      .map(normalizeWorldServer)
      .filter((server) => server.enabled !== false);
    const online = servers.filter((server) => /^online|active|live$/i.test(server.status)).length;
    const steam = servers.filter((server) => buildWorldServerJoinUrl(server).startsWith("steam://")).length;

    setText(elements.total, String(servers.length));
    setText(elements.online, String(online));
    setText(elements.steam, String(steam));
    setText(elements.summary, `${servers.length} hosted world${servers.length === 1 ? "" : "s"} synced`);

    currentServers = servers;
    renderServerGrid();
  } catch (error) {
    setText(elements.summary, "World sync failed");
    if (elements.grid) {
      elements.grid.innerHTML = `<div class="panel-frame placeholder-panel"><p class="banri-modal-kicker">Firebase Relay</p><h2>${escapeHtml(error.message || "Could not load hosted worlds.")}</h2></div>`;
    }
  }
}

document.addEventListener("click", (event) => {
  const revealButton = event.target.closest("[data-reveal-world-password]");
  if (revealButton) {
    const id = revealButton.dataset.revealWorldPassword || "";
    if (revealedPasswords.has(id)) revealedPasswords.delete(id);
    else revealedPasswords.add(id);
    renderServerGrid();
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

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showLocked();
    return;
  }
  renderWorlds();
});
