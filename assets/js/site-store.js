import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  get,
  getDatabase,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const MEDAL_WORKER_URL = "https://medalclips.monkguru-guardian.workers.dev/";
export const ACTIVITY_RECENT_LIMIT = 25;
export const DEFAULT_STEAM_ID64 = "76561198134543238";

export const STATUS_OPTIONS = ["Active", "Returning Soon", "On Hold", "Completed", "Occasional"];
export const TONE_OPTIONS = ["green", "amber", "blue", "purple", "cyan", "red", "aqua", "yellow", "white", "orange"];
export const ICON_OPTIONS = ["gamepad", "play", "image", "pen", "gear"];

export const defaultSteamConfig = {
  steamId: DEFAULT_STEAM_ID64,
  proxyUrl: "",
  countryCode: "us",
  syncLibrary: true
};

export const defaultSteamSignal = {
  profile: {
    steamId: DEFAULT_STEAM_ID64,
    personaName: "Banri",
    profileUrl: "https://steamcommunity.com/id/--Banri--/",
    avatar: "",
    avatarFull: "",
    countryCode: "US",
    timeCreated: 0,
    accountAgeYears: 0,
    level: 0
  },
  summary: {
    totalGames: 0,
    playedGames: 0,
    neverPlayedGames: 0,
    playedPercent: 0,
    totalHours: 0,
    averagePlaytime: 0,
    syncedAt: 0,
    source: "Steam Web API"
  },
  buckets: [],
  games: [],
  recentGames: [],
  libraryMatches: []
};

