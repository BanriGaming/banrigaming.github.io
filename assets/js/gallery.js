import { loadGalleryData } from "./site-store.js";

const state = {
  collections: [],
  imagesByCollection: {},
  activeCollectionId: "",
  activeIndex: 0
};

const elements = {
  grid: document.getElementById("galleryCollectionGrid"),
  stage: document.getElementById("galleryStage"),
  kicker: document.getElementById("galleryStageKicker"),
  title: document.getElementById("galleryStageTitle"),
  slider: document.getElementById("gallerySlider"),
  thumbs: document.getElementById("galleryThumbs"),
  prev: document.getElementById("galleryPrevButton"),
  next: document.getElementById("galleryNextButton")
};

function renderCollections() {
  if (!elements.grid) return;

  elements.grid.innerHTML = state.collections
    .map((collection) => `
      <button class="gallery-card gallery-collection-card${collection.id === state.activeCollectionId ? " active" : ""}" type="button" data-gallery-collection="${escapeAttr(collection.id)}" style="--gallery-image: url('${escapeAttr(collection.coverArt)}')">
        <span>${escapeHtml(collection.imageCount || 0)} image${collection.imageCount === 1 ? "" : "s"}</span>
        <h2>${escapeHtml(collection.title)}</h2>
        <p>Open Collection</p>
      </button>
    `)
    .join("");
}

function renderStage() {
  const collection = state.collections.find((item) => item.id === state.activeCollectionId);
  if (!elements.stage || !elements.slider || !elements.thumbs || !collection) return;

  const images = state.imagesByCollection[collection.id] || [];
  elements.stage.hidden = false;
  elements.kicker.textContent = `// ${collection.id}`;
  elements.title.textContent = collection.title;
  elements.prev.disabled = images.length <= 1;
  elements.next.disabled = images.length <= 1;

  if (!images.length) {
    elements.slider.innerHTML = `
      <article class="gallery-empty-slide" style="--gallery-empty-image: url('${escapeAttr(collection.coverArt)}')">
        <div>
          <p class="banri-modal-kicker mb-2">Awaiting Uploads</p>
          <h3>${escapeHtml(collection.title)}</h3>
          <span>No screenshots have been published to this collection yet.</span>
        </div>
      </article>
    `;
    elements.thumbs.innerHTML = "";
    return;
  }

  state.activeIndex = Math.max(0, Math.min(state.activeIndex, images.length - 1));
  const active = images[state.activeIndex];
  elements.slider.innerHTML = `
    <figure class="gallery-slide">
      <img src="${escapeAttr(active.url)}" alt="${escapeAttr(active.title)}" />
      <figcaption>
        <span>${String(state.activeIndex + 1).padStart(2, "0")} / ${String(images.length).padStart(2, "0")}</span>
        <strong>${escapeHtml(active.title)}</strong>
      </figcaption>
    </figure>
  `;
  elements.thumbs.innerHTML = images
    .map((image, index) => `
      <button class="${index === state.activeIndex ? "active" : ""}" type="button" data-gallery-index="${index}" aria-label="Show ${escapeAttr(image.title)}">
        <img src="${escapeAttr(image.url)}" alt="" />
      </button>
    `)
    .join("");
}

function selectCollection(collectionId, index = 0) {
  state.activeCollectionId = collectionId;
  state.activeIndex = index;
  renderCollections();
  renderStage();
  elements.stage?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function stepGallery(direction) {
  const images = state.imagesByCollection[state.activeCollectionId] || [];
  if (!images.length) return;
  state.activeIndex = (state.activeIndex + direction + images.length) % images.length;
  renderStage();
}

function bindEvents() {
  elements.grid?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-collection]");
    if (!button) return;
    selectCollection(button.dataset.galleryCollection);
  });

  elements.thumbs?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-gallery-index]");
    if (!button) return;
    state.activeIndex = Number(button.dataset.galleryIndex || 0);
    renderStage();
  });

  elements.prev?.addEventListener("click", () => stepGallery(-1));
  elements.next?.addEventListener("click", () => stepGallery(1));
}

async function init() {
  bindEvents();
  try {
    const data = await loadGalleryData();
    state.collections = data.collections;
    state.imagesByCollection = data.imagesByCollection;
    renderCollections();

    const requested = new URLSearchParams(window.location.search).get("collection");
    const firstWithImages = state.collections.find((collection) => data.imagesByCollection[collection.id]?.length);
    const initial = state.collections.find((collection) => collection.id === requested) || firstWithImages;
    if (initial) selectCollection(initial.id);
  } catch (error) {
    if (elements.grid) {
      elements.grid.innerHTML = `<div class="vault-empty">Gallery unavailable: ${escapeHtml(error.message)}</div>`;
    }
  }
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
