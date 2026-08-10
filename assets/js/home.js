const MEDAL_WORKER_URL = "https://medalclips.monkguru-guardian.workers.dev/";

const currentGames = [
  {
    title: "Palworld",
    status: "Active",
    tone: "green",
    meta: "Exploring / Building / Surviving",
    url: "/landing-pages/palworld.html",
    art: "poster-palworld"
  },
  {
    title: "Grounded",
    status: "Returning Soon",
    tone: "amber",
    meta: "Bigger yard / New threats",
    url: "/landing-pages/grounded.html",
    art: "poster-grounded"
  },
  {
    title: "Lord of the Rings Online",
    status: "Occasional",
    tone: "blue",
    meta: "Adventure / Lore / Always home",
    url: "/games.html",
    art: "poster-lotro"
  },
  {
    title: "Helldivers 2",
    status: "Active",
    tone: "green",
    meta: "Drops / Missions / Democracy",
    url: "/landing-pages/helldivers-2.html",
    art: "poster-helldivers"
  }
];

const aiCreations = [
  {
    title: "Lost Spires",
    type: "World Concept",
    art: "ai-spires"
  },
  {
    title: "The Observer",
    type: "Character Study",
    art: "ai-observer"
  },
  {
    title: "The Rift",
    type: "Environment Concept",
    art: "ai-rift"
  }
];

const tacticalFeed = [
  {
    category: "Gaming",
    icon: "gamepad",
    message: "Palworld remains in active rotation.",
    time: "Active"
  },
  {
    category: "Clips",
    icon: "play",
    message: "Latest Medal capture connected to the vault module.",
    time: "Live"
  },
  {
    category: "AI",
    icon: "image",
    message: "New public concept slots prepared for AI creations.",
    time: "Ready"
  },
  {
    category: "Writing",
    icon: "pen",
    message: "Public writing lane reserved without exposing private lore.",
    time: "Planned"
  },
  {
    category: "Projects",
    icon: "gear",
    message: "Nexus launcher structured for future Firebase data.",
    time: "Prototype"
  }
];

let activeCurrentGames = [...currentGames];
let activeTacticalFeed = [...tacticalFeed];
let activeQuotes = null;
let activeHeroCopy = null;
let activeFeaturedClip = null;
let activeHeroVisual = {
  activeId: "01",
  mode: "fixed",
  intervalMinutes: 30,
  images: [
    { id: "01", title: "Noir Gate", image: "/assets/img/hero/banri-hero-01.webp" },
    { id: "02", title: "Rain Circuit", image: "/assets/img/hero/banri-hero-02.webp" },
    { id: "03", title: "Neon Cathedral", image: "/assets/img/hero/banri-hero-03.webp" },
    { id: "04", title: "Rooftop Relay", image: "/assets/img/hero/banri-hero-04.webp" },
    { id: "05", title: "Noir Triad", image: "/assets/img/hero/banri-hero-05.webp" }
  ]
};
let latestMedalClip = null;
let heroVisualTimer = null;

const icons = {
  gamepad: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 10h12a4 4 0 0 1 3.7 5.5l-.8 2.2a2 2 0 0 1-3.4.6L15 16H9l-2.5 2.3a2 2 0 0 1-3.4-.6l-.8-2.2A4 4 0 0 1 6 10Z"/><path d="M8 13v3M6.5 14.5h3M16 14h.01M18.5 14h.01"/></svg>',
  play: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
  image: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 16 5-5 4 4 2-2 7 6"/><circle cx="15" cy="10" r="1"/></svg>',
  pen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10L4 20Z"/><path d="m14 7 3 3"/></svg>',
  gear: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9 7 7M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/></svg>'
};

function renderCurrentGames() {
  const target = document.getElementById("current-games");
  if (!target) return;

  target.innerHTML = activeCurrentGames
    .map((game) => `
      <div class="col-12 col-sm-6 col-xl-3">
        <a class="game-card ${game.art || ""}" href="${escapeAttr(game.url)}" style="${game.image ? `--game-card-image: url('${escapeAttr(game.image)}')` : ""}">
          <span class="status-pill ${game.tone}"><i aria-hidden="true"></i>${escapeHtml(game.status)}</span>
          <strong>${escapeHtml(game.title)}</strong>
          <small>${escapeHtml(game.meta)}</small>
        </a>
      </div>
    `)
    .join("");
}