export const defaultGamesLibrary = [
  {
    id: "palworld",
    title: "Palworld",
    description: "Pal skills, survival notes, and creature tracking.",
    categories: ["Survival", "Sandbox"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/palworld.html",
    hours: 128,
    completion: 76,
    art: "/assets/banri-hero.png",
    steamAppId: "1623730",
    steamName: "Palworld",
    recentRank: 1
  },
  {
    id: "grounded",
    title: "Grounded",
    description: "Builds, creature data, and backyard survival planning.",
    categories: ["Survival", "Adventure"],
    status: "Returning Soon",
    tone: "amber",
    link: "/landing-pages/grounded.html",
    hours: 32,
    completion: 24,
    art: "/assets/img/bg.jpg",
    steamAppId: "962130",
    steamName: "Grounded",
    recentRank: 2
  },
  {
    id: "mhw",
    title: "Monster Hunter: World",
    description: "Builds, resources, optional quests, and Guiding Lands tools.",
    categories: ["RPG", "Action"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/mhw.html",
    hours: 1250,
    completion: 88,
    art: "/assets/img/Monster-Hunter-World-Banner2.png",
    steamAppId: "582010",
    steamName: "Monster Hunter: World",
    recentRank: 3
  },
  {
    id: "helldivers-2",
    title: "Helldivers 2",
    description: "Democratic deployment notes, clips, and a reserved hub for future mission records.",
    categories: ["Shooter", "Co-op"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/helldivers-2.html",
    hours: 94,
    completion: 62,
    art: "/assets/img/hero/banri-hero-05.webp",
    steamAppId: "553850",
    steamName: "HELLDIVERS 2",
    recentRank: 4
  },
  {
    id: "mhr",
    title: "Monster Hunter: Rise",
    description: "Builds, routes, Switch Skills, and gathering guides.",
    categories: ["RPG", "Action"],
    status: "Active",
    tone: "green",
    link: "/landing-pages/mhr.html",
    hours: 420,
    completion: 69,
    art: "/assets/img/mhr-pointpath1lc.png",
    steamAppId: "1446780",
    steamName: "MONSTER HUNTER RISE",
    recentRank: 4
  },
  {
    id: "nms",
    title: "No Man's Sky",
    description: "Galaxies, glyphs, Pathfinder routes, and exploration records.",
    categories: ["Adventure", "Sandbox"],
    status: "Returning Soon",
    tone: "amber",
    link: "/landing-pages/nms.html",
    hours: 330,
    completion: 40,
    art: "/assets/img/nms/portalbg.jpg",
    steamAppId: "275850",
    steamName: "No Man's Sky",
    recentRank: 5
  },
  {
    id: "starfield",
    title: "Starfield",
    description: "Planetary archive, suit locker, gun locker, and magazines.",
    categories: ["RPG", "Tools"],
    status: "On Hold",
    tone: "purple",
    link: "/landing-pages/starfield.html",
    hours: 226,
    completion: 58,
    art: "/assets/img/starfield/Starfield-Map.webp",
    steamAppId: "1716740",
    steamName: "Starfield",
    recentRank: 6
  },
  {
    id: "palia",
    title: "Palia",
    description: "Time calculator, villager gifts, and cozy-life resources.",
    categories: ["Simulation", "Tools"],
    status: "Occasional",
    tone: "blue",
    link: "/landing-pages/palia.html",
    hours: 84,
    completion: 44,
    art: "/assets/banri-hero-noir.png",
    steamAppId: "2707930",
    steamName: "Palia",
    recentRank: 7
  },
  {
    id: "valheim",
    title: "Valheim",
    description: "World notes and screenshot collections from the long road.",
    categories: ["Survival", "Sandbox"],
    status: "On Hold",
    tone: "purple",
    link: "/landing-pages/valheim.html",
    hours: 160,
    completion: 40,
    art: "/assets/banri-hero.png",
    steamAppId: "892970",
    steamName: "Valheim",
    recentRank: 8
  },
  {
    id: "diablo-4",
    title: "Diablo 4",
    description: "Paragon resources and seasonal tool experiments.",
    categories: ["RPG", "Tools"],
    status: "Occasional",
    tone: "blue",
    link: "/landing-pages/diablo4.html",
    hours: 78,
    completion: 35,
    art: "/assets/banri-hero-noir.png",
    steamAppId: "2344520",
    steamName: "Diablo IV",
    recentRank: 9
  },
  {
    id: "melvor-idle",
    title: "Melvor Idle",
    description: "Calculators for runes, summoning, XP, money, and planning.",
    categories: ["Strategy", "Tools"],
    status: "Completed",
    tone: "cyan",
    link: "/landing-pages/melvor.html",
    hours: 110,
    completion: 100,
    art: "/assets/img/bg.jpg",
    steamAppId: "1267910",
    steamName: "Melvor Idle",
    recentRank: 10
  },
  {
    id: "v-rising",
    title: "V Rising",
    description: "Server calculator and vampire survival utilities.",
    categories: ["Survival", "Tools"],
    status: "On Hold",
    tone: "purple",
    link: "/vrising/vrisingcalc.html",
    hours: 45,
    completion: 31,
    art: "/assets/banri-hero-noir.png",
    steamAppId: "1604030",
    steamName: "V Rising",
    recentRank: 11
  },
  {
    id: "elden-ring",
    title: "Elden Ring",
    description: "Boss checklist and Lands Between progress tracking.",
    categories: ["RPG", "Adventure"],
    status: "Completed",
    tone: "cyan",
    link: "/Elden%20Ring/erbosschecklist.html",
    hours: 140,
    completion: 100,
    art: "/assets/img/bg.jpg",
    steamAppId: "1245620",
    steamName: "ELDEN RING",
    recentRank: 12
  },
  {
    id: "star-citizen",
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
    id: "ffxiv",
    title: "Final Fantasy XIV",
    description: "Free company resources, progression notes, and video archive.",
    categories: ["RPG", "Community"],
    status: "On Hold",
    tone: "purple",
    link: "/ff14/resources.html",
    hours: 880,
    completion: 72,
    art: "/assets/img/ff14/hero.180492f4.jpg",
    steamAppId: "39210",
    steamName: "FINAL FANTASY XIV Online",
    recentRank: 14
  }
];

export const defaultCurrentGames = [
  {
    title: "Palworld",
    status: "Active",
    tone: "green",
    meta: "Exploring / Building / Surviving",
    url: "/landing-pages/palworld.html",
    image: "/assets/banri-hero.png",
    art: "poster-palworld"
  },
  {
    title: "Grounded",
    status: "Returning Soon",
    tone: "amber",
    meta: "Bigger yard / New threats",
    url: "/landing-pages/grounded.html",
    image: "/assets/img/bg.jpg",
    art: "poster-grounded"
  },
  {
    title: "Lord of the Rings Online",
    status: "Occasional",
    tone: "blue",
    meta: "Adventure / Lore / Always home",
    url: "/games.html",
    image: "/assets/img/nms/portalbg.jpg",
    art: "poster-lotro"
  },
  {
    title: "Helldivers 2",
    status: "Active",
    tone: "green",
    meta: "Drops / Missions / Democracy",
    url: "/landing-pages/helldivers-2.html",
    image: "/assets/banri-hero-noir.png",
    art: "poster-helldivers"
  }
];

export const defaultTacticalFeed = [
  {
    category: "Gaming",
    icon: "gamepad",
    enabled: true,
    message: "Palworld remains in active rotation.",
    time: "Active"
  },
  {
    category: "Clips",
    icon: "play",
    enabled: true,
    dynamic: "latestMedal",
    message: "Latest Medal clip loading.",
    time: "Live"
  },
  {
    category: "AI",
    icon: "image",
    enabled: true,
    message: "New public concept slots prepared for AI creations.",
    time: "Ready"
  },
  {
    category: "Writing",
    icon: "pen",
    enabled: true,
    message: "Public writing lane reserved without exposing private lore.",
    time: "Planned"
  },
  {
    category: "Projects",
    icon: "gear",
    enabled: true,
    message: "Nexus launcher structured for Firebase-powered data.",
    time: "Prototype"
  }
];

export const defaultQuotes = {
  home: {
    line1: "Better worlds don't just happen.",
    line2: "They're built.",
    author: "Banri"
  },
  library: {
    text: "It is not about the games you play. It is about the worlds you remember.",
    author: "Banri"
  }
};

export const defaultHeroCopy = {
  eyebrow: "Create / Play / Explore",
  statement: "Stories. Games. Worlds. Ideas.",
  copy: "A digital realm built on curiosity, creativity, and the worlds that move us.",
  sideLines: [
    "Same sky.",
    "Different worlds.",
    "Let's see what's out there."
  ]
};

export const defaultHeroImages = [
  {
    id: "01",
    title: "Noir Gate",
    image: "/assets/img/hero/banri-hero-01.webp"
  },
  {
    id: "02",
    title: "Rain Circuit",
    image: "/assets/img/hero/banri-hero-02.webp"
  },
  {
    id: "03",
    title: "Neon Cathedral",
    image: "/assets/img/hero/banri-hero-03.webp"
  },
  {
    id: "04",
    title: "Rooftop Relay",
    image: "/assets/img/hero/banri-hero-04.webp"
  },
  {
    id: "05",
    title: "Noir Triad",
    image: "/assets/img/hero/banri-hero-05.webp"
  }
];

export const defaultHeroVisual = {
  activeId: "01",
  mode: "fixed",
  intervalMinutes: 30,
  images: [...defaultHeroImages]
};

export const defaultFeaturedClip = {
  id: "",
  title: "Featured Clip",
  game: "Medal Clip",
  gameSlug: "",
  url: "",
  video: "",
  thumbnail: "",
  timestamp: "",
  date: "Featured transmission"
};

export const defaultActivity = [
  {
    category: "System",
    title: "Nexus shell upgraded",
    message: "Navbar, login, and activity surfaces moved into the new noir interface.",
    date: "2026-08-07",
    time: "00:00",
    actorName: "Banri",
    enabled: true
  },
  {
    category: "Clips",
    title: "Medal vault connected",
    message: "The latest clip module now powers the homepage vault and tactical feed.",
    date: "2026-08-07",
    time: "00:00",
    actorName: "Banri",
    enabled: true
  }
];

let cachedServices;

export function getFirebaseServices() {
  if (cachedServices) return cachedServices;

  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  cachedServices = {
    app,
    auth: getAuth(app),
    database: getDatabase(app)
  };
  return cachedServices;
}

export function slugify(value) {
  return String(value || "game")
    .toLowerCase()
    .trim()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64) || "game";
}

export function toArray(value) {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (!value || typeof value !== "object") return [];

  return Object.entries(value)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => Number(a.order ?? a.recentRank ?? 0) - Number(b.order ?? b.recentRank ?? 0));
}

export function normalizeGame(game, index = 0) {
  const title = String(game?.title || "Untitled Game").trim();
  const id = slugify(game?.id || title);
  const hasPage = game?.hasPage !== false;
  const rawLink = String(game?.link || (hasPage ? `/game.html?id=${encodeURIComponent(id)}` : "")).trim();
  const normalizedTitle = title.toLowerCase();
  const link = normalizedTitle.includes("helldivers") && rawLink === "/clips.html"
    ? "/landing-pages/helldivers-2.html"
    : normalizedTitle === "palworld" && /\/palworld\/palskills\.html$/i.test(rawLink)
      ? "/landing-pages/palworld.html"
      : rawLink;
  const categories = Array.isArray(game?.categories)
    ? game.categories
    : String(game?.categories || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);

  return {
    id,
    title,
    description: String(game?.description || "A new library entry waiting for notes.").trim(),
    categories,
    status: STATUS_OPTIONS.includes(game?.status) ? game.status : "Occasional",
    tone: TONE_OPTIONS.includes(game?.tone) ? game.tone : statusToTone(game?.status),
    link: hasPage ? link : "",
    hasPage,
    hours: Number(game?.hours || 0),
    completion: Math.max(0, Math.min(100, Number(game?.completion || 0))),
    art: String(game?.art || game?.image || "/assets/banri-hero-noir.png").trim(),
    steamAppId: String(game?.steamAppId || "").trim(),
    steamName: String(game?.steamName || title).trim(),
    recentRank: Number(game?.recentRank || index + 1)
  };
}

export function normalizeSteamConfig(config = {}) {
  const proxyUrl = String(config?.proxyUrl || "").trim();
  const countryCode = String(config?.countryCode || defaultSteamConfig.countryCode)
    .trim()
    .toLowerCase()
    .replace(/[^a-z]/g, "")
    .slice(0, 2) || defaultSteamConfig.countryCode;

  return {
    steamId: String(config?.steamId || DEFAULT_STEAM_ID64).replace(/\D/g, "") || DEFAULT_STEAM_ID64,
    proxyUrl,
    countryCode,
    syncLibrary: config?.syncLibrary !== false
  };
}

function normalizeSteamGame(game = {}) {
  const playtimeMinutes = Math.max(0, Number(game.playtimeMinutes ?? game.playtime_forever ?? game.minutes ?? 0) || 0);
  const appId = String(game.appId ?? game.appid ?? game.app_id ?? "").trim();
  const imgIconUrl = String(game.imgIconUrl || game.img_icon_url || "").trim();

  return {
    appId,
    name: String(game.name || game.title || `Steam App ${appId}`).trim(),
    playtimeMinutes,
    playtimeHours: Number((playtimeMinutes / 60).toFixed(1)),
    imgIconUrl,
    iconUrl: imgIconUrl && appId ? `https://media.steampowered.com/steamcommunity/public/images/apps/${appId}/${imgIconUrl}.jpg` : "",
    hasCommunityVisibleStats: Boolean(game.hasCommunityVisibleStats ?? game.has_community_visible_stats ?? false)
  };
}

function computeSteamBuckets(games = []) {
  const ranges = [
    { label: "25 or more hours", min: 25, max: Infinity },
    { label: "12 to 25 hours", min: 12, max: 25 },
    { label: "6 to 12 hours", min: 6, max: 12 },
    { label: "3 to 6 hours", min: 3, max: 6 },
    { label: "2 to 3 hours", min: 2, max: 3 },
    { label: "1 to 2 hours", min: 1, max: 2 },
    { label: "0 to 1 hours", min: 0, max: 1, playedOnly: true },
    { label: "Never played", min: 0, max: 0, neverPlayed: true }
  ];

  return ranges.map((range) => {
    const count = games.filter((game) => {
      const hours = Number(game.playtimeHours || 0);
      if (range.neverPlayed) return hours === 0;
      if (range.playedOnly) return hours > 0 && hours < 1;
      return hours >= range.min && hours < range.max;
    }).length;
    return { label: range.label, count };
  });
}

export function normalizeSteamSignal(signal = {}) {
  const source = signal.steamSignal || signal.signal || signal;
  const rawProfile = source.profile || {};
  const rawSummary = source.summary || {};
  const games = (Array.isArray(source.games) ? source.games : [])
    .map(normalizeSteamGame)
    .filter((game) => game.appId || game.name)
    .sort((a, b) => Number(b.playtimeMinutes || 0) - Number(a.playtimeMinutes || 0));
  const recentGames = (Array.isArray(source.recentGames) ? source.recentGames : [])
    .map(normalizeSteamGame)
    .filter((game) => game.appId || game.name);
  const totalGames = Number(rawSummary.totalGames ?? source.gameCount ?? games.length) || 0;
  const playedGames = Number(rawSummary.playedGames ?? games.filter((game) => game.playtimeMinutes > 0).length) || 0;
  const neverPlayedGames = Number(rawSummary.neverPlayedGames ?? Math.max(0, totalGames - playedGames)) || 0;
  const totalHours = Number(rawSummary.totalHours ?? games.reduce((sum, game) => sum + game.playtimeMinutes, 0) / 60) || 0;
  const averagePlaytime = Number(rawSummary.averagePlaytime ?? (playedGames ? totalHours / playedGames : 0)) || 0;
  const playedPercent = Number(rawSummary.playedPercent ?? (totalGames ? (playedGames / totalGames) * 100 : 0)) || 0;
  const timeCreated = Number(rawProfile.timeCreated || rawProfile.timecreated || 0) || 0;
  const accountAgeYears = Number(rawProfile.accountAgeYears || (timeCreated ? (Date.now() - timeCreated * 1000) / 31557600000 : 0)) || 0;
  const buckets = Array.isArray(source.buckets) && source.buckets.length
    ? source.buckets.map((bucket) => ({
      label: String(bucket.label || "").trim(),
      count: Number(bucket.count || 0)
    })).filter((bucket) => bucket.label)
    : computeSteamBuckets(games);

  return {
    profile: {
      steamId: String(rawProfile.steamId || rawProfile.steamid || DEFAULT_STEAM_ID64).trim(),
      personaName: String(rawProfile.personaName || rawProfile.personaname || "Banri").trim(),
      profileUrl: String(rawProfile.profileUrl || rawProfile.profileurl || "https://steamcommunity.com/id/--Banri--/").trim(),
      avatar: String(rawProfile.avatar || "").trim(),
      avatarFull: String(rawProfile.avatarFull || rawProfile.avatarfull || rawProfile.avatarMedium || rawProfile.avatarmedium || "").trim(),
      countryCode: String(rawProfile.countryCode || rawProfile.loccountrycode || "").trim().toUpperCase(),
      timeCreated,
      accountAgeYears: Number(accountAgeYears.toFixed(1)),
      level: Number(rawProfile.level || source.level || 0) || 0
    },
    summary: {
      totalGames,
      playedGames,
      neverPlayedGames,
      playedPercent: Number(playedPercent.toFixed(1)),
      totalHours: Number(totalHours.toFixed(1)),
      averagePlaytime: Number(averagePlaytime.toFixed(1)),
      syncedAt: Number(rawSummary.syncedAt || source.syncedAt || Date.now()) || Date.now(),
      source: String(rawSummary.source || source.source || "Steam Web API").trim()
    },
    buckets,
    games,
    recentGames,
    libraryMatches: (Array.isArray(source.libraryMatches) ? source.libraryMatches : []).map((match) => ({
      siteGameId: String(match.siteGameId || "").trim(),
      appId: String(match.appId || "").trim(),
      name: String(match.name || "").trim(),
      playtimeHours: Number(match.playtimeHours || 0)
    }))
  };
}

export function normalizeCurrentGame(game, index = 0) {
  const title = String(game?.title || `Current Game ${index + 1}`).trim();
  const rawUrl = String(game?.url || game?.link || "/games.html").trim();
  const url = title.toLowerCase().includes("helldivers") && rawUrl === "/clips.html"
    ? "/landing-pages/helldivers-2.html"
    : rawUrl;
  return {
    title,
    status: STATUS_OPTIONS.includes(game?.status) ? game.status : "Occasional",
    tone: TONE_OPTIONS.includes(game?.tone) ? game.tone : statusToTone(game?.status),
    meta: String(game?.meta || game?.description || "Session notes pending.").trim(),
    url,
    image: String(game?.image || game?.art || "/assets/banri-hero-noir.png").trim(),
    art: String(game?.art || "").trim()
  };
}

export function normalizeFeedItem(item) {
  return {
    category: String(item?.category || "Update").trim(),
    icon: ICON_OPTIONS.includes(item?.icon) ? item.icon : "gear",
    enabled: item?.enabled !== false,
    dynamic: item?.dynamic || "",
    message: String(item?.message || "Activity pending.").trim(),
    time: String(item?.time || "Live").trim()
  };
}

export function normalizeActivityEntry(entry = {}, index = 0) {
  const now = Date.now();
  const createdAt = Number(entry.createdAt || entry.recordedAt || Date.parse(entry.date || "") || 0) || now - index;
  const date = String(entry.date || new Date(createdAt).toISOString().slice(0, 10));
  const time = String(entry.time || new Date(createdAt).toTimeString().slice(0, 5));

  return {
    id: String(entry.id || `activity-${createdAt}-${index}`),
    category: String(entry.category || "System").trim(),
    title: String(entry.title || "Site updated").trim(),
    message: String(entry.message || "Banri Gaming received an admin update.").trim(),
    date,
    time,
    actorName: String(entry.actorName || entry.updatedByName || entry.author || "Banri").trim(),
    actorUid: String(entry.actorUid || entry.updatedByUid || ""),
    url: String(entry.url || ""),
    enabled: entry.enabled !== false,
    createdAt
  };
}

export function normalizeQuotes(quotes = {}) {
  return {
    home: {
      ...defaultQuotes.home,
      ...(quotes.home || {})
    },
    library: {
      ...defaultQuotes.library,
      ...(quotes.library || {})
    }
  };
}

export function normalizeHeroCopy(hero = {}) {
  const sideLines = Array.isArray(hero.sideLines)
    ? hero.sideLines
    : String(hero.sideLines || "")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

  return {
    ...defaultHeroCopy,
    ...hero,
    sideLines: sideLines.length ? sideLines.slice(0, 3) : [...defaultHeroCopy.sideLines]
  };
}

export function normalizeHeroImage(image, index = 0) {
  const fallback = defaultHeroImages[index] || defaultHeroImages[0];
  const rawId = String(image?.id || fallback.id || index + 1).replace(/\D/g, "");
  const id = rawId.padStart(2, "0").slice(-2);
  const heroImage = String(image?.image || image?.url || fallback.image).trim();

  return {
    id,
    title: String(image?.title || fallback.title || `Hero ${id}`).trim(),
    image: heroImage.replace(/\/assets\/img\/hero\/(banri-hero-\d{2})\.png$/i, "/assets/img/hero/$1.webp")
  };
}

export function normalizeHeroVisual(visual = {}) {
  const images = Array.isArray(visual.images) && visual.images.length
    ? visual.images.map(normalizeHeroImage)
    : defaultHeroImages.map(normalizeHeroImage);
  const mode = ["fixed", "sequence", "shuffle"].includes(visual.mode) ? visual.mode : "fixed";
  const activeId = images.some((image) => image.id === visual.activeId) ? visual.activeId : images[0].id;
  const intervalMinutes = Math.max(1, Math.min(1440, Number(visual.intervalMinutes || defaultHeroVisual.intervalMinutes)));

  return {
    activeId,
    mode,
    intervalMinutes,
    images
  };
}

export function formatMedalGameName(slug) {
  if (!slug) return "Medal Clip";

  return String(slug)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function cleanMedalClipTitle(title) {
  return String(title || "Untitled Clip")
    .replace(/\s*-\s*Clipped.*$/i, "")
    .trim();
}

export function formatMedalClipDate(value) {
  if (!value) return "Featured transmission";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Featured transmission";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  }).format(date);
}

export function normalizeMedalClip(clip = {}, index = 0) {
  const url = String(clip.url || "").trim();
  const timestamp = String(clip.timestamp || clip.createdAt || "").trim();
  const title = cleanMedalClipTitle(clip.title || `Medal Clip ${index + 1}`);
  const id = String(clip.id || clip.contentId || clip.clipId || url || `${title}-${timestamp}-${index}`).trim();

  return {
    id,
    title,
    game: String(clip.game || formatMedalGameName(clip.gameSlug)).trim(),
    gameSlug: String(clip.gameSlug || "").trim(),
    url,
    video: String(clip.video || clip.videoUrl || "").trim(),
    thumbnail: String(clip.thumbnail || clip.thumbnailUrl || "").trim(),
    timestamp,
    date: formatMedalClipDate(timestamp)
  };
}

export function normalizeFeaturedClip(clip = {}) {
  return {
    ...defaultFeaturedClip,
    ...normalizeMedalClip(clip),
    id: String(clip?.id || clip?.url || defaultFeaturedClip.id).trim(),
    title: cleanMedalClipTitle(clip?.title || defaultFeaturedClip.title),
    game: String(clip?.game || formatMedalGameName(clip?.gameSlug) || defaultFeaturedClip.game).trim(),
    date: String(clip?.date || formatMedalClipDate(clip?.timestamp) || defaultFeaturedClip.date).trim()
  };
}

export function normalizeGalleryCollection(collection = {}, index = 0) {
  const title = String(collection.title || collection.gameTitle || "Untitled Collection").trim();
  const id = slugify(collection.id || collection.gameId || title);

  return {
    id,
    gameId: slugify(collection.gameId || id),
    title,
    description: String(collection.description || "Screenshot transmission pending.").trim(),
    coverArt: String(collection.coverArt || collection.art || collection.image || "/assets/img/hero/banri-hero-01.webp").trim(),
    link: String(collection.link || `/gallery.html?collection=${encodeURIComponent(id)}`).trim(),
    order: Number(collection.order || index + 1)
  };
}

export function normalizeGalleryImage(image = {}, index = 0) {
  return {
    id: String(image.id || `image-${index + 1}`).trim(),
    collectionId: slugify(image.collectionId || "gallery"),
    gameId: slugify(image.gameId || image.collectionId || "gallery"),
    title: String(image.title || image.fileName || `Transmission ${index + 1}`).trim(),
    url: String(image.url || image.downloadURL || "").trim(),
    storagePath: String(image.storagePath || "").trim(),
    uploadedBy: String(image.uploadedBy || "").trim(),
    createdAt: image.createdAt || 0
  };
}

export function statusToTone(status) {
  const map = {
    Active: "green",
    "Returning Soon": "amber",
    "On Hold": "purple",
    Completed: "cyan",
    Occasional: "blue"
  };
  return map[status] || "blue";
}

export async function loadPublicSiteData() {
  const { database } = getFirebaseServices();
  const [siteConfigSnapshot, gamesSnapshot, activitySnapshot, steamSnapshot] = await Promise.all([
    get(ref(database, "siteConfig")).catch(() => null),
    get(ref(database, "gamesLibrary")).catch(() => null),
    get(ref(database, "activityFeed")).catch(() => null),
    get(ref(database, "steamSignal")).catch(() => null)
  ]);

  const siteConfig = siteConfigSnapshot?.exists() ? siteConfigSnapshot.val() : {};
  const remoteGames = gamesSnapshot?.exists() ? toArray(gamesSnapshot.val()).map(normalizeGame) : [];
  const remoteActivity = activitySnapshot?.exists() ? toArray(activitySnapshot.val()) : [];
  const steamSignal = steamSnapshot?.exists() ? normalizeSteamSignal(steamSnapshot.val()) : structuredClone(defaultSteamSignal);

  return {
    currentGames: toArray(siteConfig.currentGames).map(normalizeCurrentGame).slice(0, 4),
    gamesLibrary: remoteGames,
    tacticalFeed: toArray(siteConfig.tacticalFeed).map(normalizeFeedItem),
    quotes: normalizeQuotes(siteConfig.quotes),
    hero: normalizeHeroCopy(siteConfig.hero),
    heroVisual: normalizeHeroVisual(siteConfig.heroVisual),
    featuredClip: normalizeFeaturedClip(siteConfig.featuredClip),
    steamConfig: normalizeSteamConfig(siteConfig.steam),
    steamSignal,
    activityFeed: remoteActivity
      .map(normalizeActivityEntry)
      .filter((item) => item.enabled !== false)
      .sort((a, b) => Number(b.createdAt || Date.parse(b.date) || 0) - Number(a.createdAt || Date.parse(a.date) || 0))
  };
}

export async function loadActivityData() {
  const { database } = getFirebaseServices();
  const [activitySnapshot, archiveSnapshot] = await Promise.all([
    get(ref(database, "activityFeed")).catch(() => null),
    get(ref(database, "activityArchive")).catch(() => null)
  ]);

  const recent = activitySnapshot?.exists()
    ? toArray(activitySnapshot.val()).map(normalizeActivityEntry)
    : defaultActivity.map(normalizeActivityEntry);
  const archive = archiveSnapshot?.exists()
    ? toArray(archiveSnapshot.val()).map(normalizeActivityEntry)
    : [];

  const sortNewest = (a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0);
  return {
    recent: recent.filter((item) => item.enabled !== false).sort(sortNewest),
    archive: archive.filter((item) => item.enabled !== false).sort(sortNewest)
  };
}

export async function loadGalleryData() {
  const { database } = getFirebaseServices();
  const [collectionsSnapshot, imagesSnapshot, gamesSnapshot] = await Promise.all([
    get(ref(database, "galleryCollections")).catch(() => null),
    get(ref(database, "galleryImages")).catch(() => null),
    get(ref(database, "gamesLibrary")).catch(() => null)
  ]);
  const games = gamesSnapshot?.exists() ? toArray(gamesSnapshot.val()).map(normalizeGame) : [...defaultGamesLibrary];
  const remoteCollections = collectionsSnapshot?.exists()
    ? toArray(collectionsSnapshot.val()).map(normalizeGalleryCollection)
    : [];
  const collections = remoteCollections.length
    ? remoteCollections
    : games.map((game, index) => normalizeGalleryCollection({
      id: game.id,
      gameId: game.id,
      title: game.title,
      description: game.description,
      coverArt: game.art,
      order: index + 1
    }, index));
  const rawImages = imagesSnapshot?.exists() ? imagesSnapshot.val() : {};
  const imagesByCollection = {};

  Object.entries(rawImages || {}).forEach(([collectionId, collectionImages]) => {
    imagesByCollection[collectionId] = toArray(collectionImages)
      .map((image, index) => normalizeGalleryImage({ ...image, collectionId }, index))
      .filter((image) => image.url)
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  });

  return {
    games,
    collections: collections
      .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
      .map((collection) => {
        const images = imagesByCollection[collection.id] || [];
        return {
          ...collection,
          imageCount: images.length,
          coverArt: images[0]?.url || collection.coverArt
        };
      }),
    imagesByCollection
  };
}

export async function fetchLatestMedalClip() {
  const clips = await fetchMedalClips();
  return clips[0] || null;
}

export async function fetchMedalClips() {
  const response = await fetch(`${MEDAL_WORKER_URL}?t=${Date.now()}`, {
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Worker returned ${response.status}`);
  }

  const data = await response.json();
  return (Array.isArray(data.clips) ? data.clips : [data])
    .filter(Boolean)
    .map(normalizeMedalClip);
}

export async function isAdminUid(uid) {
  if (!uid) return false;
  const { database } = getFirebaseServices();
  const snapshot = await get(ref(database, `admins/${uid}`)).catch(() => null);
  return snapshot?.val() === true;
}

export async function saveSiteConfigPatch(patch) {
  const { database } = getFirebaseServices();
  await update(ref(database, "siteConfig"), patch);
}

export async function saveGamesLibrary(games) {
  const { database } = getFirebaseServices();
  const payload = {};
  games.map(normalizeGame).forEach((game, index) => {
    payload[game.id] = {
      ...game,
      recentRank: Number(game.recentRank || index + 1)
    };
  });
  await set(ref(database, "gamesLibrary"), payload);
}

export async function fetchSteamSignal(config = {}) {
  const steamConfig = normalizeSteamConfig(config);
  if (!steamConfig.proxyUrl) {
    throw new Error("Add the Steam Worker URL before syncing.");
  }

  const url = new URL(steamConfig.proxyUrl);
  url.searchParams.set("steamId", steamConfig.steamId);
  url.searchParams.set("cc", steamConfig.countryCode);
  url.searchParams.set("t", Date.now().toString());

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Steam Worker returned ${response.status}`);
  }

  return normalizeSteamSignal(await response.json());
}

export async function saveSteamSignal(signal) {
  const { database } = getFirebaseServices();
  const normalized = normalizeSteamSignal(signal);
  await set(ref(database, "steamSignal"), normalized);
  return normalized;
}

export async function saveGalleryCollection(collection) {
  const { database } = getFirebaseServices();
  const normalized = normalizeGalleryCollection(collection);
  await set(ref(database, `galleryCollections/${normalized.id}`), {
    ...normalized,
    createdAt: collection.createdAt || serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return normalized;
}

export async function deleteGalleryCollection(collectionId) {
  const { database } = getFirebaseServices();
  const id = slugify(collectionId);
  await Promise.all([
    remove(ref(database, `galleryCollections/${id}`)),
    remove(ref(database, `galleryImages/${id}`))
  ]);
}

export async function uploadGalleryImageAsset({ file, collectionId, title = "", gameId = "", uid = "" }) {
  if (!file) throw new Error("Choose an image before uploading.");
  if (!file.type?.startsWith("image/")) throw new Error("Gallery uploads need to be image files.");
  if (file.size > 2 * 1024 * 1024) {
    throw new Error("Gallery images stored in Realtime Database must be 2 MB or smaller. Use an image URL for larger screenshots.");
  }

  const safeCollection = slugify(collectionId);
  const extension = String(file.name || "")
    .split(".")
    .pop()
    .replace(/[^a-z0-9]/gi, "")
    .toLowerCase() || "jpg";
  const baseName = slugify(title || file.name.replace(/\.[^.]+$/, ""));
  const dataUrl = await readFileAsDataUrl(file);

  return {
    url: dataUrl,
    storagePath: "",
    fileName: `${Date.now()}-${baseName}.${extension}`,
    contentType: file.type || "image/jpeg",
    uploadedBy: uid,
    collectionId: safeCollection,
    gameId: slugify(gameId || safeCollection)
  };
}

export function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("Could not read that image file.")));
    reader.readAsDataURL(file);
  });
}

