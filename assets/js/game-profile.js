import { defaultGamesLibrary, loadPublicSiteData, normalizeGame } from "./site-store.js";

function getGameId() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id") || "";
}

function findGame(games, id) {
  const normalizedId = String(id || "").toLowerCase();
  return games.find((game) => game.id === normalizedId) || games.find((game) => game.title.toLowerCase() === normalizedId);
}

function renderProfile(game) {
  const hero = document.getElementById("gameProfileHero");
  const title = document.getElementById("gameProfileTitle");
  const copy = document.getElementById("gameProfileCopy");
  const heading = document.getElementById("gameProfileHeading");
  const description = document.getElementById("gameProfileDescription");
  const status = document.getElementById("gameProfileStatus");
  const meta = document.getElementById("gameProfileMeta");
  const categories = document.getElementById("gameProfileCategories");

  document.title = `${game.title} | BANRI Gaming`;
  hero?.style.setProperty("--subpage-image", `url('${game.art}')`);
  if (title) {
    title.innerHTML = `${escapeHtml(game.title)} <span>${escapeHtml(game.status)}</span>`;
  }
  if (copy) copy.textContent = game.description;
  if (heading) heading.textContent = `${game.title} Profile`;
  if (description) description.textContent = game.description;
  if (status) status.textContent = game.status;
  if (meta) meta.textContent = `${game.hours.toLocaleString()} hours logged / ${game.completion}% completion`;
  if (categories) {
    categories.innerHTML = game.categories.map((category) => `<span>${escapeHtml(category)}</span>`).join("");
  }
}

function renderMissing() {
  const title = document.getElementById("gameProfileTitle");
  const copy = document.getElementById("gameProfileCopy");
  if (title) title.innerHTML = "Unknown <span>Signal</span>";
  if (copy) copy.textContent = "That game profile was not found in the current library archive.";
}

async function init() {
  const id = getGameId();
  const data = await loadPublicSiteData().catch(() => ({ gamesLibrary: [] }));
  const games = (data.gamesLibrary.length ? data.gamesLibrary : defaultGamesLibrary).map(normalizeGame);
  const game = findGame(games, id);

  if (game) {
    renderProfile(game);
  } else {
    renderMissing();
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

init();