function renderAiCreations() {
  const target = document.getElementById("ai-grid");
  if (!target) return;

  target.innerHTML = aiCreations
    .map((item) => `
      <div class="col-12 col-md-4">
        <article class="ai-card ${item.art}">
          <div aria-hidden="true"></div>
          <h3>${escapeHtml(item.title)}</h3>
          <p>${escapeHtml(item.type)}</p>
        </article>
      </div>
    `)
    .join("");
}

function normalizeClip(clip, index = 0) {
  const timestamp = clip?.timestamp || "";
  const title = cleanMedalTitle(clip?.title || `Medal Clip ${index + 1}`);
  return {
    id: String(clip?.id || clip?.contentId || clip?.clipId || clip?.url || `${title}-${timestamp}-${index}`),
    title,
    game: clip?.game || formatGameName(clip?.gameSlug),
    gameSlug: clip?.gameSlug || "",
    url: clip?.url || "",
    video: clip?.video || clip?.videoUrl || "",
    thumbnail: clip?.thumbnail || clip?.thumbnailUrl || "",
    timestamp,
    date: clip?.date || formatClipDate(timestamp)
  };
}

async function fetchMedalClipList() {
  const response = await fetch(`${MEDAL_WORKER_URL}?t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }

  const data = await response.json();
  return (Array.isArray(data.clips) ? data.clips : [data])
    .filter(Boolean)
    .map(normalizeClip);
}

function resolveFeaturedClip(clips) {
  const selected = activeFeaturedClip;
  if (selected?.id || selected?.url) {
    const match = clips.find((clip) => (
      selected.id && clip.id === selected.id
    ) || (
      selected.url && clip.url === selected.url
    ));

    if (match) return match;
    return normalizeClip(selected);
  }

  return clips[1] || clips[0] || null;
}

function vaultCardTemplate(clip, badge = "Medal") {
  const title = cleanMedalTitle(clip.title || "Medal Clip");
  const game = clip.game || formatGameName(clip.gameSlug);
  const thumbnail = clip.thumbnail || "";
  const video = clip.video || "";
  const date = clip.date || formatClipDate(clip.timestamp);

  return `
    <article class="vault-card">
      <div class="vault-media">
        ${thumbnail ? `<img src="${escapeHtml(thumbnail)}" alt="">` : ""}
        ${
          video
            ? `<button class="vault-play" type="button" data-video="${escapeHtml(video)}" data-title="${escapeHtml(title)}" data-game="${escapeHtml(game)}" aria-label="Play ${escapeHtml(title)}"><span></span></button>`
            : `<a class="vault-play" href="${escapeHtml(clip.url || "/clips.html")}" target="_blank" rel="noopener" aria-label="Watch ${escapeHtml(title)} on Medal"><span></span></a>`
        }
        <div class="vault-badge">${escapeHtml(badge)}</div>
      </div>
      <div class="vault-info">
        <div>
          <p>${escapeHtml(game)}</p>
          <h3>${escapeHtml(title)}</h3>
          <small>${escapeHtml(date)}</small>
        </div>
        <a class="btn btn-banri-outline btn-sm" href="${escapeHtml(clip.url || "/clips.html")}" target="_blank" rel="noopener">Watch on Medal <span aria-hidden="true">-&gt;</span></a>
      </div>
    </article>
  `;
}

function renderTacticalFeed() {
  const target = document.getElementById("feed-list");
  if (!target) return;

  target.innerHTML = activeTacticalFeed
    .filter((item) => item.enabled !== false)
    .map((item) => {
      const shouldUseLatestMedal = item.dynamic === "latestMedal" || String(item.category || "").toLowerCase() === "clips";
      const feedItem = shouldUseLatestMedal && latestMedalClip
        ? {
          ...item,
          message: latestMedalClip.title,
          time: latestMedalClip.date
        }
        : item;

      return `
        <article class="feed-row">
          <div class="feed-icon">${icons[feedItem.icon] || icons.gear}</div>
          <strong>${escapeHtml(feedItem.category)}</strong>
          <p>${escapeHtml(feedItem.message)}</p>
          <time>${escapeHtml(feedItem.time)}</time>
        </article>
      `;
    })
    .join("");
}

function applyQuotes() {
  if (!activeQuotes?.home) return;

  const line1 = document.getElementById("homeQuoteLine1");
  const line2 = document.getElementById("homeQuoteLine2");
  const author = document.getElementById("homeQuoteAuthor");

  if (line1) line1.textContent = activeQuotes.home.line1 || "";
  if (line2) line2.textContent = activeQuotes.home.line2 || "";
  if (author) author.textContent = `- ${activeQuotes.home.author || "Banri"}`;
}

function applyHeroCopy() {
  if (!activeHeroCopy) return;

  const eyebrow = document.getElementById("homeHeroEyebrow");
  const statement = document.getElementById("homeHeroStatement");
  const copy = document.getElementById("homeHeroCopy");
  const sideNote = document.getElementById("homeHeroSideNote");

  if (eyebrow) {
    const words = String(activeHeroCopy.eyebrow || "")
      .split(/[\/|]+/)
      .map((item) => item.trim())
      .filter(Boolean);
    eyebrow.innerHTML = words.length
      ? words.map((word, index) => `${escapeHtml(word)}${index < words.length - 1 ? " <span></span> " : ""}`).join("")
      : "";
  }

  if (statement) statement.textContent = activeHeroCopy.statement || "";
  if (copy) copy.textContent = activeHeroCopy.copy || "";
  if (sideNote) {
    sideNote.innerHTML = (activeHeroCopy.sideLines || [])
      .slice(0, 3)
      .map((line) => `<span>${escapeHtml(line)}</span>`)
      .join("");
  }
}

function resolveHeroVisualImage() {
  const images = activeHeroVisual.images?.length ? activeHeroVisual.images : [];
  if (!images.length) return null;
  const intervalMs = Math.max(1, Number(activeHeroVisual.intervalMinutes || 30)) * 60 * 1000;
  const slot = Math.floor(Date.now() / intervalMs);
  let activeIndex = images.findIndex((image) => image.id === activeHeroVisual.activeId);

  if (activeHeroVisual.mode === "sequence") {
    activeIndex = slot % images.length;
  } else if (activeHeroVisual.mode === "shuffle") {
    activeIndex = ((slot * 9301 + 49297) % 233280) % images.length;
  }

  return images[Math.max(0, activeIndex)];
}

function renderHeroPagination(activeId) {
  const target = document.querySelector(".hero-pagination");
  if (!target || !activeHeroVisual.images?.length) return;

  target.innerHTML = activeHeroVisual.images
    .map((image) => `
      <li class="${image.id === activeId ? "active" : ""}">
        <button type="button" data-home-hero-id="${escapeAttr(image.id)}" aria-label="Show hero image ${escapeAttr(image.id)}">${escapeHtml(image.id)}</button>
      </li>
    `)
    .join("");
}

function applyHeroVisual() {
  const hero = document.querySelector(".home-hero");
  const image = resolveHeroVisualImage();
  if (!hero || !image) return;

  hero.style.setProperty("--home-hero-image", `url('${image.image}')`);
  renderHeroPagination(image.id);
}

function scheduleHeroVisual() {
  if (heroVisualTimer) {
    window.clearInterval(heroVisualTimer);
    heroVisualTimer = null;
  }

  applyHeroVisual();
  if (activeHeroVisual.mode === "fixed") return;

  heroVisualTimer = window.setInterval(applyHeroVisual, 60 * 1000);
}

function bindHeroPagination() {
  const target = document.querySelector(".hero-pagination");
  if (!target || target.dataset.heroPaginationBound === "true") return;

  target.dataset.heroPaginationBound = "true";
  target.addEventListener("click", (event) => {
    const button = event.target.closest("[data-home-hero-id]");
    if (!button) return;
    activeHeroVisual = {
      ...activeHeroVisual,
      mode: "fixed",
      activeId: button.dataset.homeHeroId
    };
    scheduleHeroVisual();
  });
}

async function loadRemoteSiteData() {
  try {
    const { loadPublicSiteData } = await import("/assets/js/site-store.js");
    const data = await loadPublicSiteData();

    if (data.currentGames.length) {
      activeCurrentGames = data.currentGames;
      renderCurrentGames();
    }

    if (data.tacticalFeed.length) {
      activeTacticalFeed = data.tacticalFeed;
      renderTacticalFeed();
    }

    activeQuotes = data.quotes;
    activeHeroCopy = data.hero;
    activeFeaturedClip = data.featuredClip;
    activeHeroVisual = data.heroVisual || activeHeroVisual;
    applyQuotes();
    applyHeroCopy();
    renderFeaturedClip();
    scheduleHeroVisual();
  } catch {
    applyQuotes();
    scheduleHeroVisual();
  }
}

function renderFeedFallback() {
  const target = document.getElementById("feed-list");
  if (!target) return;

  target.innerHTML = tacticalFeed
    .map((item) => `
      <article class="feed-row">
        <div class="feed-icon">${icons[item.icon] || icons.gear}</div>
        <strong>${escapeHtml(item.category)}</strong>
        <p>${escapeHtml(item.message)}</p>
        <time>${escapeHtml(item.time)}</time>
      </article>
    `)
    .join("");
}

async function renderLatestMedal() {
  const target = document.getElementById("latest-medal");
  if (!target) return;

  try {
    const clip = (await fetchMedalClipList())[0];

    if (!clip || !clip.url) {
      throw new Error("No Medal clip returned.");
    }

    latestMedalClip = { title: clip.title, date: clip.date };
    renderTacticalFeed();
    target.innerHTML = vaultCardTemplate(clip);

    setupVaultPlayback();
  } catch (error) {
    target.innerHTML = `
      <div class="vault-empty">
        Medal vault unavailable: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

async function renderFeaturedClip() {
  const target = document.getElementById("featured-clip");
  if (!target) return;

  try {
    const clips = await fetchMedalClipList();
    const clip = resolveFeaturedClip(clips);

    if (!clip?.url && !clip?.video) {
      throw new Error("No featured Medal clip selected.");
    }

    target.innerHTML = vaultCardTemplate(clip, "Featured");
    setupVaultPlayback();
  } catch (error) {
    target.innerHTML = `
      <div class="vault-empty">
        Featured clip unavailable: ${escapeHtml(error.message)}
      </div>
    `;
  }
}

function setupVaultPlayback() {
  document.querySelectorAll(".vault-play[data-video]").forEach((button) => {
    if (button.dataset.vaultPlaybackBound === "true") return;
    button.dataset.vaultPlaybackBound = "true";
    button.addEventListener("click", () => {
      openClipModal({
        video: button.dataset.video,
        title: button.dataset.title || "Latest Clip",
        game: button.dataset.game || "Medal Clip"
      });
    });
  });
}

function openClipModal(clip) {
  const modal = document.getElementById("clipModal");
  const player = document.getElementById("clipPlayer");
  const title = document.getElementById("clipModalTitle");
  const game = document.getElementById("clipModalGame");

  if (!modal || !player || !title || !game || !clip.video || typeof bootstrap === "undefined") return;

  player.innerHTML = `
    <video controls autoplay playsinline>
      <source src="${escapeHtml(clip.video)}" type="video/mp4">
      Your browser does not support HTML video.
    </video>
  `;
  title.textContent = clip.title;
  game.textContent = clip.game;

  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function setupModalCleanup() {
  const modal = document.getElementById("clipModal");
  const player = document.getElementById("clipPlayer");
  if (!modal || !player) return;

  modal.addEventListener("hidden.bs.modal", () => {
    player.innerHTML = "";
  });
}

function formatGameName(slug) {
  if (!slug) return "Medal Clip";

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanMedalTitle(title) {
  return String(title)
    .replace(/\s*-\s*Clipped.*$/i, "")
    .trim();
}

function formatClipDate(value) {
  if (!value) return "Latest capture";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Latest capture";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
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

renderCurrentGames();
renderTacticalFeed();
bindHeroPagination();
scheduleHeroVisual();
renderLatestMedal();
renderFeaturedClip();
setupModalCleanup();
loadRemoteSiteData();