export async function saveGalleryImageMetadata(image) {
  const { database } = getFirebaseServices();
  const collectionId = slugify(image.collectionId);
  const imageRef = push(ref(database, `galleryImages/${collectionId}`));
  const payload = {
    id: imageRef.key,
    collectionId,
    gameId: slugify(image.gameId || collectionId),
    title: String(image.title || "Gallery Upload").trim(),
    url: String(image.url || "").trim(),
    storagePath: String(image.storagePath || "").trim(),
    uploadedBy: String(image.uploadedBy || "").trim(),
    createdAt: serverTimestamp()
  };
  await set(imageRef, payload);
  return payload;
}

export async function pushActivity(entry) {
  const { database } = getFirebaseServices();
  const activityRef = push(ref(database, "activityFeed"));
  const createdAt = Number(entry?.createdAt || Date.now());
  const date = String(entry?.date || new Date(createdAt).toISOString().slice(0, 10));
  const time = String(entry?.time || new Date(createdAt).toTimeString().slice(0, 5));
  const payload = normalizeActivityEntry({
    ...entry,
    id: activityRef.key,
    date,
    time,
    createdAt
  });

  await set(activityRef, {
    ...payload,
    id: activityRef.key,
    createdAt
  });

  const snapshot = await get(ref(database, "activityFeed")).catch(() => null);
  if (!snapshot?.exists()) return payload;

  const entries = Object.entries(snapshot.val() || {})
    .map(([id, item], index) => normalizeActivityEntry({ ...item, id }, index))
    .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const overflow = entries.slice(ACTIVITY_RECENT_LIMIT);

  if (overflow.length) {
    await Promise.all(overflow.map(async (item) => {
      await set(ref(database, `activityArchive/${item.id}`), {
        ...item,
        archivedAt: Date.now()
      });
      await remove(ref(database, `activityFeed/${item.id}`));
    }));
  }

  return payload;
}
