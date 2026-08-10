import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { onValue, ref } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getFirebaseServices } from "./site-store.js";

const { auth, database } = getFirebaseServices();

const state = {
  user: null,
  profiles: {},
  privateProfile: null,
  presence: {},
  filter: "all",
  query: "",
  unsubscribers: []
};

const elements = {
  locked: document.getElementById("membersLocked"),
  app: document.getElementById("membersApp"),
  grid: document.getElementById("membersGrid"),
  summary: document.getElementById("membersSummary"),
  total: document.getElementById("membersTotalCount"),
  online: document.getElementById("membersOnlineCount"),
  platformCount: document.getElementById("membersPlatformCount"),
  search: document.getElementById("membersSearch"),
  filters: document.querySelectorAll("[data-member-filter]")
};

function subscribe() {
  cleanup();
  const watchedPaths = [
    ["publicProfiles", (value) => { state.profiles = value || {}; }],
    ["presence", (value) => { state.presence = value || {}; }]
  ];

  if (state.user?.uid) {
    watchedPaths.push([`profiles/${state.user.uid}`, (value) => { state.privateProfile = value || null; }]);
  }

  watchedPaths.forEach(([path, setter]) => {
    const unsubscribe = onValue(ref(database, path), (snapshot) => {
      setter(snapshot.val());
      renderMembers();
    }, (error) => {
      console.warn(`Members read failed at ${path}:`, error);
      renderMembers();
    });
    state.unsubscribers.push(unsubscribe);
  });
}

function cleanup() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe());
  state.unsubscribers = [];
}

function renderSignedOut() {
  state.user = null;
  state.privateProfile = null;
  elements.locked?.classList.add("d-none");
  elements.app?.classList.remove("d-none");
  subscribe();
}

function renderSignedIn(user) {
  state.user = user;
  elements.locked?.classList.add("d-none");
  elements.app?.classList.remove("d-none");
  subscribe();
}

function getMemberProfiles() {
  const memberIds = new Set([
    ...Object.keys(state.profiles || {}),
    ...Object.keys(state.presence || {})
  ]);
  if (state.user?.uid) memberIds.add(state.user.uid);

  return [...memberIds].map((uid) => {
    const publicProfile = state.profiles?.[uid] || {};
    const privateProfile = state.user?.uid === uid && state.privateProfile
      ? state.privateProfile
      : {};
    const profile = {
      ...publicProfile,
      ...privateProfile
    };
    const signal = state.presence?.[uid] || {};
    const privacy = normalizePrivacy(profile.privacy);
    const isCurrentUser = state.user?.uid === uid;
    const platforms = privacy.showPlatforms ? normalizePlatforms(profile.platforms) : {};

    return {
      uid,
      displayName: profile.displayName || signal.displayName || "Nexus User",
      bio: privacy.showBio ? profile.bio || "" : "",
      status: privacy.showStatus ? profile.status || "" : "",
      favoriteGames: privacy.showFavorites ? profile.favoriteGames || "" : "",
      platforms,
      photoURL: privacy.showAvatar ? profile.photoURL || "" : "",
      online: signal.online === true || isCurrentUser,
      lastSeen: Number(signal.lastSeen || (isCurrentUser ? Date.now() : profile.updatedAt) || 0)
    };
  }).sort((a, b) => Number(b.online) - Number(a.online) || b.lastSeen - a.lastSeen || a.displayName.localeCompare(b.displayName));
}

function filterProfiles(profiles) {
  const query = state.query.toLowerCase();
  return profiles.filter((profile) => {
    const matchesFilter = state.filter === "all"
      || (state.filter === "online" && profile.online)
      || (state.filter === "offline" && !profile.online);
    const haystack = [
      profile.displayName,
      profile.bio,
      profile.status,
      profile.favoriteGames,
      ...Object.values(profile.platforms || {})
    ].join(" ").toLowerCase();
    return matchesFilter && (!query || haystack.includes(query));
  });
}

function renderMembers() {
  if (!elements.grid) return;
  const profiles = getMemberProfiles();
  const filteredProfiles = filterProfiles(profiles);
  const onlineCount = profiles.filter((profile) => profile.online).length;
  const platformCount = profiles.reduce((count, profile) => count + Object.keys(profile.platforms || {}).length, 0);

  if (elements.summary) {
    elements.summary.textContent = `${profiles.length} member${profiles.length === 1 ? "" : "s"} / ${onlineCount} online`;
  }
  if (elements.total) elements.total.textContent = String(profiles.length);
  if (elements.online) elements.online.textContent = String(onlineCount);
  if (elements.platformCount) elements.platformCount.textContent = String(platformCount);

  elements.grid.innerHTML = filteredProfiles.length ? filteredProfiles.map(renderMemberCard).join("") : '<div class="relay-empty">No member signals match this search.</div>';
}

