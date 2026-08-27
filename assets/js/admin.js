import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { onValue, ref } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  ICON_OPTIONS,
  STATUS_OPTIONS,
  TONE_OPTIONS,
  defaultActivity,
  defaultChroniclesAiConfig,
  defaultCurrentGames,
  defaultFeaturedClip,
  defaultGamesLibrary,
  defaultHeroCopy,
  defaultHeroVisual,
  defaultQuotes,
  defaultSteamConfig,
  defaultSteamSignal,
  defaultTacticalFeed,
  defaultWorldServers,
  deleteGalleryCollection,
  fetchMedalClips,
  fetchSteamSignal,
  getFirebaseServices,
  getChroniclesAiHealthUrl,
  isAdminUid,
  loadAdminWorldServers,
  loadGalleryData,
  loadPublicSiteData,
  normalizeCurrentGame,
  normalizeChroniclesAiConfig,
  normalizeFeaturedClip,
  normalizeFeedItem,
  normalizeGame,
  normalizeHeroCopy,
  normalizeHeroVisual,
  normalizeQuotes,
  normalizeSteamConfig,
  normalizeSteamSignal,
  normalizeWorldServer,
  pushActivity,
  runChroniclesAiQueuedRequest,
  saveGalleryCollection,
  saveGalleryImageMetadata,
  saveGamesLibrary,
  saveSiteConfigPatch,
  saveSteamSignal,
  saveWorldServers,
  slugify,
  statusToTone,
  uploadGalleryImageAsset
} from "./site-store.js?v=20260827a";

const state = {
  user: null,
  isAdmin: false,
  games: [...defaultGamesLibrary],
  currentGames: [...defaultCurrentGames],
  tacticalFeed: [...defaultTacticalFeed],
  quotes: structuredClone(defaultQuotes),
  hero: structuredClone(defaultHeroCopy),
  heroVisual: structuredClone(defaultHeroVisual),
  featuredClip: structuredClone(defaultFeaturedClip),
  worldServers: [...defaultWorldServers],
  steamConfig: structuredClone(defaultSteamConfig),
  steamSignal: structuredClone(defaultSteamSignal),
  chroniclesAiConfig: structuredClone(defaultChroniclesAiConfig),
  medalClips: [],
  medalClipsError: "",
  activityFeed: [...defaultActivity],
  galleryCollections: [],
  galleryImagesByCollection: {},
  galleryFile: null,
  librarySearch: "",
  memberProfiles: {},
  memberPresence: {},
  memberSearch: "",
  memberUnsubscribers: [],
  editingGameIndex: -1
};

const elements = {
  accessState: document.getElementById("adminAccessState"),
  uidText: document.getElementById("adminUidText"),
  lockedPanel: document.getElementById("adminLockedPanel"),
  lockedMessage: document.getElementById("adminLockedMessage"),
  console: document.getElementById("adminConsole"),
  currentEditor: document.getElementById("currentGamesEditor"),
  libraryEditor: document.getElementById("libraryEditor"),
  feedEditor: document.getElementById("feedEditor"),
  quotesEditor: document.getElementById("quotesEditor"),
  homepageEditor: document.getElementById("homepageEditor"),
  worldsEditor: document.getElementById("worldsEditor"),
  chroniclesAiEditor: document.getElementById("chroniclesAiEditor"),
  galleryEditor: document.getElementById("galleryEditor"),
  membersEditor: document.getElementById("membersEditor"),
  membersSearch: document.getElementById("adminMembersSearch"),
  activityPreview: document.getElementById("activityPreview"),
  librarySearch: document.getElementById("adminLibrarySearch"),
  steamProfileId: document.getElementById("steamProfileId"),
  steamProxyUrl: document.getElementById("steamProxyUrl"),
  steamCountryCode: document.getElementById("steamCountryCode"),
  steamSyncLibrary: document.getElementById("steamSyncLibrary"),
  steamLastSynced: document.getElementById("steamLastSynced"),
  steamSyncSummary: document.getElementById("steamSyncSummary"),
  editGameModal: document.getElementById("adminEditGameModal"),
  status: document.getElementById("adminStatus")
};

function setStatus(message, tone = "info") {
  if (!elements.status) return;
  elements.status.textContent = message || "";
  elements.status.dataset.tone = tone;
}

function showLocked(message, access = "Locked") {
  if (elements.accessState) elements.accessState.textContent = access;
  if (elements.lockedMessage) elements.lockedMessage.textContent = message;
  elements.lockedPanel?.classList.remove("d-none");
  elements.console?.classList.add("d-none");
}

function showConsole() {
  if (elements.accessState) elements.accessState.textContent = "Admin";
  elements.lockedPanel?.classList.add("d-none");
  elements.console?.classList.remove("d-none");
}

function optionList(options, selected) {
  return options
    .map((option) => `<option value="${escapeHtml(option)}"${option === selected ? " selected" : ""}>${escapeHtml(option)}</option>`)
    .join("");
}

function getLibraryCategories() {
  return [...new Set(state.games.flatMap((game) => game.categories || []).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));
}

function categoryOptionList(selected = []) {
  const selectedSet = new Set(selected);
  return getLibraryCategories()
    .map((category) => `<option value="${escapeAttr(category)}"${selectedSet.has(category) ? " selected" : ""}>${escapeHtml(category)}</option>`)
    .join("");
}

function readNewGameCategories() {
  const selected = [...document.getElementById("newGameCategories")?.selectedOptions || []]
    .map((option) => option.value.trim())
    .filter(Boolean);
  const custom = String(document.getElementById("newGameCustomCategories")?.value || "")
    .split(",")
    .map((category) => category.trim())
    .filter(Boolean);
  return [...new Set([...selected, ...custom])];
}

function activityMeta(extra = {}) {
  const now = new Date();
  return {
    actorName: state.user?.displayName || state.user?.email || "Banri",
    actorUid: state.user?.uid || "",
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
    ...extra
  };
}

function formatDateTime(value) {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime()) || !Number(value)) return "Awaiting sync";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function readSteamConfig() {
  return normalizeSteamConfig({
    steamId: elements.steamProfileId?.value || state.steamConfig.steamId,
    proxyUrl: elements.steamProxyUrl?.value || "",
    countryCode: elements.steamCountryCode?.value || state.steamConfig.countryCode,
    syncLibrary: elements.steamSyncLibrary?.checked !== false
  });
}

function renderSteamAdmin() {
  const config = normalizeSteamConfig(state.steamConfig);
  const signal = normalizeSteamSignal(state.steamSignal);

  if (elements.steamProfileId) elements.steamProfileId.value = config.steamId;
  if (elements.steamProxyUrl) elements.steamProxyUrl.value = config.proxyUrl;
  if (elements.steamCountryCode) elements.steamCountryCode.value = config.countryCode;
  if (elements.steamSyncLibrary) elements.steamSyncLibrary.checked = config.syncLibrary;
  if (elements.steamLastSynced) elements.steamLastSynced.textContent = formatDateTime(signal.summary.syncedAt);
  if (elements.steamSyncSummary) {
    const matches = signal.libraryMatches?.length || 0;
    elements.steamSyncSummary.textContent = signal.summary.totalGames
      ? `${signal.summary.playedGames} of ${signal.summary.totalGames} Steam games played / ${signal.summary.totalHours.toLocaleString()}h on record / ${matches} library match${matches === 1 ? "" : "es"} from last sync.`
      : "Uses a private Worker so the Steam API key stays out of the public website.";
  }
}

function readChroniclesAiConfig() {
  return normalizeChroniclesAiConfig({
    workerUrl: document.getElementById("chroniclesAiWorkerUrl")?.value || "",
    assistEnabled: document.getElementById("chroniclesAiAssistEnabled")?.checked === true,
    summaryEnabled: document.getElementById("chroniclesAiSummaryEnabled")?.checked === true,
    autoSummary: document.getElementById("chroniclesAiAutoSummary")?.checked === true,
    summaryCooldownMinutes: document.getElementById("chroniclesAiCooldown")?.value || defaultChroniclesAiConfig.summaryCooldownMinutes
  });
}

function renderChroniclesAiEditor() {
  if (!elements.chroniclesAiEditor) return;
  const config = normalizeChroniclesAiConfig(state.chroniclesAiConfig);
  elements.chroniclesAiEditor.innerHTML = `
    <article class="admin-card admin-chronicles-ai-panel">
      <div class="admin-card-body">
        <div class="admin-card-heading">
          <span>Worker Relay</span>
          <strong>${config.workerUrl ? "Configured" : "Not linked"}</strong>
        </div>
        <div class="chronicles-ai-admin-layout">
          <div class="chronicles-ai-admin-main">
            <label for="chroniclesAiWorkerUrl">Chronicles AI Worker URL</label>
            <div class="chronicles-ai-worker-row">
              <input id="chroniclesAiWorkerUrl" class="form-control" type="url" value="${escapeAttr(config.workerUrl)}" placeholder="https://banri-chronicles-ai.your-account.workers.dev/" />
              <button id="checkChroniclesAiButton" class="btn btn-banri-outline" type="button">Check Worker</button>
            </div>
          </div>
          <div class="chronicles-ai-toggle-grid">
            <label class="admin-switch admin-switch-block">
              <input id="chroniclesAiAssistEnabled" type="checkbox"${config.assistEnabled ? " checked" : ""} />
              <span>
                <strong>AI Assist</strong>
                <small>Draft rewrite tools</small>
              </span>
            </label>
            <label class="admin-switch admin-switch-block">
              <input id="chroniclesAiSummaryEnabled" type="checkbox"${config.summaryEnabled ? " checked" : ""} />
              <span>
                <strong>Summary Signal</strong>
                <small>Story So Far refresh</small>
              </span>
            </label>
            <label class="admin-switch admin-switch-block">
              <input id="chroniclesAiAutoSummary" type="checkbox"${config.autoSummary ? " checked" : ""} />
              <span>
                <strong>Auto Refresh</strong>
                <small>After new posts</small>
              </span>
            </label>
            <div class="chronicles-ai-cooldown">
              <label for="chroniclesAiCooldown">Cooldown</label>
              <input id="chroniclesAiCooldown" class="form-control" type="number" min="1" max="120" value="${escapeAttr(config.summaryCooldownMinutes)}" />
              <small>Minutes between auto summaries</small>
            </div>
          </div>
          <div class="chronicles-ai-health">
            <span>Relay Diagnostic</span>
            <p id="chroniclesAiHealthStatus">Use Check Worker after saving the Worker URL. This verifies Cloudflare bindings without spending OpenAI tokens.</p>
          </div>
        </div>
        <p class="admin-help mt-3 mb-0">
          Summary refreshes are shared to Firebase under <code>chronicles/summaries</code>. AI Assist only edits the draft locally until the writer inserts or replaces text.
        </p>
      </div>
    </article>
  `;
}

