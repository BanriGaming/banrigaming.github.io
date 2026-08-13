const WORKER_URL = "https://medalclips.monkguru-guardian.workers.dev/";

let allClips = [];
const clipState = {
  gameSlug: "all",
  query: "",
  sort: "newest"
};

fetch(`${WORKER_URL}?t=${Date.now()}`, {
  cache: "no-store"
})
  .then((response) => {
    if (!response.ok) {
      throw new Error(`Worker returned ${response.status}`);
    }

    return response.json();
  })
  .then((data) => {
    if (!Array.isArray(data.clips)) {
      throw new Error("Worker response does not contain a clips array.");
    }

    allClips = data.clips;
    updateClipCount(allClips.length);
    createGameNavigation();
    applyClipFilters();
  })
  .catch((error) => {
    const gallery = document.getElementById("clips-gallery");
    if (gallery) {
      gallery.innerHTML = `
        <div class="empty-message">
          Could not load clips: ${escapeHtml(error.message)}
        </div>
      `;
    }
  });

function updateClipCount(count) {
  const target = document.getElementById("clip-count");
  if (target) target.textContent = String(count);
}

function formatGameName(slug) {
  if (!slug) return "Unknown Game";

  return slug
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function cleanClipTitle(title) {
  return String(title || "Untitled Clip")
    .replace(/\s*-\s*Clipped.*$/i, "")
    .trim();
}

function createGameNavigation() {
  const nav = document.getElementById("game-navigation");
  if (!nav) return;

  const games = [
    ...new Set(
      allClips
        .map((clip) => clip.gameSlug)
        .filter(Boolean)
    )
  ].sort();

  nav.innerHTML = "";

  const allButton = createFilterButton(`All (${allClips.length})`, true, () => {
    clipState.gameSlug = "all";
    setActiveButton(allButton);
    applyClipFilters();
  });

  nav.appendChild(allButton);

  games.forEach((game) => {
    const gameClips = allClips.filter((clip) => clip.gameSlug === game);
    const button = createFilterButton(`${formatGameName(game)} (${gameClips.length})`, false, () => {
      clipState.gameSlug = game;
      setActiveButton(button);
      applyClipFilters();
    });

    nav.appendChild(button);
  });
}

function createFilterButton(label, active, onClick) {
  const button = document.createElement("button");
  button.className = `game-button${active ? " active" : ""}`;
  button.type = "button";
  button.textContent = label;
  button.addEventListener("click", onClick);
  return button;
}

function setActiveButton(activeButton) {
  document.querySelectorAll(".game-button").forEach((button) => {
    button.classList.remove("active");
  });

  activeButton.classList.add("active");
}

function applyClipFilters() {
  const query = clipState.query.trim().toLowerCase();
  const filtered = allClips
    .filter((clip) => clipState.gameSlug === "all" || clip.gameSlug === clipState.gameSlug)
    .filter((clip) => {
      if (!query) return true;
      const haystack = [
        cleanClipTitle(clip.title),
        formatGameName(clip.gameSlug),
        clip.gameSlug,
        formatClipDate(clip.timestamp)
      ].join(" ").toLowerCase();
      return haystack.includes(query);
    })
    .sort(sortClips);

  updateFilterStatus(filtered.length);
  renderClips(filtered);
}

function sortClips(a, b) {
  if (clipState.sort === "oldest") {
    return clipTime(a) - clipTime(b);
  }
  if (clipState.sort === "title") {
    return cleanClipTitle(a.title).localeCompare(cleanClipTitle(b.title));
  }
  if (clipState.sort === "game") {
    return formatGameName(a.gameSlug).localeCompare(formatGameName(b.gameSlug))
      || cleanClipTitle(a.title).localeCompare(cleanClipTitle(b.title));
  }
  return clipTime(b) - clipTime(a);
}

function clipTime(clip) {
  const date = new Date(clip.timestamp || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
}

function updateFilterStatus(count) {
  const status = document.getElementById("clip-filter-status");
  if (!status) return;
  const game = clipState.gameSlug === "all" ? "all games" : formatGameName(clipState.gameSlug);
  const search = clipState.query ? ` matching "${clipState.query}"` : "";
  status.textContent = `${count} of ${allClips.length} clips shown / ${game}${search}`;
}

function renderClips(clips) {
  const gallery = document.getElementById("clips-gallery");
  if (!gallery) return;

  if (!clips.length) {
    gallery.innerHTML = '<div class="empty-message">No clips found for this signal.</div>';
    return;
  }

  gallery.innerHTML = `
    <div class="clips-grid">
      ${clips
        .map((clip) => {
          const title = cleanClipTitle(clip.title);
          const game = formatGameName(clip.gameSlug);
          const timestamp = formatClipDate(clip.timestamp);

          return `
            <article class="clip-card">
              <button class="clip-image-wrap" type="button" data-video="${escapeHtml(clip.video || "")}" data-title="${escapeHtml(title)}" data-game="${escapeHtml(game)}" data-url="${escapeHtml(clip.url || "#")}" aria-label="Play ${escapeHtml(title)}">
                ${
                  clip.thumbnail
                    ? `<img class="clip-image" src="${escapeHtml(clip.thumbnail)}" alt="">`
                    : '<div class="clip-image clip-placeholder"></div>'
                }
                <span class="play-button" aria-hidden="true"><span></span></span>
              </button>
              <div class="clip-info">
                <div class="clip-game">${escapeHtml(game)}</div>
                <h2 class="clip-title">${escapeHtml(title)}</h2>
                <div class="clip-date">${escapeHtml(timestamp)}</div>
              </div>
            </article>
          `;
        })
        .join("")}
    </div>
  `;

  gallery.querySelectorAll(".clip-image-wrap").forEach((button) => {
    button.addEventListener("click", () => {
      openClipModal({
        video: button.dataset.video,
        title: button.dataset.title,
        game: button.dataset.game,
        url: button.dataset.url
      });
    });
  });

  gallery.querySelectorAll(".clip-image").forEach((image) => {
    image.addEventListener("error", () => {
      const placeholder = document.createElement("div");
      placeholder.className = "clip-image clip-placeholder";
      image.replaceWith(placeholder);
    }, { once: true });
  });
}

function openClipModal(clip) {
  const modal = document.getElementById("clip-modal");
  const player = document.getElementById("clip-modal-player");
  const game = document.getElementById("clip-modal-game");
  const title = document.getElementById("clip-modal-title");
  const link = document.getElementById("clip-modal-link");

  if (!modal || !player || !game || !title || !link) return;

  if (clip.video) {
    player.innerHTML = `
      <video controls autoplay playsinline>
        <source src="${escapeHtml(clip.video)}" type="video/mp4">
        Your browser does not support HTML video.
      </video>
    `;
  } else {
    player.innerHTML = '<div class="empty-message">This clip opens on Medal.</div>';
  }

  game.textContent = clip.game || "Medal Clip";
  title.textContent = clip.title || "Clip";
  link.href = clip.url || "#";

  modal.classList.add("active");
  modal.setAttribute("aria-hidden", "false");
  document.body.classList.add("clip-modal-open");
}

function closeClipModal() {
  const modal = document.getElementById("clip-modal");
  const player = document.getElementById("clip-modal-player");
  if (!modal || !player) return;

  modal.classList.remove("active");
  modal.setAttribute("aria-hidden", "true");
  player.innerHTML = "";
  document.body.classList.remove("clip-modal-open");
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

document.getElementById("clipSearch")?.addEventListener("input", (event) => {
  clipState.query = event.target.value || "";
  applyClipFilters();
});

document.getElementById("clipSort")?.addEventListener("change", (event) => {
  clipState.sort = event.target.value || "newest";
  applyClipFilters();
});

document.getElementById("clip-modal-close")?.addEventListener("click", closeClipModal);
document.querySelector(".clip-modal-backdrop")?.addEventListener("click", closeClipModal);
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeClipModal();
});