function renderMemberCard(profile) {
  const signal = profile.bio || "No public signal set.";
  const status = profile.status || (profile.online ? "Connected to the Nexus" : "Signal dormant");
  const favorites = profile.favoriteGames || "No favorite games listed.";
  return `
    <article class="member-card${profile.online ? " online" : ""}">
      <div class="member-avatar${profile.photoURL ? " has-photo" : ""}">
        ${profile.photoURL ? `<img src="${escapeAttr(profile.photoURL)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <span>${escapeHtml(profile.displayName.charAt(0).toUpperCase())}</span>
      </div>
      <div class="member-card-body">
        <div class="member-card-topline">
          <p><span class="member-state-dot" aria-hidden="true"></span>${profile.online ? "Online" : `Last seen ${formatLastSeen(profile.lastSeen)}`}</p>
          <span>${escapeHtml(profile.uid.slice(0, 6).toUpperCase())}</span>
        </div>
        <h2>${escapeHtml(profile.displayName)}</h2>
        <div class="member-signal-grid">
          <section>
            <span>Signal</span>
            <blockquote>${escapeHtml(signal)}</blockquote>
          </section>
          <section>
            <span>Status</span>
            <strong class="member-status">${escapeHtml(status)}</strong>
          </section>
          <section>
            <span>Favorite Games</span>
            <small class="member-favorites">${escapeHtml(favorites)}</small>
          </section>
        </div>
        ${renderPlatformLinks(profile.platforms)}
      </div>
    </article>
  `;
}

function normalizePrivacy(privacy = {}) {
  return {
    showAvatar: privacy.showAvatar !== false,
    showBio: privacy.showBio !== false,
    showStatus: privacy.showStatus !== false,
    showFavorites: privacy.showFavorites !== false,
    showPlatforms: privacy.showPlatforms !== false
  };
}

function normalizePlatforms(platforms = {}) {
  return Object.fromEntries(Object.entries(platforms || {})
    .map(([key, value]) => [key, String(value || "").trim()])
    .filter(([, value]) => value));
}

function renderPlatformLinks(platforms = {}) {
  const entries = Object.entries(platforms).filter(([, value]) => value);
  if (!entries.length) return "";

  return `
    <nav class="member-platforms social-strip" aria-label="Member platforms">
      ${entries.map(([key, value]) => renderPlatformButton(key, value)).join("")}
    </nav>
  `;
}

function renderPlatformButton(key, value) {
  const label = platformLabel(key);
  const icon = platformIcon(key);
  if (/^https?:\/\//i.test(value)) {
    return `<a href="${escapeAttr(value)}" target="_blank" rel="noopener" aria-label="${escapeAttr(label)}">${icon}<span>${escapeHtml(label)}</span></a>`;
  }

  return `<span title="${escapeAttr(value)}" aria-label="${escapeAttr(`${label}: ${value}`)}">${icon}<span>${escapeHtml(label)}</span></span>`;
}

function platformLabel(key) {
  return {
    youtube: "YouTube",
    twitch: "Twitch",
    steam: "Steam",
    discord: "Discord",
    website: "Site"
  }[key] || key;
}

function platformIcon(key) {
  const icons = {
    youtube: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8c0-2 1-3 3-3h12c2 0 3 1 3 3v8c0 2-1 3-3 3H6c-2 0-3-1-3-3V8Z"/><path d="m10 9 5 3-5 3V9Z"/></svg>',
    twitch: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h15v10l-4 4h-4l-3 3v-3H5V4Z"/><path d="M9 8v5M14 8v5"/></svg>',
    steam: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="15" r="3"/><circle cx="17" cy="7" r="3"/><path d="M3 13.5 7 15m5.2-1.8 3.1-3.1M20 7h.01M9 15h.01"/></svg>',
    discord: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 8c3-1 7-1 10 0l1 8c-4 2-8 2-12 0l1-8Z"/><path d="M9 15c2 1 4 1 6 0M9 12h.01M15 12h.01M8 8 7 5M16 8l1-3"/></svg>',
    website: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>'
  };
  return icons[key] || icons.website;
}

function formatLastSeen(value) {
  if (!value) return "unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "unknown";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function bindEvents() {
  elements.search?.addEventListener("input", (event) => {
    state.query = event.target.value.trim();
    renderMembers();
  });

  elements.filters.forEach((button) => {
    button.addEventListener("click", () => {
      state.filter = button.dataset.memberFilter || "all";
      elements.filters.forEach((item) => item.classList.toggle("active", item === button));
      renderMembers();
    });
  });
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

bindEvents();
onAuthStateChanged(auth, (user) => {
  if (user) {
    renderSignedIn(user);
  } else {
    renderSignedOut();
  }
});