async function checkChroniclesAiWorker() {
  const config = readChroniclesAiConfig();
  const output = document.getElementById("chroniclesAiHealthStatus");
  const button = document.getElementById("checkChroniclesAiButton");

  if (!config.workerUrl) {
    if (output) output.textContent = "Add the Worker URL first, then check it.";
    return;
  }

  button?.setAttribute("disabled", "true");
  if (button) button.textContent = "Checking...";
  if (output) output.textContent = "Contacting Worker health endpoint...";

  try {
    const response = await fetch(getChroniclesAiHealthUrl(config.workerUrl), { cache: "no-store" });
    const data = await response.json().catch(() => ({}));
    const status = data.status || {};
    const firebaseLine = status.firebaseKey
      ? `Firebase key visible via ${status.firebaseKeyBinding || "configured binding"}`
      : `Firebase key missing. Checked ${status.checkedFirebaseBindings?.join(", ") || "expected bindings"}`;
    const openAiLine = status.openAiKey ? "OpenAI key visible" : "OpenAI key missing";
    const originLine = status.allowedOrigins ? "Origins configured" : "Origins not configured";

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Worker health returned ${response.status}.`);
    }

    if (!state.user) {
      setStatus("Worker health passed, but sign in before testing the Firebase queue and AI ping.", "error");
      return;
    }

    if (output) output.textContent = `${openAiLine}. ${firebaseLine}. ${originLine}. Testing Firebase AI queue...`;
    const authCheck = await runChroniclesAiQueuedRequest({
      workerUrl: config.workerUrl,
      user: state.user,
      payload: { action: "auth-check" }
    });
    if (authCheck.ok === false) {
      throw new Error(authCheck.error || "Firebase AI queue auth check failed.");
    }

    if (output) output.textContent = `${openAiLine}. ${firebaseLine}. ${originLine}. Firebase queue passed. Testing OpenAI ping...`;
    const aiCheck = await runChroniclesAiQueuedRequest({
      workerUrl: config.workerUrl,
      user: state.user,
      payload: { action: "diagnose" }
    });
    if (aiCheck.ok === false) {
      throw new Error(aiCheck.error || "OpenAI ping failed.");
    }

    if (output) output.textContent = `${openAiLine}. ${firebaseLine}. ${originLine}. Firebase queue passed. OpenAI ping passed. Model: ${aiCheck.model || status.model || "default"}.`;
    setStatus("Chronicles AI Worker, Firebase queue, and OpenAI ping passed.", "success");
  } catch (error) {
    if (output) output.textContent = error.message || "Worker health check failed.";
    setStatus(error.message || "Worker health check failed.", "error");
  } finally {
    button?.removeAttribute("disabled");
    if (button) button.textContent = "Check Worker";
  }
}

function normalizeSteamLookupName(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/\b(game of the year|complete edition|anniversary edition|online|standard edition)\b/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function findSteamGameForLibraryGame(game, steamGames = []) {
  const appId = String(game.steamAppId || "").trim();
  if (appId) {
    const byAppId = steamGames.find((steamGame) => String(steamGame.appId) === appId);
    if (byAppId) return byAppId;
  }

  const wantedNames = [
    game.steamName,
    game.title
  ].map(normalizeSteamLookupName).filter(Boolean);

  return steamGames.find((steamGame) => {
    const candidate = normalizeSteamLookupName(steamGame.name);
    return wantedNames.some((wanted) => candidate === wanted || candidate.includes(wanted) || wanted.includes(candidate));
  }) || null;
}

function applySteamSignalToLibrary(signal) {
  const steamSignal = normalizeSteamSignal(signal);
  const matches = [];
  state.games = state.games.map((game, index) => {
    const steamGame = findSteamGameForLibraryGame(game, steamSignal.games);
    if (!steamGame) return normalizeGame(game, index);

    const playtimeHours = Number(steamGame.playtimeHours || 0);
    matches.push({
      siteGameId: game.id,
      appId: steamGame.appId,
      name: steamGame.name,
      playtimeHours
    });

    return normalizeGame({
      ...game,
      hours: Math.round(playtimeHours),
      steamAppId: game.steamAppId || steamGame.appId,
      steamName: game.steamName || steamGame.name
    }, index);
  });

  return {
    ...steamSignal,
    libraryMatches: matches
  };
}

function gameOptionList(selectedTitle = "") {
  return [
    '<option value="">Manual entry</option>',
    ...state.games.map((game, index) => `<option value="${index}"${game.title === selectedTitle ? " selected" : ""}>${escapeHtml(game.title)}</option>`)
  ].join("");
}

function gameIdOptionList(selectedId = "") {
  return state.games
    .map((game) => `<option value="${escapeAttr(game.id)}"${game.id === selectedId ? " selected" : ""}>${escapeHtml(game.title)}</option>`)
    .join("");
}

function galleryCollectionOptionList(selectedId = "") {
  return state.galleryCollections
    .map((collection) => `<option value="${escapeAttr(collection.id)}"${collection.id === selectedId ? " selected" : ""}>${escapeHtml(collection.title)}</option>`)
    .join("");
}

function heroOptionList(selectedId = "") {
  return state.heroVisual.images
    .map((image) => `<option value="${escapeAttr(image.id)}"${image.id === selectedId ? " selected" : ""}>${escapeHtml(image.id)} / ${escapeHtml(image.title)}</option>`)
    .join("");
}

function featuredClipOptionList(selectedKey = "") {
  if (!state.medalClips.length) {
    return `<option value="">${state.medalClipsError ? "Could not load Medal clips" : "Loading Medal clips..."}</option>`;
  }

  const featured = normalizeFeaturedClip(state.featuredClip);
  const hasSelected = selectedKey && state.medalClips.some((clip) => clip.id === selectedKey || clip.url === selectedKey);
  const options = hasSelected || (!featured.id && !featured.url)
    ? state.medalClips
    : [featured, ...state.medalClips];

  return options
    .map((clip) => {
      const key = clip.id || clip.url;
      const selected = key === selectedKey || clip.url === selectedKey;
      return `<option value="${escapeAttr(key)}"${selected ? " selected" : ""}>${escapeHtml(clip.title)} / ${escapeHtml(clip.game)} / ${escapeHtml(clip.date)}</option>`;
    })
    .join("");
}

function renderCurrentEditor() {
  elements.currentEditor.innerHTML = state.currentGames
    .slice(0, 4)
    .map((game, index) => `
      <article class="admin-card" data-current-index="${index}">
        <div class="admin-card-preview" style="--preview-image: url('${escapeAttr(game.image)}')"></div>
        <div class="admin-card-body">
          <div class="admin-card-heading">
            <span>Slot ${index + 1}</span>
            <select class="form-select" data-current-source>${gameOptionList(game.title)}</select>
          </div>
          <div class="row g-3">
            <div class="col-12 col-md-6">
              <label>Title</label>
              <input class="form-control" data-current-field="title" value="${escapeAttr(game.title)}" />
            </div>
            <div class="col-6 col-md-3">
              <label>Status</label>
              <select class="form-select" data-current-field="status">${optionList(STATUS_OPTIONS, game.status)}</select>
            </div>
            <div class="col-6 col-md-3">
              <label>Tone</label>
              <select class="form-select" data-current-field="tone">${optionList(TONE_OPTIONS, game.tone)}</select>
            </div>
            <div class="col-12">
              <label>Meta</label>
              <input class="form-control" data-current-field="meta" value="${escapeAttr(game.meta)}" />
            </div>
            <div class="col-12 col-lg-6">
              <label>Link URL</label>
              <input class="form-control" data-current-field="url" value="${escapeAttr(game.url)}" />
            </div>
            <div class="col-12 col-lg-6">
              <label>Image URL</label>
              <input class="form-control" data-current-field="image" value="${escapeAttr(game.image)}" />
            </div>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderLibraryEditor() {
  const query = state.librarySearch.trim().toLowerCase();
  const games = state.games
    .map((game, index) => ({ game, index }))
    .filter(({ game }) => !query || [
      game.title,
      game.id,
      game.description,
      game.status,
      (game.categories || []).join(" ")
    ].join(" ").toLowerCase().includes(query));

  elements.libraryEditor.innerHTML = games.length ? games
    .map(({ game, index }) => `
      <article class="admin-card admin-library-row" data-game-index="${index}">
        <div class="admin-library-thumb" style="--preview-image: url('${escapeAttr(game.art)}')"></div>
        <div>
          <span>${escapeHtml(game.status)} / ${escapeHtml((game.categories || []).slice(0, 2).join(" / ") || "Unsorted")}</span>
          <h3>${escapeHtml(game.title)}</h3>
          <p>${escapeHtml(game.description)}</p>
        </div>
        <div class="admin-library-meta">
          <span>${escapeHtml(game.id)}</span>
          <small>${escapeHtml(game.link || "Library-only record")}</small>
          <small>${Number(game.hours || 0).toLocaleString()} hrs / ${Number(game.completion || 0)}%</small>
        </div>
        <button class="btn btn-banri-outline btn-sm" type="button" data-edit-game>Edit</button>
      </article>
    `)
    .join("") : '<p class="admin-empty">No game records match that search.</p>';
}

function gameModalFields(game) {
  return `
    <div class="admin-card-preview mb-3" style="--preview-image: url('${escapeAttr(game.art)}')"></div>
    <div class="row g-3">
      <div class="col-12 col-lg-4">
        <label for="editGameTitle">Title</label>
        <input id="editGameTitle" class="form-control" data-edit-game-field="title" value="${escapeAttr(game.title)}" />
      </div>
      <div class="col-12 col-lg-4">
        <label for="editGameId">ID / Slug</label>
        <input id="editGameId" class="form-control" data-edit-game-field="id" value="${escapeAttr(game.id)}" />
      </div>
      <div class="col-6 col-lg-2">
        <label for="editGameStatus">Status</label>
        <select id="editGameStatus" class="form-select" data-edit-game-field="status">${optionList(STATUS_OPTIONS, game.status)}</select>
      </div>
      <div class="col-6 col-lg-2">
        <label for="editGameTone">Tone</label>
        <select id="editGameTone" class="form-select" data-edit-game-field="tone">${optionList(TONE_OPTIONS, game.tone)}</select>
      </div>
      <div class="col-12">
        <label for="editGameDescription">Description</label>
        <textarea id="editGameDescription" class="form-control" rows="3" data-edit-game-field="description">${escapeHtml(game.description)}</textarea>
      </div>
      <div class="col-12 col-lg-4">
        <label for="editGameCategories">Categories</label>
        <input id="editGameCategories" class="form-control" data-edit-game-field="categories" value="${escapeAttr(game.categories.join(", "))}" />
      </div>
      <div class="col-6 col-lg-2">
        <label for="editGameHours">Hours</label>
        <input id="editGameHours" class="form-control" type="number" min="0" data-edit-game-field="hours" value="${escapeAttr(game.hours)}" />
      </div>
      <div class="col-6 col-lg-2">
        <label for="editGameCompletion">Completion %</label>
        <input id="editGameCompletion" class="form-control" type="number" min="0" max="100" data-edit-game-field="completion" value="${escapeAttr(game.completion)}" />
      </div>
      <div class="col-12 col-lg-4">
        <label for="editGameLink">Page Link</label>
        <input id="editGameLink" class="form-control" data-edit-game-field="link" value="${escapeAttr(game.link)}" />
      </div>
      <div class="col-12 col-lg-4 d-flex align-items-end">
        <label class="admin-switch mb-2">
          <input id="editGameHasPage" type="checkbox" data-edit-game-field="hasPage"${game.hasPage !== false ? " checked" : ""} />
          Enable page link
        </label>
      </div>
      <div class="col-12 col-lg-4">
        <label for="editGameSteamApp">Steam App ID</label>
        <input id="editGameSteamApp" class="form-control" data-edit-game-field="steamAppId" value="${escapeAttr(game.steamAppId || "")}" placeholder="39210" />
      </div>
      <div class="col-12 col-lg-4">
        <label for="editGameSteamName">Steam Name Override</label>
        <input id="editGameSteamName" class="form-control" data-edit-game-field="steamName" value="${escapeAttr(game.steamName || game.title)}" />
      </div>
      <div class="col-12">
        <label for="editGameArt">Image URL</label>
        <input id="editGameArt" class="form-control" data-edit-game-field="art" value="${escapeAttr(game.art)}" />
      </div>
    </div>
  `;
}

function openGameEditor(index) {
  const game = state.games[index];
  if (!game) return;
  state.editingGameIndex = index;
  document.getElementById("adminEditGameTitle").textContent = `Edit ${game.title}`;
  document.getElementById("adminEditGameBody").innerHTML = gameModalFields(game);
  bootstrap.Modal.getOrCreateInstance(elements.editGameModal).show();
}

function refreshOpenGameEditor() {
  if (state.editingGameIndex < 0 || !elements.editGameModal?.classList.contains("show")) return;
  const game = state.games[state.editingGameIndex];
  if (!game) return;
  document.getElementById("adminEditGameTitle").textContent = `Edit ${game.title}`;
  document.getElementById("adminEditGameBody").innerHTML = gameModalFields(game);
}

function readEditedGame() {
  const source = {};
  document.querySelectorAll("[data-edit-game-field]").forEach((input) => {
    source[input.dataset.editGameField] = input.type === "checkbox" ? input.checked : input.value;
  });

  return normalizeGame({
    ...state.games[state.editingGameIndex],
    ...source
  }, state.editingGameIndex);
}

function renderFeedEditor() {
  elements.feedEditor.innerHTML = state.tacticalFeed
    .map((item, index) => `
      <article class="admin-card admin-feed-card" data-feed-index="${index}">
        <div class="admin-card-body">
          <div class="admin-card-heading">
            <span>${escapeHtml(item.category)}</span>
            <div class="d-flex flex-wrap gap-2 align-items-center">
              <label class="admin-switch">
                <input type="checkbox" data-feed-field="enabled"${item.enabled ? " checked" : ""} />
                Enabled
              </label>
              <button class="btn btn-banri-outline btn-sm" type="button" data-delete-feed>Remove</button>
            </div>
          </div>
          <div class="row g-3">
            <div class="col-12 col-md-3">
              <label>Category</label>
              <input class="form-control" data-feed-field="category" value="${escapeAttr(item.category)}" />
            </div>
            <div class="col-6 col-md-2">
              <label>Icon</label>
              <select class="form-select" data-feed-field="icon">${optionList(ICON_OPTIONS, item.icon)}</select>
            </div>
            <div class="col-6 col-md-3">
              <label>Dynamic Source</label>
              <select class="form-select" data-feed-field="dynamic">
                <option value=""${!item.dynamic ? " selected" : ""}>Manual</option>
                <option value="latestMedal"${item.dynamic === "latestMedal" ? " selected" : ""}>Latest Medal Clip</option>
              </select>
            </div>
            <div class="col-12 col-md-4">
              <label>Time</label>
              <input class="form-control" data-feed-field="time" value="${escapeAttr(item.time)}" />
            </div>
            <div class="col-12">
              <label>Message</label>
              <input class="form-control" data-feed-field="message" value="${escapeAttr(item.message)}" />
            </div>
          </div>
        </div>
      </article>
    `)
    .join("");
}

function renderQuotesEditor() {
  const quotes = normalizeQuotes(state.quotes);
  elements.quotesEditor.innerHTML = `
    <article class="admin-card">
      <div class="admin-card-body">
        <div class="admin-card-heading"><span>Homepage Quote</span></div>
        <div class="row g-3">
          <div class="col-12">
            <label>Line 1</label>
            <input class="form-control" data-quote-field="home.line1" value="${escapeAttr(quotes.home.line1)}" />
          </div>
          <div class="col-12">
            <label>Line 2</label>
            <input class="form-control" data-quote-field="home.line2" value="${escapeAttr(quotes.home.line2)}" />
          </div>
          <div class="col-12">
            <label>Author</label>
            <input class="form-control" data-quote-field="home.author" value="${escapeAttr(quotes.home.author)}" />
          </div>
        </div>
      </div>
    </article>
    <article class="admin-card">
      <div class="admin-card-body">
        <div class="admin-card-heading"><span>Library Quote</span></div>
        <div class="row g-3">
          <div class="col-12">
            <label>Quote</label>
            <textarea class="form-control" rows="4" data-quote-field="library.text">${escapeHtml(quotes.library.text)}</textarea>
          </div>
          <div class="col-12">
            <label>Author</label>
            <input class="form-control" data-quote-field="library.author" value="${escapeAttr(quotes.library.author)}" />
          </div>
        </div>
      </div>
    </article>
  `;
}

function renderHomepageEditor() {
  if (!elements.homepageEditor) return;
  elements.homepageEditor.classList.add("admin-homepage-grid");
  const hero = normalizeHeroCopy(state.hero);
  const visual = normalizeHeroVisual(state.heroVisual);
  const featured = normalizeFeaturedClip(state.featuredClip);
  const selectedClipKey = featured.id || featured.url || "";
  elements.homepageEditor.innerHTML = `
    <div class="homepage-editor-row">
      <article class="admin-card">
        <div class="admin-card-body">
          <div class="admin-card-heading"><span>Hero Text</span></div>
          <div class="row g-3">
            <div class="col-12">
              <label>Eyebrow</label>
              <input class="form-control" data-home-field="eyebrow" value="${escapeAttr(hero.eyebrow)}" />
            </div>
            <div class="col-12">
              <label>Statement</label>
              <input class="form-control" data-home-field="statement" value="${escapeAttr(hero.statement)}" />
            </div>
            <div class="col-12">
              <label>Main Copy</label>
              <textarea class="form-control" rows="3" data-home-field="copy">${escapeHtml(hero.copy)}</textarea>
            </div>
          </div>
        </div>
      </article>
      <article class="admin-card">
        <div class="admin-card-body">
          <div class="admin-card-heading"><span>Side Note</span></div>
          <div class="row g-3">
            <div class="col-12">
              <label>Line 1</label>
              <input class="form-control" data-home-side="0" value="${escapeAttr(hero.sideLines[0] || "")}" />
            </div>
            <div class="col-12">
              <label>Line 2</label>
              <input class="form-control" data-home-side="1" value="${escapeAttr(hero.sideLines[1] || "")}" />
            </div>
            <div class="col-12">
              <label>Line 3</label>
              <input class="form-control" data-home-side="2" value="${escapeAttr(hero.sideLines[2] || "")}" />
            </div>
          </div>
        </div>
      </article>
    </div>
    <div class="homepage-editor-row homepage-editor-row--media">
      <article class="admin-card admin-card-wide hero-visual-admin">
        <div class="admin-card-preview" style="--preview-image: url('${escapeAttr(visual.images.find((image) => image.id === visual.activeId)?.image || visual.images[0]?.image || "")}')"></div>
        <div class="admin-card-body">
          <div class="admin-card-heading"><span>Hero Visual</span></div>
          <div class="row g-3">
            <div class="col-12 col-lg-4">
              <label>Display Mode</label>
              <select class="form-select" data-hero-visual-field="mode">
                <option value="fixed"${visual.mode === "fixed" ? " selected" : ""}>Fixed Image</option>
                <option value="sequence"${visual.mode === "sequence" ? " selected" : ""}>Sequence</option>
                <option value="shuffle"${visual.mode === "shuffle" ? " selected" : ""}>Shuffle</option>
              </select>
            </div>
            <div class="col-12 col-lg-4">
              <label>Fixed Image</label>
              <select class="form-select" data-hero-visual-field="activeId">${heroOptionList(visual.activeId)}</select>
            </div>
            <div class="col-12 col-lg-4">
              <label>Interval Minutes</label>
              <input class="form-control" type="number" min="1" max="1440" data-hero-visual-field="intervalMinutes" value="${escapeAttr(visual.intervalMinutes)}" />
            </div>
          </div>
          <div class="hero-admin-grid mt-3">
            ${visual.images.map((image) => `
              <div class="hero-admin-tile${image.id === visual.activeId ? " active" : ""}" style="--tile-image: url('${escapeAttr(image.image)}')">
                <span>${escapeHtml(image.id)}</span>
                <strong>${escapeHtml(image.title)}</strong>
              </div>
            `).join("")}
          </div>
        </div>
      </article>
      <article class="admin-card admin-card-wide featured-clip-admin">
        <div class="admin-card-preview" style="--preview-image: url('${escapeAttr(featured.thumbnail || "/assets/img/hero/banri-hero-03.webp")}')"></div>
        <div class="admin-card-body">
          <div class="admin-card-heading"><span>Featured Clip</span></div>
          <div class="row g-3 align-items-end">
            <div class="col-12 col-xl-8">
              <label>Medal Clip</label>
              <select class="form-select" data-featured-clip-select>
                ${featuredClipOptionList(selectedClipKey)}
              </select>
              ${state.medalClipsError ? `<small class="text-warning d-block mt-2">${escapeHtml(state.medalClipsError)}</small>` : ""}
            </div>
            <div class="col-12 col-xl-4">
              <button id="saveFeaturedClipButton" class="btn btn-banri-primary w-100" type="button">Save Featured Clip</button>
            </div>
            <div class="col-12">
              <p class="admin-help mb-0">${escapeHtml(featured.title || "Choose a Medal clip")} / ${escapeHtml(featured.game || "Medal Clip")} / ${escapeHtml(featured.date || "Featured transmission")}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  `;
}

function renderWorldServersEditor() {
  if (!elements.worldsEditor) return;
  const servers = state.worldServers.length ? state.worldServers : defaultWorldServers.map(normalizeWorldServer);
  elements.worldsEditor.innerHTML = servers.map((server, index) => `
    <article class="admin-card admin-world-server-card" data-world-server-index="${index}">
      <div class="admin-card-preview" style="--preview-image: url('${escapeAttr(server.image)}')"></div>
      <div class="admin-card-body">
        <div class="admin-card-heading">
          <span>${escapeHtml(server.game || "Hosted Server")}</span>
          <button class="btn btn-banri-outline btn-sm" type="button" data-delete-world-server>Delete</button>
        </div>
        <div class="row g-3">
          <div class="col-12 col-lg-4">
            <label>Server Title</label>
            <input class="form-control" data-server-field="title" value="${escapeAttr(server.title)}" />
          </div>
          <div class="col-12 col-lg-3">
            <label>ID / Slug</label>
            <input class="form-control" data-server-field="id" value="${escapeAttr(server.id)}" />
          </div>
          <div class="col-12 col-md-6 col-lg-3">
            <label>Game</label>
            <input class="form-control" data-server-field="game" value="${escapeAttr(server.game)}" />
          </div>
          <div class="col-12 col-md-6 col-lg-2">
            <label>Order</label>
            <input class="form-control" type="number" min="1" data-server-field="order" value="${escapeAttr(server.order)}" />
          </div>
          <div class="col-12 col-md-4">
            <label>Status</label>
            <input class="form-control" data-server-field="status" value="${escapeAttr(server.status)}" placeholder="Online" />
          </div>
          <div class="col-12 col-md-4">
            <label>Host</label>
            <input class="form-control" data-server-field="host" value="${escapeAttr(server.host)}" placeholder="Blackbox / Dathost" />
          </div>
          <div class="col-12 col-md-4">
            <label>Region</label>
            <input class="form-control" data-server-field="region" value="${escapeAttr(server.region)}" placeholder="US Central" />
          </div>
          <div class="col-12">
            <label>Description</label>
            <textarea class="form-control" rows="3" data-server-field="description">${escapeHtml(server.description)}</textarea>
          </div>
          <div class="col-12 col-lg-6">
            <label>Steam IP / Port</label>
            <input class="form-control" data-server-field="steamAddress" value="${escapeAttr(server.steamAddress)}" placeholder="73.111.246.38:9876" />
          </div>
          <div class="col-12 col-lg-6">
            <label>Steam P2P ID</label>
            <input class="form-control" data-server-field="steamP2P" value="${escapeAttr(server.steamP2P)}" placeholder="90291675017036813" />
          </div>
          <div class="col-12 col-lg-6">
            <label>Launch URL Override</label>
            <input class="form-control" data-server-field="joinUrl" value="${escapeAttr(server.joinUrl)}" placeholder="steam://connect/ip:port" />
          </div>
          <div class="col-12 col-lg-6">
            <label>Image URL</label>
            <input class="form-control" data-server-field="image" value="${escapeAttr(server.image)}" />
          </div>
          <div class="col-12">
            <label>Rules / Server Notes</label>
            <textarea class="form-control" rows="5" data-server-field="rules">${escapeHtml((server.rules || []).join("\n"))}</textarea>
          </div>
          <div class="col-12 col-lg-8">
            <label>Footer Note</label>
            <input class="form-control" data-server-field="notes" value="${escapeAttr(server.notes)}" />
          </div>
          <div class="col-6 col-lg-2">
            <label>Visibility</label>
            <select class="form-select" data-server-field="visibility">
              <option value="members"${server.visibility !== "public" ? " selected" : ""}>Members</option>
              <option value="public"${server.visibility === "public" ? " selected" : ""}>Public</option>
            </select>
          </div>
          <div class="col-6 col-lg-2 d-flex align-items-end">
            <label class="admin-switch w-100">
              <input type="checkbox" data-server-field="enabled" ${server.enabled !== false ? "checked" : ""} />
              Enabled
            </label>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function renderGalleryEditor() {
  if (!elements.galleryEditor) return;
  const selectedCollection = state.galleryCollections[0]?.id || "";
  const selectedGame = state.games[0]?.id || "";
  const collectionOptions = galleryCollectionOptionList(selectedCollection);

  elements.galleryEditor.innerHTML = `
    <article class="admin-card">
      <div class="admin-card-body">
        <div class="admin-card-heading"><span>Create Collection</span></div>
        <div class="row g-3 align-items-end">
          <div class="col-12 col-lg-8">
            <label for="galleryGameSelect">Library Game</label>
            <select id="galleryGameSelect" class="form-select">${gameIdOptionList(selectedGame)}</select>
          </div>
          <div class="col-12 col-lg-4">
            <button id="createGalleryCollectionButton" class="btn btn-banri-primary w-100" type="button">Create Collection</button>
          </div>
        </div>
      </div>
    </article>

    <article class="admin-card">
      <div class="admin-card-body">
        <div class="admin-card-heading"><span>Upload Screenshot</span></div>
        <div class="row g-3">
          <div class="col-12 col-lg-5">
            <label for="galleryCollectionSelect">Collection</label>
            <select id="galleryCollectionSelect" class="form-select"${collectionOptions ? "" : " disabled"}>
              ${collectionOptions || '<option value="">Create a collection first</option>'}
            </select>
          </div>
          <div class="col-12 col-lg-7">
            <label for="galleryImageTitle">Image Title</label>
            <input id="galleryImageTitle" class="form-control" placeholder="Rain over the backyard wall" />
          </div>
          <div class="col-12">
            <div id="galleryDropzone" class="gallery-admin-dropzone" role="button" tabindex="0">
              <input id="galleryFileInput" class="visually-hidden" type="file" accept="image/*" />
              <strong>${state.galleryFile ? escapeHtml(state.galleryFile.name) : "Drop an image here or click to choose"}</strong>
              <span>Saves small image data to Realtime Database and publishes it to the selected collection.</span>
            </div>
          </div>
          <div class="col-12">
            <button id="uploadGalleryImageButton" class="btn btn-banri-primary" type="button"${state.galleryFile && collectionOptions ? "" : " disabled"}>Upload Image</button>
          </div>
        </div>
      </div>
    </article>

    <article class="admin-card">
      <div class="admin-card-body">
        <div class="admin-card-heading"><span>Collections</span></div>
        <div class="gallery-admin-collections">
          ${state.galleryCollections.length ? state.galleryCollections.map((collection) => {
            const count = state.galleryImagesByCollection[collection.id]?.length || 0;
            return `
              <div class="gallery-admin-row" data-gallery-collection-id="${escapeAttr(collection.id)}" style="--collection-image: url('${escapeAttr(collection.coverArt)}')">
                <div aria-hidden="true"></div>
                <section>
                  <strong>${escapeHtml(collection.title)}</strong>
                  <span>${count} image${count === 1 ? "" : "s"} / ${escapeHtml(collection.id)}</span>
                </section>
                <button class="btn btn-banri-outline btn-sm" type="button" data-delete-gallery-collection>Delete</button>
              </div>
            `;
          }).join("") : '<p class="admin-empty">No gallery collections yet. Create one from an existing game record.</p>'}
        </div>
      </div>
    </article>
  `;
}

function cleanupMemberRoster() {
  state.memberUnsubscribers.forEach((unsubscribe) => unsubscribe());
  state.memberUnsubscribers = [];
}

function subscribeMemberRoster() {
  if (!elements.membersEditor) return;
  cleanupMemberRoster();
  const { database } = getFirebaseServices();
  [
    ["publicProfiles", (value) => { state.memberProfiles = value || {}; }],
    ["presence", (value) => { state.memberPresence = value || {}; }]
  ].forEach(([path, setter]) => {
    const unsubscribe = onValue(ref(database, path), (snapshot) => {
      setter(snapshot.val());
      renderMembersEditor();
    }, (error) => {
      console.warn(`Admin member roster read failed at ${path}:`, error);
      renderMembersEditor();
    });
    state.memberUnsubscribers.push(unsubscribe);
  });
}

function getAdminMembers() {
  const ids = new Set([
    ...Object.keys(state.memberProfiles || {}),
    ...Object.keys(state.memberPresence || {})
  ]);
  if (state.user?.uid) ids.add(state.user.uid);

  return [...ids].map((uid) => {
    const profile = state.memberProfiles?.[uid] || {};
    const signal = state.memberPresence?.[uid] || {};
    return {
      uid,
      displayName: profile.displayName || signal.displayName || (uid === state.user?.uid ? state.user.displayName || state.user.email : "") || "Nexus User",
      bio: profile.bio || "",
      status: profile.status || "",
      favoriteGames: profile.favoriteGames || "",
      platforms: normalizeMemberPlatforms(profile.platforms),
      photoURL: profile.photoURL || "",
      online: signal.online === true || uid === state.user?.uid,
      lastSeen: Number(signal.lastSeen || profile.updatedAt || (uid === state.user?.uid ? Date.now() : 0))
    };
  }).sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen - a.lastSeen || a.displayName.localeCompare(b.displayName));
}

function filterAdminMembers(members) {
  const query = state.memberSearch.trim().toLowerCase();
  if (!query) return members;
  return members.filter((member) => [
    member.uid,
    member.displayName,
    member.bio,
    member.status,
    member.favoriteGames,
    ...Object.values(member.platforms || {})
  ].join(" ").toLowerCase().includes(query));
}

function normalizeMemberPlatforms(platforms = {}) {
  return Object.fromEntries(Object.entries(platforms || {})
    .map(([key, value]) => [key, String(value || "").trim()])
    .filter(([, value]) => value));
}

function renderMembersEditor() {
  if (!elements.membersEditor) return;
  const members = getAdminMembers();
  const filtered = filterAdminMembers(members);
  const onlineCount = members.filter((member) => member.online).length;

  elements.membersEditor.innerHTML = `
    <article class="admin-card admin-member-summary">
      <div class="admin-card-body">
        <div>
          <span>Roster</span>
          <strong>${members.length} member${members.length === 1 ? "" : "s"}</strong>
        </div>
        <div>
          <span>Online</span>
          <strong>${onlineCount}</strong>
        </div>
        <div>
          <span>Filtered</span>
          <strong>${filtered.length}</strong>
        </div>
      </div>
    </article>
    ${filtered.length ? filtered.map(renderAdminMemberCard).join("") : '<p class="admin-empty">No member signals match that search.</p>'}
  `;
}

function renderAdminMemberCard(member) {
  const signal = member.bio || "No public signal set.";
  const status = member.status || (member.online ? "Connected to the Nexus" : "Signal dormant");
  const favorites = member.favoriteGames || "No favorite games listed.";
  return `
    <article class="admin-card admin-member-card" data-member-uid="${escapeAttr(member.uid)}">
      <div class="admin-member-avatar${member.photoURL ? " has-photo" : ""}">
        ${member.photoURL ? `<img src="${escapeAttr(member.photoURL)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <span>${escapeHtml(member.displayName.charAt(0).toUpperCase())}</span>
      </div>
      <div class="admin-member-body">
        <div class="admin-card-heading">
          <span>${member.online ? "Online" : `Last seen ${formatAdminMemberDate(member.lastSeen)}`}</span>
          <button class="btn btn-banri-outline btn-sm" type="button" data-copy-member-uid>Copy UID</button>
        </div>
        <h3>${escapeHtml(member.displayName)}</h3>
        <p class="admin-member-uid">${escapeHtml(member.uid)}</p>
        <div class="admin-member-details">
          <section>
            <span>Signal</span>
            <p>${escapeHtml(signal)}</p>
          </section>
          <section>
            <span>Status</span>
            <p>${escapeHtml(status)}</p>
          </section>
          <section>
            <span>Favorite Games</span>
            <p>${escapeHtml(favorites)}</p>
          </section>
        </div>
        ${renderAdminMemberPlatforms(member.platforms)}
      </div>
    </article>
  `;
}

function renderAdminMemberPlatforms(platforms = {}) {
  const entries = Object.entries(platforms || {}).filter(([, value]) => value);
  if (!entries.length) return '<p class="admin-member-platforms empty">No platform links listed.</p>';
  return `
    <div class="admin-member-platforms">
      ${entries.map(([key, value]) => `<span title="${escapeAttr(value)}">${escapeHtml(platformLabel(key))}</span>`).join("")}
    </div>
  `;
}

function platformLabel(key) {
  return {
    youtube: "YouTube",
    twitch: "Twitch",
    steam: "Steam",
    discord: "Discord",
    website: "Website"
  }[key] || key;
}

function formatAdminMemberDate(value) {
  const date = new Date(Number(value || 0));
  if (Number.isNaN(date.getTime()) || !Number(value)) return "unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
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

function renderActivityPreview() {
  elements.activityPreview.innerHTML = state.activityFeed
    .slice(0, 5)
    .map((item) => `
      <article class="admin-card admin-activity-row">
        <div>
          <span>${escapeHtml(item.category || "Update")}</span>
          <h3>${escapeHtml(item.title || "Activity")}</h3>
          <p>${escapeHtml(item.message || "")}</p>
        </div>
        <time>${escapeHtml(item.date || "Live")} ${escapeHtml(item.time || "")}<small>${escapeHtml(item.actorName || "Banri")}</small></time>
      </article>
    `)
    .join("");
}

function confirmAdminAction(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    let dialog = document.getElementById("adminConfirmDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "adminConfirmDialog";
      dialog.className = "relay-confirm-dialog";
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `
      <form method="dialog">
        <div>
          <p class="banri-modal-kicker">Admin Confirmation</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
        <footer>
          <button class="button" value="cancel">Cancel</button>
          <button class="button button--danger" type="button" data-admin-confirm-accept>Delete</button>
        </footer>
      </form>
    `;

    const accept = dialog.querySelector("[data-admin-confirm-accept]");
    const cleanup = () => {
      accept?.removeEventListener("click", acceptHandler);
      dialog.removeEventListener("close", closeHandler);
    };
    const acceptHandler = () => {
      cleanup();
      dialog.close("confirm");
      resolve(true);
    };
    const closeHandler = () => {
      cleanup();
      resolve(dialog.returnValue === "confirm");
    };

    accept?.addEventListener("click", acceptHandler);
    dialog.addEventListener("close", closeHandler, { once: true });
    dialog.showModal();
  });
}

function renderAll() {
  renderCurrentEditor();
  renderLibraryEditor();
  renderSteamAdmin();
  renderChroniclesAiEditor();
  renderFeedEditor();
  renderQuotesEditor();
  renderHomepageEditor();
  renderWorldServersEditor();
  renderGalleryEditor();
  renderMembersEditor();
  renderActivityPreview();
}

async function loadData() {
  const data = await loadPublicSiteData();
  state.games = data.gamesLibrary.length ? data.gamesLibrary : [...defaultGamesLibrary];
  state.currentGames = data.currentGames.length ? data.currentGames : [...defaultCurrentGames];
  state.tacticalFeed = data.tacticalFeed.length ? data.tacticalFeed : [...defaultTacticalFeed];
  state.quotes = normalizeQuotes(data.quotes);
  state.hero = normalizeHeroCopy(data.hero);
  state.heroVisual = normalizeHeroVisual(data.heroVisual);
  state.featuredClip = normalizeFeaturedClip(data.featuredClip);
  state.steamConfig = normalizeSteamConfig(data.steamConfig);
  state.steamSignal = normalizeSteamSignal(data.steamSignal);
  state.chroniclesAiConfig = normalizeChroniclesAiConfig(data.chroniclesAiConfig);
  state.activityFeed = data.activityFeed.length ? data.activityFeed : [...defaultActivity];
  state.worldServers = await loadAdminWorldServers();
  await loadMedalClipOptions();
  await loadGalleryState();
  renderAll();
}

async function loadGalleryState() {
  const gallery = await loadGalleryData();
  state.galleryCollections = gallery.collections;
  state.galleryImagesByCollection = gallery.imagesByCollection;
}

async function loadMedalClipOptions() {
  try {
    state.medalClips = await fetchMedalClips();
    state.medalClipsError = "";
    if ((!state.featuredClip?.id && !state.featuredClip?.url) && state.medalClips.length) {
      state.featuredClip = normalizeFeaturedClip(state.medalClips[1] || state.medalClips[0]);
    }
  } catch (error) {
    state.medalClips = [];
    state.medalClipsError = error?.message || "Medal clips could not be loaded.";
  }
}

function readCurrentGames() {
  return [...document.querySelectorAll("[data-current-index]")]
    .map((row, index) => normalizeCurrentGame({
      title: row.querySelector('[data-current-field="title"]').value,
      status: row.querySelector('[data-current-field="status"]').value,
      tone: row.querySelector('[data-current-field="tone"]').value,
      meta: row.querySelector('[data-current-field="meta"]').value,
      url: row.querySelector('[data-current-field="url"]').value,
      image: row.querySelector('[data-current-field="image"]').value
    }, index))
    .slice(0, 4);
}

function readGames() {
  return state.games.map((game, index) => normalizeGame({
    ...game,
    recentRank: index + 1
  }, index));
}

async function persistGameLibrary(message = "Game library saved.") {
  state.games = readGames();
  await saveGamesLibrary(state.games);
  await pushActivity(activityMeta({ category: "Library", title: "Game library updated", message })).catch(() => {});
  renderLibraryEditor();
  renderCurrentEditor();
  renderGalleryEditor();
}

function readFeed() {
  return [...document.querySelectorAll("[data-feed-index]")]
    .map((row) => normalizeFeedItem({
      enabled: row.querySelector('[data-feed-field="enabled"]').checked,
      category: row.querySelector('[data-feed-field="category"]').value,
      icon: row.querySelector('[data-feed-field="icon"]').value,
      dynamic: row.querySelector('[data-feed-field="dynamic"]').value,
      time: row.querySelector('[data-feed-field="time"]').value,
      message: row.querySelector('[data-feed-field="message"]').value
    }));
}

function readQuotes() {
  const quotes = structuredClone(defaultQuotes);
  document.querySelectorAll("[data-quote-field]").forEach((input) => {
    const [group, field] = input.dataset.quoteField.split(".");
    quotes[group][field] = input.value.trim();
  });
  return normalizeQuotes(quotes);
}

function readHomepage() {
  const hero = structuredClone(defaultHeroCopy);
  document.querySelectorAll("[data-home-field]").forEach((input) => {
    hero[input.dataset.homeField] = input.value.trim();
  });
  hero.sideLines = [...document.querySelectorAll("[data-home-side]")]
    .sort((a, b) => Number(a.dataset.homeSide) - Number(b.dataset.homeSide))
    .map((input) => input.value.trim())
    .filter(Boolean)
    .slice(0, 3);
  return normalizeHeroCopy(hero);
}

function readHeroVisual() {
  const visual = structuredClone(defaultHeroVisual);
  visual.images = state.heroVisual.images;
  document.querySelectorAll("[data-hero-visual-field]").forEach((input) => {
    if (input.dataset.heroVisualField === "intervalMinutes") {
      visual.intervalMinutes = Number(input.value || defaultHeroVisual.intervalMinutes);
      return;
    }
    visual[input.dataset.heroVisualField] = input.value;
  });
  return normalizeHeroVisual(visual);
}

function readFeaturedClip() {
  const selectedKey = document.querySelector("[data-featured-clip-select]")?.value || "";
  const selected = state.medalClips.find((clip) => clip.id === selectedKey || clip.url === selectedKey);
  return normalizeFeaturedClip(selected || state.featuredClip);
}

function readWorldServers() {
  return [...document.querySelectorAll("[data-world-server-index]")]
    .map((row, index) => {
      const getField = (field) => row.querySelector(`[data-server-field="${field}"]`);
      const rules = String(getField("rules")?.value || "")
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean);
      return normalizeWorldServer({
        id: getField("id")?.value || getField("title")?.value,
        title: getField("title")?.value,
        game: getField("game")?.value,
        host: getField("host")?.value,
        status: getField("status")?.value,
        region: getField("region")?.value,
        description: getField("description")?.value,
        steamAddress: getField("steamAddress")?.value,
        steamP2P: getField("steamP2P")?.value,
        joinUrl: getField("joinUrl")?.value,
        image: getField("image")?.value,
        rules,
        notes: getField("notes")?.value,
        visibility: getField("visibility")?.value,
        enabled: getField("enabled")?.checked !== false,
        order: Number(getField("order")?.value || index + 1)
      }, index);
    });
}

function updateFeaturedClipPreview() {
  const featured = normalizeFeaturedClip(state.featuredClip);
  const card = elements.homepageEditor?.querySelector(".featured-clip-admin");
  card?.querySelector(".admin-card-preview")?.style.setProperty("--preview-image", `url('${featured.thumbnail || "/assets/img/hero/banri-hero-03.webp"}')`);
  const help = card?.querySelector(".admin-help");
  if (help) {
    help.textContent = `${featured.title || "Choose a Medal clip"} / ${featured.game || "Medal Clip"} / ${featured.date || "Featured transmission"}`;
  }
}

async function saveFeaturedClipSetting() {
  const nextFeaturedClip = readFeaturedClip();
  if (!nextFeaturedClip.url && !nextFeaturedClip.video) {
    throw new Error("Choose a Medal clip before saving.");
  }

  state.featuredClip = nextFeaturedClip;
  await saveSiteConfigPatch({ featuredClip: state.featuredClip });
  const savedData = await loadPublicSiteData();
  state.featuredClip = normalizeFeaturedClip(savedData.featuredClip);
  await pushActivity(activityMeta({ category: "Homepage", title: "Featured clip updated", message: state.featuredClip.title || "Homepage featured Medal clip changed." })).catch(() => {});
  renderHomepageEditor();
  setStatus(`Featured clip saved: ${state.featuredClip.title}`, "success");
}

function setupNewGameModal() {
  const status = document.getElementById("newGameStatus");
  const tone = document.getElementById("newGameTone");
  const categories = document.getElementById("newGameCategories");
  if (status && !status.options.length) {
    status.innerHTML = optionList(STATUS_OPTIONS, "Occasional");
  }
  if (tone && !tone.options.length) {
    tone.innerHTML = optionList(TONE_OPTIONS, "blue");
  }
  if (categories) {
    categories.innerHTML = categoryOptionList(["RPG"]);
  }

  const syncPageLinkState = () => {
    const checkbox = document.getElementById("newGameCreatePage");
    const linkInput = document.getElementById("newGameLink");
    const slugSource = document.getElementById("newGameSlug")?.value || document.getElementById("newGameTitle")?.value || "";
    const slug = slugSource.trim() ? slugify(slugSource) : "";
    const enabled = checkbox?.checked !== false;
    if (linkInput) {
      linkInput.disabled = !enabled;
      if (!enabled) linkInput.value = "";
      else if (!linkInput.value.trim() && slug) linkInput.value = `/game.html?id=${slug}`;
    }
  };

  const resetNewGameModal = () => {
    const fields = {
      newGameTitle: "",
      newGameSlug: "",
      newGameDescription: "",
      newGameCustomCategories: "",
      newGameImage: "/assets/banri-hero-noir.png",
      newGameLink: ""
    };
    Object.entries(fields).forEach(([id, value]) => {
      const input = document.getElementById(id);
      if (input) input.value = value;
    });
    if (status) status.value = "Occasional";
    if (tone) tone.value = "blue";
    if (categories) {
      categories.innerHTML = categoryOptionList(["RPG"]);
      [...categories.options].forEach((option) => {
        option.selected = option.value === "RPG";
      });
    }
    const createPage = document.getElementById("newGameCreatePage");
    if (createPage) createPage.checked = true;
    syncPageLinkState();
  };

  document.getElementById("newGameTitle")?.addEventListener("input", (event) => {
    const slugInput = document.getElementById("newGameSlug");
    const linkInput = document.getElementById("newGameLink");
    if (!slugInput || !linkInput) return;
    const slug = slugify(slugInput.value || event.target.value);
    if (!slugInput.value.trim()) slugInput.value = slug;
    if (document.getElementById("newGameCreatePage")?.checked !== false && (!linkInput.value.trim() || /\/game\.html\?id=/i.test(linkInput.value))) {
      linkInput.value = `/game.html?id=${slug}`;
    }
  });

  document.getElementById("newGameSlug")?.addEventListener("input", (event) => {
    const linkInput = document.getElementById("newGameLink");
    if (!linkInput) return;
    const slug = slugify(event.target.value);
    if (document.getElementById("newGameCreatePage")?.checked !== false && (!linkInput.value.trim() || linkInput.value.includes("/game.html?id="))) {
      linkInput.value = `/game.html?id=${slug}`;
    }
  });

  document.getElementById("newGameCreatePage")?.addEventListener("change", syncPageLinkState);
  document.getElementById("adminAddGameModal")?.addEventListener("show.bs.modal", resetNewGameModal);
}

function setGalleryFile(file) {
  if (!file) return;
  if (!file.type?.startsWith("image/")) {
    setStatus("Gallery uploads need to be image files.", "error");
    return;
  }
  state.galleryFile = file;
  renderGalleryEditor();
  setStatus(`Ready to upload ${file.name}.`, "info");
}

async function handleCreateGalleryCollection() {
  const gameId = document.getElementById("galleryGameSelect")?.value;
  const game = state.games.find((item) => item.id === gameId);
  if (!game) {
    setStatus("Choose a game before creating a collection.", "error");
    return;
  }

  await saveGalleryCollection({
    id: game.id,
    gameId: game.id,
    title: game.title,
    description: game.description,
    coverArt: game.art,
    order: state.galleryCollections.length + 1
  });
  await pushActivity(activityMeta({ category: "Gallery", title: `${game.title} collection prepared`, message: "A gallery collection was created from the admin console." }));
  await loadGalleryState();
  renderGalleryEditor();
  setStatus(`${game.title} gallery collection created.`, "success");
}

async function handleGalleryUpload() {
  const collectionId = document.getElementById("galleryCollectionSelect")?.value;
  const collection = state.galleryCollections.find((item) => item.id === collectionId);
  if (!collection) {
    setStatus("Create or select a gallery collection first.", "error");
    return;
  }
  if (!state.galleryFile) {
    setStatus("Choose an image before uploading.", "error");
    return;
  }

  const title = document.getElementById("galleryImageTitle")?.value.trim()
    || state.galleryFile.name.replace(/\.[^.]+$/, "")
    || collection.title;
  setStatus("Saving image to Realtime Database...");
  const asset = await uploadGalleryImageAsset({
    file: state.galleryFile,
    collectionId: collection.id,
    gameId: collection.gameId,
    title,
    uid: state.user?.uid || ""
  });
  await saveGalleryImageMetadata({
    ...asset,
    collectionId: collection.id,
    gameId: collection.gameId,
    title,
    uploadedBy: state.user?.uid || ""
  });
  await pushActivity(activityMeta({ category: "Gallery", title: `${collection.title} image uploaded`, message: title }));
  state.galleryFile = null;
  await loadGalleryState();
  renderGalleryEditor();
  setStatus("Gallery image saved and published.", "success");
}

async function handleDeleteGalleryCollection(collectionId) {
  const collection = state.galleryCollections.find((item) => item.id === collectionId);
  if (!collection) return;
  if (!await confirmAdminAction(`Delete the ${collection.title} gallery collection and its database images?`, "Delete Collection")) return;

  await deleteGalleryCollection(collection.id);
  await pushActivity(activityMeta({ category: "Gallery", title: `${collection.title} collection removed`, message: "A gallery collection was deleted from the admin console." }));
  await loadGalleryState();
  renderGalleryEditor();
  setStatus(`${collection.title} gallery collection deleted.`, "success");
}

function bindAdminEvents() {
  document.addEventListener("click", (event) => {
    if (event.target.closest("#checkChroniclesAiButton")) {
      checkChroniclesAiWorker();
    }
  });

  document.getElementById("saveCurrentGamesButton")?.addEventListener("click", async () => {
    state.currentGames = readCurrentGames();
    await saveSiteConfigPatch({ currentGames: state.currentGames });
    await pushActivity(activityMeta({ category: "Gaming", title: "Current rotation updated", message: "Homepage currently playing cards were updated." }));
    setStatus("Current games saved.", "success");
  });

  document.getElementById("saveLibraryButton")?.addEventListener("click", async () => {
    await persistGameLibrary("Game statuses, images, or records were updated.");
    renderAll();
    setStatus("Game library saved.", "success");
  });

  document.getElementById("saveFeedButton")?.addEventListener("click", async () => {
    state.tacticalFeed = readFeed();
    await saveSiteConfigPatch({ tacticalFeed: state.tacticalFeed });
    await pushActivity(activityMeta({ category: "Feed", title: "Tactical feed updated", message: "Homepage tactical feed settings were updated." }));
    setStatus("Tactical feed saved.", "success");
  });

  document.getElementById("addFeedButton")?.addEventListener("click", () => {
    state.tacticalFeed = readFeed();
    state.tacticalFeed.push(normalizeFeedItem({
      category: "Update",
      icon: "gear",
      enabled: true,
      dynamic: "",
      message: "New tactical feed item.",
      time: "Live"
    }));
    renderFeedEditor();
    setStatus("Feed item added locally. Save Feed to publish it.", "info");
  });

  document.getElementById("saveQuotesButton")?.addEventListener("click", async () => {
    state.quotes = readQuotes();
    await saveSiteConfigPatch({ quotes: state.quotes });
    await pushActivity(activityMeta({ category: "Quotes", title: "Quote updated", message: "Homepage or library quote copy was changed." }));
    setStatus("Quotes saved.", "success");
  });

  document.getElementById("saveHomepageButton")?.addEventListener("click", async () => {
    state.hero = readHomepage();
    state.heroVisual = readHeroVisual();
    state.featuredClip = readFeaturedClip();
    await saveSiteConfigPatch({ hero: state.hero, heroVisual: state.heroVisual, featuredClip: state.featuredClip });
    const savedData = await loadPublicSiteData();
    state.featuredClip = normalizeFeaturedClip(savedData.featuredClip);
    await pushActivity(activityMeta({ category: "Homepage", title: "Homepage updated", message: "Hero copy, visual rotation, or featured clip settings were updated." }));
    renderHomepageEditor();
    setStatus("Homepage settings saved.", "success");
  });

  document.getElementById("seedDefaultsButton")?.addEventListener("click", async () => {
    state.games = [...defaultGamesLibrary];
    state.currentGames = [...defaultCurrentGames];
    state.tacticalFeed = [...defaultTacticalFeed];
    state.quotes = structuredClone(defaultQuotes);
    state.hero = structuredClone(defaultHeroCopy);
    state.heroVisual = structuredClone(defaultHeroVisual);
    state.featuredClip = structuredClone(defaultFeaturedClip);
    state.worldServers = [...defaultWorldServers];
    state.chroniclesAiConfig = structuredClone(defaultChroniclesAiConfig);
    await saveGamesLibrary(state.games);
    await saveWorldServers(state.worldServers);
    await saveSiteConfigPatch({
      currentGames: state.currentGames,
      tacticalFeed: state.tacticalFeed,
      quotes: state.quotes,
      hero: state.hero,
      heroVisual: state.heroVisual,
      featuredClip: state.featuredClip,
      chroniclesAi: state.chroniclesAiConfig
    });
    await pushActivity(activityMeta({ category: "System", title: "Defaults seeded", message: "Firebase site defaults were initialized." }));
    renderAll();
    setStatus("Defaults seeded to Firebase.", "success");
  });

  document.getElementById("addWorldServerButton")?.addEventListener("click", () => {
    state.worldServers = readWorldServers();
    state.worldServers.push(normalizeWorldServer({
      title: "New Hosted World",
      game: "Hosted Server",
      host: "Dathost",
      status: "Online",
      region: "US Central",
      description: "New hosted server waiting for details.",
      steamAddress: "",
      joinUrl: "",
      image: "/assets/img/hero/banri-hero-05.webp",
      rules: ["Server rules pending."],
      notes: "",
      order: state.worldServers.length + 1,
      enabled: true
    }, state.worldServers.length));
    renderWorldServersEditor();
    setStatus("Server added locally. Save Servers to publish it.", "info");
  });

  document.getElementById("saveWorldServersButton")?.addEventListener("click", async () => {
    state.worldServers = readWorldServers();
    await saveWorldServers(state.worldServers);
    await pushActivity(activityMeta({ category: "Worlds", title: "Hosted worlds updated", message: "World server access records were updated." })).catch(() => {});
    renderWorldServersEditor();
    setStatus("World servers saved.", "success");
  });

  document.getElementById("submitNewGameButton")?.addEventListener("click", async () => {
    const title = document.getElementById("newGameTitle")?.value.trim() || "New Game";
    const nextId = slugify(document.getElementById("newGameSlug")?.value || title);
    const hasPage = document.getElementById("newGameCreatePage")?.checked !== false;
    const link = hasPage
      ? (document.getElementById("newGameLink")?.value || `/game.html?id=${nextId}`)
      : "";
    state.games.push(normalizeGame({
      id: nextId,
      title,
      description: document.getElementById("newGameDescription")?.value || "Placeholder profile created from the admin console.",
      categories: readNewGameCategories().length ? readNewGameCategories() : ["Unsorted"],
      status: document.getElementById("newGameStatus")?.value || "Occasional",
      tone: document.getElementById("newGameTone")?.value || "blue",
      link,
      hasPage,
      art: document.getElementById("newGameImage")?.value || "/assets/banri-hero-noir.png",
      steamName: title,
      hours: 0,
      completion: 0,
      recentRank: state.games.length + 1
    }));
    try {
      await persistGameLibrary(`${title} was added to the game library.`);
      bootstrap.Modal.getInstance(document.getElementById("adminAddGameModal"))?.hide();
      setStatus(`${title} saved to Firebase.`, "success");
    } catch (error) {
      setStatus(error.message || "Could not save the new game to Firebase.", "error");
    }
  });

  document.getElementById("saveSteamConfigButton")?.addEventListener("click", async () => {
    state.steamConfig = readSteamConfig();
    await saveSiteConfigPatch({ steam: state.steamConfig });
    renderSteamAdmin();
    setStatus("Steam sync config saved.", "success");
  });

  document.getElementById("saveChroniclesAiButton")?.addEventListener("click", async () => {
    state.chroniclesAiConfig = readChroniclesAiConfig();
    await saveSiteConfigPatch({ chroniclesAi: state.chroniclesAiConfig });
    await pushActivity(activityMeta({
      category: "Chronicles",
      title: "Chronicles AI signal updated",
      message: state.chroniclesAiConfig.workerUrl ? "AI Assist and Story So Far summary controls were updated." : "Chronicles AI Worker URL was cleared."
    })).catch(() => {});
    renderChroniclesAiEditor();
    setStatus("Chronicles AI settings saved.", "success");
  });

  document.getElementById("syncSteamButton")?.addEventListener("click", async (event) => {
    const button = event.currentTarget;
    button.disabled = true;
    button.textContent = "Syncing...";
    setStatus("Contacting Steam signal Worker...");

    try {
      state.steamConfig = readSteamConfig();
      await saveSiteConfigPatch({ steam: state.steamConfig });
      const fetchedSignal = await fetchSteamSignal(state.steamConfig);
      state.steamSignal = state.steamConfig.syncLibrary
        ? applySteamSignalToLibrary(fetchedSignal)
        : normalizeSteamSignal(fetchedSignal);
      state.steamSignal = await saveSteamSignal(state.steamSignal);

      if (state.steamConfig.syncLibrary) {
        await saveGamesLibrary(state.games);
        const savedData = await loadPublicSiteData();
        state.games = savedData.gamesLibrary.length ? savedData.gamesLibrary : state.games;
        renderLibraryEditor();
        renderCurrentEditor();
        renderGalleryEditor();
        refreshOpenGameEditor();
      }

      await pushActivity(activityMeta({
        category: "Steam",
        title: "Steam signal synced",
        message: `${state.steamSignal.summary.totalHours.toLocaleString()} Steam hours scanned across ${state.steamSignal.summary.totalGames} games.`
      })).catch(() => {});

      renderSteamAdmin();
      setStatus(`Steam signal synced. ${state.steamSignal.libraryMatches.length} library record${state.steamSignal.libraryMatches.length === 1 ? "" : "s"} matched.`, "success");
    } catch (error) {
      setStatus(error.message || "Steam sync failed.", "error");
    } finally {
      button.disabled = false;
      button.textContent = "Sync Steam Signal";
    }
  });

  document.getElementById("publishActivityButton")?.addEventListener("click", async () => {
    const entry = {
      category: document.getElementById("activityCategory").value,
      title: document.getElementById("activityTitle").value,
      message: document.getElementById("activityMessage").value,
      date: document.getElementById("activityDate").value || new Date().toISOString().slice(0, 10),
      time: document.getElementById("activityTime").value || new Date().toTimeString().slice(0, 5),
      actorName: document.getElementById("activityActor").value.trim() || state.user?.displayName || state.user?.email || "Banri",
      actorUid: state.user?.uid || "",
      enabled: true
    };
    const savedEntry = await pushActivity(entry);
    state.activityFeed.unshift(savedEntry);
    state.activityFeed = state.activityFeed.slice(0, 25);
    renderActivityPreview();
    setStatus("Activity published.", "success");
  });

  elements.homepageEditor?.addEventListener("click", (event) => {
    const saveButton = event.target.closest("#saveFeaturedClipButton");
    if (!saveButton) return;
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";
    saveFeaturedClipSetting()
      .then(() => {
        if (saveButton.isConnected) {
          saveButton.disabled = false;
          saveButton.textContent = "Save Featured Clip";
        }
      })
      .catch((error) => {
        saveButton.disabled = false;
        saveButton.textContent = "Save Featured Clip";
        setStatus(error.message || "Could not save featured clip.", "error");
      });
  });

  elements.homepageEditor?.addEventListener("change", (event) => {
    if (!event.target.matches("[data-featured-clip-select]")) return;
    state.featuredClip = readFeaturedClip();
    updateFeaturedClipPreview();
    setStatus("Featured clip selected locally. Save Homepage to publish it.", "info");
  });

  elements.galleryEditor?.addEventListener("click", (event) => {
    if (event.target.id === "galleryFileInput") return;
    const createButton = event.target.closest("#createGalleryCollectionButton");
    const uploadButton = event.target.closest("#uploadGalleryImageButton");
    const deleteCollectionButton = event.target.closest("[data-delete-gallery-collection]");
    const dropzone = event.target.closest("#galleryDropzone");

    if (createButton) {
      handleCreateGalleryCollection().catch((error) => setStatus(error.message || "Collection creation failed.", "error"));
      return;
    }

    if (deleteCollectionButton) {
      const row = deleteCollectionButton.closest("[data-gallery-collection-id]");
      handleDeleteGalleryCollection(row?.dataset.galleryCollectionId).catch((error) => setStatus(error.message || "Collection deletion failed.", "error"));
      return;
    }

    if (uploadButton) {
      handleGalleryUpload().catch((error) => setStatus(error.message || "Gallery upload failed.", "error"));
      return;
    }

    if (dropzone) {
      document.getElementById("galleryFileInput")?.click();
    }
  });

  elements.galleryEditor?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const dropzone = event.target.closest("#galleryDropzone");
    if (!dropzone) return;
    event.preventDefault();
    document.getElementById("galleryFileInput")?.click();
  });

  elements.galleryEditor?.addEventListener("change", (event) => {
    if (event.target.id !== "galleryFileInput") return;
    setGalleryFile(event.target.files?.[0]);
  });

  elements.galleryEditor?.addEventListener("dragover", (event) => {
    if (!event.target.closest("#galleryDropzone")) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  });

  elements.galleryEditor?.addEventListener("drop", (event) => {
    if (!event.target.closest("#galleryDropzone")) return;
    event.preventDefault();
    setGalleryFile(event.dataTransfer.files?.[0]);
  });

  elements.worldsEditor?.addEventListener("click", (event) => {
    const deleteButton = event.target.closest("[data-delete-world-server]");
    if (!deleteButton) return;
    const row = deleteButton.closest("[data-world-server-index]");
    const index = Number(row?.dataset.worldServerIndex);
    if (!Number.isFinite(index)) return;
    state.worldServers = readWorldServers().filter((_, itemIndex) => itemIndex !== index);
    renderWorldServersEditor();
    setStatus("Server removed locally. Save Servers to publish the deletion.", "info");
  });

  elements.worldsEditor?.addEventListener("input", (event) => {
    const imageInput = event.target.closest('[data-server-field="image"]');
    if (!imageInput) return;
    const row = imageInput.closest("[data-world-server-index]");
    row?.querySelector(".admin-card-preview")?.style.setProperty("--preview-image", `url('${imageInput.value}')`);
  });

  elements.librarySearch?.addEventListener("input", (event) => {
    state.librarySearch = event.target.value || "";
    renderLibraryEditor();
  });

  elements.membersSearch?.addEventListener("input", (event) => {
    state.memberSearch = event.target.value || "";
    renderMembersEditor();
  });

  elements.membersEditor?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-copy-member-uid]");
    if (!button) return;
    const card = button.closest("[data-member-uid]");
    const uid = card?.dataset.memberUid || "";
    copyTextToClipboard(uid)
      .then(() => setStatus(`Copied UID: ${uid}`, "success"))
      .catch(() => setStatus("Could not copy that UID from this browser.", "error"));
  });

  elements.libraryEditor?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-game]");
    if (!button) return;
    const row = button.closest("[data-game-index]");
    openGameEditor(Number(row.dataset.gameIndex));
  });

  document.getElementById("saveEditedGameButton")?.addEventListener("click", async () => {
    if (state.editingGameIndex < 0) return;
    const game = readEditedGame();
    state.games[state.editingGameIndex] = game;
    try {
      await persistGameLibrary(`${game.title} was updated in the game library.`);
      bootstrap.Modal.getInstance(elements.editGameModal)?.hide();
      setStatus(`${game.title} saved to Firebase.`, "success");
    } catch (error) {
      setStatus(error.message || "Could not save that game to Firebase.", "error");
    }
  });

  document.getElementById("deleteEditedGameButton")?.addEventListener("click", async () => {
    const game = state.games[state.editingGameIndex];
    if (!game) return;
    if (!await confirmAdminAction(`Delete ${game.title} from the library records?`, "Delete Game Record")) return;
    state.games.splice(state.editingGameIndex, 1);
    state.editingGameIndex = -1;
    try {
      await persistGameLibrary(`${game.title} was removed from the game library.`);
      bootstrap.Modal.getInstance(elements.editGameModal)?.hide();
      setStatus(`${game.title} removed from Firebase.`, "success");
    } catch (error) {
      setStatus(error.message || "Could not delete that game from Firebase.", "error");
    }
  });

  elements.feedEditor?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-delete-feed]");
    if (!button) return;
    const row = button.closest("[data-feed-index]");
    state.tacticalFeed = readFeed();
    state.tacticalFeed.splice(Number(row.dataset.feedIndex), 1);
    renderFeedEditor();
    setStatus("Feed item removed locally. Save Feed to publish it.", "info");
  });

  elements.currentEditor?.addEventListener("change", (event) => {
    const select = event.target.closest("[data-current-source]");
    if (!select || select.value === "") return;

    const row = select.closest("[data-current-index]");
    const game = state.games[Number(select.value)];
    if (!game || !row) return;

    row.querySelector('[data-current-field="title"]').value = game.title;
    row.querySelector('[data-current-field="status"]').value = game.status;
    row.querySelector('[data-current-field="tone"]').value = game.tone || statusToTone(game.status);
    row.querySelector('[data-current-field="meta"]').value = game.description;
    row.querySelector('[data-current-field="url"]').value = game.link;
    row.querySelector('[data-current-field="image"]').value = game.art;
    row.querySelector(".admin-card-preview").style.setProperty("--preview-image", `url('${game.art}')`);
  });

  document.addEventListener("input", (event) => {
    const imageInput = event.target.matches('[data-current-field="image"], [data-game-field="art"], [data-edit-game-field="art"]') ? event.target : null;
    if (!imageInput) return;
    if (imageInput.matches('[data-edit-game-field="art"]')) {
      document.querySelector("#adminEditGameBody .admin-card-preview")?.style.setProperty("--preview-image", `url('${imageInput.value}')`);
      return;
    }
    const row = imageInput.closest(".admin-card");
    row?.querySelector(".admin-card-preview")?.style.setProperty("--preview-image", `url('${imageInput.value}')`);
  });
}

