/*
 * BANRI Palworld API adapter
 *
 * The deployed Cloudflare Worker URL is configured in index.html with:
 * <meta name="palworld-api-base" content="https://YOUR-WORKER.workers.dev">
 *
 * Pal roster/details come from the Worker. Active/passive master skill lists
 * still use pal-data.js until their Worker endpoints are added.
 */

const metaBase = document.querySelector('meta[name="palworld-api-base"]')?.content?.trim() || "";
const globalBase = String(globalThis.PALWORLD_API_BASE || "").trim();
const rawBase = globalBase || metaBase;
const API_BASE = /YOUR-WORKER|PASTE|REPLACE/i.test(rawBase) ? "" : rawBase.replace(/\/+$/, "");

const detailCache = new Map();
const inflightDetails = new Map();
let indexCache = null;
let statusCache = null;

function configured() {
  return Boolean(API_BASE);
}

function requireConfigured() {
  if (!configured()) {
    throw new Error("Palworld API base URL is not configured. Set the palworld-api-base meta tag in index.html to your Cloudflare Worker URL.");
  }
}

async function request(path) {
  requireConfigured();
  const response = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    cache: "no-store"
  });

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    throw new Error(`Palworld API returned a non-JSON response (${response.status}).`);
  }

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || `Palworld API request failed (${response.status}).`);
  }

  return payload;
}

function encodedPalPath(value) {
  return encodeURIComponent(String(value || "").trim().replace(/\s+/g, "_"))
    .replace(/%5F/gi, "_");
}

async function getStatus({ force = false } = {}) {
  if (!force && statusCache) return statusCache;
  statusCache = await request("/api/palworld/status");
  return statusCache;
}

async function getPalIndex({ force = false } = {}) {
  if (!force && indexCache) return indexCache;
  indexCache = await request("/api/palworld/pals");
  return indexCache;
}

async function getPal(nameOrSlug, { force = false } = {}) {
  const lookup = String(nameOrSlug || "").trim();
  if (!lookup) throw new Error("A Pal name or slug is required.");
  const cacheKey = lookup.toLowerCase().replace(/_/g, " ");

  if (!force && detailCache.has(cacheKey)) return detailCache.get(cacheKey);
  if (!force && inflightDetails.has(cacheKey)) return inflightDetails.get(cacheKey);

  const task = request(`/api/palworld/pal/${encodedPalPath(lookup)}`)
    .then((pal) => {
      detailCache.set(cacheKey, pal);
      if (pal?.name) detailCache.set(String(pal.name).toLowerCase(), pal);
      return pal;
    })
    .finally(() => inflightDetails.delete(cacheKey));

  inflightDetails.set(cacheKey, task);
  return task;
}

function clearMemoryCache() {
  indexCache = null;
  statusCache = null;
  detailCache.clear();
  inflightDetails.clear();
}

export const PalworldAPI = {
  get configured() { return configured(); },
  get baseUrl() { return API_BASE; },
  getStatus,
  getPalIndex,
  getPal,
  clearMemoryCache
};
