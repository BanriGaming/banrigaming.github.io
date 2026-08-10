let gamesData = [
  {
    title: "Palworld",
    description: "Pal skills, survival notes, and creature tracking.",
    categories: ["Survival", "Sandbox"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/palworld.html",
    hours: 128,
    completion: 76,
    art: "/assets/banri-hero.png",
    recentRank: 1
  },
  {
    title: "Grounded",
    description: "Builds, creature data, and backyard survival planning.",
    categories: ["Survival", "Adventure"],
    status: "Returning Soon",
    tone: "amber",
    link: "/landing-pages/grounded.html",
    hours: 32,
    completion: 24,
    art: "/assets/img/bg.jpg",
    recentRank: 2
  },
  {
    title: "Monster Hunter: World",
    description: "Builds, resources, optional quests, and Guiding Lands tools.",
    categories: ["RPG", "Action"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/mhw.html",
    hours: 1250,
    completion: 88,
    art: "/assets/img/Monster-Hunter-World-Banner2.png",
    recentRank: 3
  },
  {
    title: "Monster Hunter: Rise",
    description: "Builds, routes, Switch Skills, and gathering guides.",
    categories: ["RPG", "Action"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/mhr.html",
    hours: 420,
    completion: 69,
    art: "/assets/img/mhr-pointpath1lc.png",
    recentRank: 4
  },
  {
    title: "No Man's Sky",
    description: "Galaxies, glyphs, Pathfinder routes, and exploration records.",
    categories: ["Adventure", "Sandbox"],
    status: "Returning Soon",
    tone: "amber",
    link: "/landing-pages/nms.html",
    hours: 330,
    completion: 40,
    art: "/assets/img/nms/portalbg.jpg",
    recentRank: 5
  },
  {
    title: "Starfield",
    description: "Planetary archive, suit locker, gun locker, and magazines.",
    categories: ["RPG", "Tools"],
    status: "On Hold",
    tone: "purple",
    link: "/landing-pages/starfield.html",
    hours: 226,
    completion: 58,
    art: "/assets/img/starfield/Starfield-Map.png",
    recentRank: 6
  },
  {
    title: "Palia",
    description: "Time calculator, villager gifts, and cozy-life resources.",
    categories: ["Simulation", "Tools"],
    status: "Occasional",
    tone: "blue",
    link: "/landing-pages/palia.html",
    hours: 84,
    completion: 44,
    art: "/assets/banri-hero-noir.png",
    recentRank: 7
  },
  {
    title: "Valheim",
    description: "World notes and screenshot collections from the long road.",
    categories: ["Survival", "Sandbox"],
    status: "On Hold",
    tone: "purple",
    link: "/landing-pages/valheim.html",
    hours: 160,
    completion: 40,
    art: "/assets/banri-hero.png",
    recentRank: 8
  },
  {
    title: "Diablo 4",
    description: "Paragon resources and seasonal tool experiments.",
    categories: ["RPG", "Tools"],
    status: "Occasional",
    tone: "blue",
    link: "/landing-pages/diablo4.html",
    hours: 78,
    completion: 35,
    art: "/assets/banri-hero-noir.png",
    recentRank: 9
  },
  {
    title: "Melvor Idle",
    description: "Calculators for runes, summoning, XP, money, and planning.",
    categories: ["Strategy", "Tools"],
    status: "Completed",
    tone: "cyan",
    link: "/landing-pages/melvor.html",
    hours: 110,
    completion: 100,
    art: "/assets/img/bg.jpg",
    recentRank: 10
  },
  {
    title: "V Rising",
    description: "Server calculator and vampire survival utilities.",
    categories: ["Survival", "Tools"],
    status: "On Hold",
    tone: "purple",
    link: "/vrising/vrisingcalc.html",
    hours: 45,
    completion: 31,
    art: "/assets/banri-hero-noir.png",
    recentRank: 11
  },
  {
    title: "Elden Ring",
    description: "Boss checklist and Lands Between progress tracking.",
    categories: ["RPG", "Adventure"],
    status: "Completed",
    tone: "cyan",
    link: "/Elden%20Ring/erbosschecklist.html",
    hours: 140,
    completion: 100,
    art: "/assets/img/bg.jpg",
    recentRank: 12
  },
  {
    title: "Star Citizen",
    description: "Ship price tools and universe utility experiments.",
    categories: ["Simulation", "Tools"],
    status: "Occasional",
    tone: "blue",
    link: "/starcitizen/scpricer.html",
    hours: 62,
    completion: 18,
    art: "/assets/img/nms/portalbg.jpg",
    recentRank: 13
  },
  {
    title: "Final Fantasy XIV",
    description: "Free company resources, progression notes, and video archive.",
    categories: ["RPG", "Community"],
    status: "On Hold",
    tone: "purple",
    link: "/ff14/resources.html",
    hours: 880,
    completion: 72,
    art: "/assets/img/ff14/hero.180492f4.jpg",
    recentRank: 14
  }
];

let filters = {
  query: "",
  category: "all",
  status: "all",
  sort: "recent"
};

const elements = {
  grid: document.getElementById("gameCardsContainer"),
  search: document.getElementById("library-search"),
  statusSelect: document.getElementById("status-select"),
  genreSelect: document.getElementById("genre-select"),
  sortSelect: document.getElementById("sort-select"),
  categoryList: document.getElementById("category-filter-list"),
  statusList: document.getElementById("status-filter-list"),
  count: document.getElementById("library-count"),
  totalStat: document.getElementById("stat-total-games"),
  activeStat: document.getElementById("stat-active-games"),
  completionStat: document.getElementById("stat-completion")
};

function getCategoryCounts() {
  return gamesData.reduce((map, game) => {
    game.categories.forEach((category) => {
      map.set(category, (map.get(category) || 0) + 1);
    });
    return map;
  }, new Map());
}

function getStatusCounts() {
  return gamesData.reduce((map, game) => {
    map.set(game.status, (map.get(game.status) || 0) + 1);
    return map;
  }, new Map());
}

function setupControls() {
  if (!elements.grid) return;

  const categories = [...getCategoryCounts().keys()].sort();
  const statuses = [...getStatusCounts().keys()].sort();

  categories.forEach((category) => {
    elements.genreSelect?.appendChild(new Option(category, category));
  });

  statuses.forEach((status) => {
    elements.statusSelect?.appendChild(new Option(status, status));
  });

  renderFilterButtons(elements.categoryList, "category", [["All Games", "all", gamesData.length], ...categories.map((category) => [category, category, getCategoryCounts().get(category)])]);
  renderFilterButtons(elements.statusList, "status", [["All Status", "all", gamesData.length], ...statuses.map((status) => [status, status, getStatusCounts().get(status)])]);

  elements.search?.addEventListener("input", (event) => {
    filters.query = event.target.value.trim().toLowerCase();
    renderGames();
  });

  elements.genreSelect?.addEventListener("change", (event) => {
    filters.category = event.target.value;
    setFilterButtonState("category", filters.category);
    renderGames();
  });

  elements.statusSelect?.addEventListener("change", (event) => {
    filters.status = event.target.value;
    setFilterButtonState("status", filters.status);
    renderGames();
  });

  elements.sortSelect?.addEventListener("change", (event) => {
    filters.sort = event.target.value;
    renderGames();
  });
}

function renderFilterButtons(target, type, items) {
  if (!target) return;

  target.innerHTML = items
    .map(([label, value, count]) => `
      <button class="filter-button ${value === "all" ? "active" : ""}" type="button" data-filter-type="${type}" data-filter-value="${escapeHtml(value)}">
        <span>${escapeHtml(label)}</span>
        <strong>${count}</strong>
      </button>
    `)
    .join("");

  target.querySelectorAll("button").forEach((button) => {
    button.addEventListener("click", () => {
      filters[type] = button.dataset.filterValue;
      if (type === "category" && elements.genreSelect) elements.genreSelect.value = filters.category;
      if (type === "status" && elements.statusSelect) elements.statusSelect.value = filters.status;
      setFilterButtonState(type, filters[type]);
      renderGames();
    });
  });
}

function setFilterButtonState(type, value) {
  document.querySelectorAll(`[data-filter-type="${type}"]`).forEach((button) => {
    button.classList.toggle("active", button.dataset.filterValue === value);
  });
}

function getFilteredGames() {
  const query = filters.query;

  return gamesData
    .filter((game) => {
      const matchesQuery = !query || `${game.title} ${game.description} ${game.categories.join(" ")}`.toLowerCase().includes(query);
      const matchesCategory = filters.category === "all" || game.categories.includes(filters.category);
      const matchesStatus = filters.status === "all" || game.status === filters.status;
      return matchesQuery && matchesCategory && matchesStatus;
    })
    .sort((a, b) => {
      if (filters.sort === "title") return a.title.localeCompare(b.title);
      if (filters.sort === "hours") return b.hours - a.hours;
      if (filters.sort === "completion") return b.completion - a.completion;
      return a.recentRank - b.recentRank;
    });
}

function renderStats() {
  const active = gamesData.filter((game) => game.status === "Active").length;
  const completion = Math.round(gamesData.reduce((sum, game) => sum + game.completion, 0) / gamesData.length);

  if (elements.totalStat) elements.totalStat.textContent = String(gamesData.length);
  if (elements.activeStat) elements.activeStat.textContent = String(active);
  if (elements.completionStat) elements.completionStat.textContent = `${completion}%`;
}

function renderGames() {
  const games = getFilteredGames();

  if (elements.count) {
    elements.count.textContent = `${games.length} Result${games.length === 1 ? "" : "s"}`;
  }

  if (!elements.grid) return;

  if (!games.length) {
    elements.grid.innerHTML = '<div class="library-empty">No games match this signal.</div>';
    return;
  }

  elements.grid.innerHTML = games
    .map((game) => `
      <a class="library-card" href="${escapeAttr(game.link)}" style="--card-image: url('${escapeAttr(game.art)}')">
        <div class="library-card-media">
          <span class="status-pill ${escapeHtml(game.tone)}"><i aria-hidden="true"></i>${escapeHtml(game.status)}</span>
        </div>
        <div class="library-card-body">
          <h3>${escapeHtml(game.title)}</h3>
          <p>${escapeHtml(game.description)}</p>
          <div class="library-card-meta">
            <span>${game.hours.toLocaleString()} hrs</span>
            <span>${game.completion}%</span>
          </div>
        </div>
      </a>
    `)
    .join("");
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

function applyLibraryQuote(quotes) {
  const text = document.getElementById("libraryQuoteText");
  const author = document.getElementById("libraryQuoteAuthor");
  if (!quotes?.library) return;

  if (text) text.textContent = quotes.library.text || "";
  if (author) author.textContent = `- ${quotes.library.author || "Banri"}`;
}

async function loadRemoteLibraryData() {
  try {
    const { loadPublicSiteData } = await import("/assets/js/site-store.js");
    const data = await loadPublicSiteData();
    if (data.gamesLibrary.length) gamesData = data.gamesLibrary;
    applyLibraryQuote(data.quotes);
  } catch {
    // Defaults stay active when Firebase is not configured yet.
  }
}

async function initLibrary() {
  await loadRemoteLibraryData();
  setupControls();
  renderStats();
  renderGames();
}

initLibrary();