function setupDateDefault() {
  const date = document.getElementById("activityDate");
  if (date) date.value = new Date().toISOString().slice(0, 10);
  const time = document.getElementById("activityTime");
  if (time) time.value = new Date().toTimeString().slice(0, 5);
  const actor = document.getElementById("activityActor");
  if (actor && state.user) actor.value = state.user.displayName || state.user.email || "Banri";
}

async function handleAuth(user) {
  state.user = user;

  if (!user) {
    cleanupMemberRoster();
    if (elements.uidText) elements.uidText.textContent = "Not signed in.";
    showLocked("Sign in with the Login button to check Nexus admin access.", "Signed Out");
    return;
  }

  if (elements.uidText) elements.uidText.textContent = `UID: ${user.uid}`;
  state.isAdmin = await isAdminUid(user.uid);

  if (!state.isAdmin) {
    cleanupMemberRoster();
    showLocked(`Signed in as ${user.email || user.uid}, but this UID is not listed under admins/{uid}: true.`, "Denied");
    return;
  }

  showConsole();
  setStatus("Admin channel authenticated.", "success");
  setupDateDefault();
  subscribeMemberRoster();
  await loadData();
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

bindAdminEvents();
setupNewGameModal();
setupDateDefault();

const { auth } = getFirebaseServices();
onAuthStateChanged(auth, (user) => {
  handleAuth(user).catch((error) => {
    showLocked(error.message || "Admin console failed to initialize.", "Error");
  });
});
