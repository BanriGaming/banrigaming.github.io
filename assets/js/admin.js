import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  ICON_OPTIONS,
  STATUS_OPTIONS,
  TONE_OPTIONS,
  defaultActivity,
  defaultCurrentGames,
  defaultGamesLibrary,
  defaultHeroCopy,
  defaultHeroVisual,
  defaultQuotes,
  defaultTacticalFeed,
  deleteGalleryCollection,
  getFirebaseServices,
  isAdminUid,
  loadGalleryData,
  loadPublicSiteData,
  normalizeCurrentGame,
  normalizeFeedItem,
  normalizeGame,
  normalizeHeroCopy,
  normalizeHeroVisual,
  normalizeQuotes,
  pushActivity,
  saveGalleryCollection,
  saveGalleryImageMetadata,
  saveGamesLibrary,
  saveSiteConfigPatch,
  slugify,
  statusToTone,
  uploadGalleryImageAsset
} from "./site-store.js";

const state = {
  user: null,
  isAdmin: false,
  games: [...defaultGamesLibrary],
  currentGames: [...defaultCurrentGames],
  tacticalFeed: [...defaultTacticalFeed],
  quotes: structuredClone(defaultQuotes),
  hero: structuredClone(defaultHeroCopy),
  heroVisual: structuredClone(defaultHeroVisual),
  activityFeed: [...defaultActivity],
  galleryCollections: [],
  galleryImagesByCollection: {},
  galleryFile: null,
  librarySearch: "",
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
  galleryEditor: document.getElementById("galleryEditor"),
  activityPreview: document.getElementById("activityPreview"),
  librarySearch: document.getElementById("adminLibrarySearch"),
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
          <small>${escapeHtml(game.link)}</small>
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

function readEditedGame() {
  const source = {};
  document.querySelectorAll("[data-edit-game-field]").forEach((input) => {
    source[input.dataset.editGameField] = input.value;
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
  const hero = normalizeHeroCopy(state.hero);
  const visual = normalizeHeroVisual(state.heroVisual);
  elements.homepageEditor.innerHTML = `
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
  `;
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
  renderFeedEditor();
  renderQuotesEditor();
  renderHomepageEditor();
  renderGalleryEditor();
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
  state.activityFeed = data.activityFeed.length ? data.activityFeed : [...defaultActivity];
  await loadGalleryState();
  renderAll();
}

async function loadGalleryState() {
  const gallery = await loadGalleryData();
  state.galleryCollections = gallery.collections;
  state.galleryImagesByCollection = gallery.imagesByCollection;
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

function setupNewGameModal() {
  const status = document.getElementById("newGameStatus");
  const tone = document.getElementById("newGameTone");
  if (status && !status.options.length) {
    status.innerHTML = optionList(STATUS_OPTIONS, "Occasional");
  }
  if (tone && !tone.options.length) {
    tone.innerHTML = optionList(TONE_OPTIONS, "blue");
  }

  document.getElementById("newGameTitle")?.addEventListener("input", (event) => {
    const slugInput = document.getElementById("newGameSlug");
    const linkInput = document.getElementById("newGameLink");
    if (!slugInput || !linkInput) return;
    const slug = slugify(slugInput.value || event.target.value);
    if (!slugInput.value.trim()) slugInput.value = slug;
    if (!linkInput.value.trim()) linkInput.value = `/game.html?id=${slug}`;
  });

  document.getElementById("newGameSlug")?.addEventListener("input", (event) => {
    const linkInput = document.getElementById("newGameLink");
    if (!linkInput) return;
    const slug = slugify(event.target.value);
    if (!linkInput.value.trim() || linkInput.value.includes("/game.html?id=")) {
      linkInput.value = `/game.html?id=${slug}`;
    }
  });
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
  document.getElementById("saveCurrentGamesButton")?.addEventListener("click", async () => {
    state.currentGames = readCurrentGames();
    await saveSiteConfigPatch({ currentGames: state.currentGames });
    await pushActivity(activityMeta({ category: "Gaming", title: "Current rotation updated", message: "Homepage currently playing cards were updated." }));
    setStatus("Current games saved.", "success");
  });

  document.getElementById("saveLibraryButton")?.addEventListener("click", async () => {
    state.games = readGames();
    await saveGamesLibrary(state.games);
    await pushActivity(activityMeta({ category: "Library", title: "Game library updated", message: "Game statuses, images, or records were updated." }));
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
    await saveSiteConfigPatch({ hero: state.hero, heroVisual: state.heroVisual });
    await pushActivity(activityMeta({ category: "Homepage", title: "Homepage updated", message: "Hero copy or visual rotation settings were updated." }));
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
    await saveGamesLibrary(state.games);
    await saveSiteConfigPatch({
      currentGames: state.currentGames,
      tacticalFeed: state.tacticalFeed,
      quotes: state.quotes,
      hero: state.hero,
      heroVisual: state.heroVisual
    });
    await pushActivity(activityMeta({ category: "System", title: "Defaults seeded", message: "Firebase site defaults were initialized." }));
    renderAll();
    setStatus("Defaults seeded to Firebase.", "success");
  });

  document.getElementById("submitNewGameButton")?.addEventListener("click", () => {
    const title = document.getElementById("newGameTitle")?.value.trim() || "New Game";
    const nextId = slugify(document.getElementById("newGameSlug")?.value || title);
    state.games.push(normalizeGame({
      id: nextId,
      title,
      description: document.getElementById("newGameDescription")?.value || "Placeholder profile created from the admin console.",
      categories: document.getElementById("newGameCategories")?.value || "Unsorted",
      status: document.getElementById("newGameStatus")?.value || "Occasional",
      tone: document.getElementById("newGameTone")?.value || "blue",
      link: document.getElementById("newGameLink")?.value || `/game.html?id=${nextId}`,
      art: document.getElementById("newGameImage")?.value || "/assets/banri-hero-noir.png",
      steamName: title,
      hours: 0,
      completion: 0,
      recentRank: state.games.length + 1
    }));
    renderLibraryEditor();
    renderCurrentEditor();
    bootstrap.Modal.getInstance(document.getElementById("adminAddGameModal"))?.hide();
    setStatus("Game added locally. Save Library to publish it to Firebase.", "info");
  });

  document.getElementById("syncSteamButton")?.addEventListener("click", () => {
    setStatus("Steam hours sync needs a private Steam API proxy/Worker so the API key is not exposed in frontend code. Steam App ID fields are ready for that next step.", "info");
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

  elements.librarySearch?.addEventListener("input", (event) => {
    state.librarySearch = event.target.value || "";
    renderLibraryEditor();
  });

  elements.libraryEditor?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-edit-game]");
    if (!button) return;
    const row = button.closest("[data-game-index]");
    openGameEditor(Number(row.dataset.gameIndex));
  });

  document.getElementById("saveEditedGameButton")?.addEventListener("click", () => {
    if (state.editingGameIndex < 0) return;
    state.games[state.editingGameIndex] = readEditedGame();
    renderLibraryEditor();
    renderCurrentEditor();
    bootstrap.Modal.getInstance(elements.editGameModal)?.hide();
    setStatus("Game updated locally. Save Library to publish it.", "info");
  });

  document.getElementById("deleteEditedGameButton")?.addEventListener("click", async () => {
    const game = state.games[state.editingGameIndex];
    if (!game) return;
    if (!await confirmAdminAction(`Delete ${game.title} from the library records?`, "Delete Game Record")) return;
    state.games.splice(state.editingGameIndex, 1);
    state.editingGameIndex = -1;
    renderLibraryEditor();
    renderCurrentEditor();
    bootstrap.Modal.getInstance(elements.editGameModal)?.hide();
    setStatus("Game removed locally. Save Library to publish it.", "info");
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
    const imageInput = event.target.matches('[data-current-field="image"], [data-game-field="art"]') ? event.target : null;
    if (!imageInput) return;
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
    if (elements.uidText) elements.uidText.textContent = "Not signed in.";
    showLocked("Sign in with the Login button to check Nexus admin access.", "Signed Out");
    return;
  }

  if (elements.uidText) elements.uidText.textContent = `UID: ${user.uid}`;
  state.isAdmin = await isAdminUid(user.uid);

  if (!state.isAdmin) {
    showLocked(`Signed in as ${user.email || user.uid}, but this UID is not listed under admins/{uid}: true.`, "Denied");
    return;
  }

  showConsole();
  setStatus("Admin channel authenticated.", "success");
  setupDateDefault();
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
