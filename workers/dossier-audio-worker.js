const DEFAULT_ALLOWED_HOSTS = new Set([
  "suno.com",
  "www.suno.com",
  "cdn.suno.ai",
  "cdn1.suno.ai",
  "cdn2.suno.ai"
]);

const AUDIO_FILE_PATTERN = /\.(mp3|m4a|aac|wav|ogg|oga|webm)(?:[?#].*)?$/i;
const AUDIO_URL_PATTERN = /https?:\/\/[^"'<>\\\s]+?\.(?:mp3|m4a|aac|wav|ogg|oga|webm)(?:\?[^"'<>\\\s]*)?/gi;

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(requestOrigin);
  const isAllowedOrigin = configuredOrigins.includes("*")
    || configuredOrigins.includes(requestOrigin)
    || isLocalDevOrigin;
  const origin = requestOrigin
    ? (isAllowedOrigin ? requestOrigin : "null")
    : "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "public, max-age=3600",
    "Vary": "Origin"
  };
}

function jsonResponse(request, env, payload, status = 200) {
  return new Response(JSON.stringify(payload, null, 2), {
    status,
    headers: {
      ...corsHeaders(request, env),
      "Content-Type": "application/json; charset=utf-8"
    }
  });
}

function parseUrl(value) {
  try {
    const url = new URL(String(value || "").trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

function allowedHosts(env) {
  const configured = String(env.ALLOWED_AUDIO_HOSTS || "")
    .split(",")
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean);
  return configured.length ? new Set(configured) : DEFAULT_ALLOWED_HOSTS;
}

function assertAllowedAudioHost(url, env) {
  const host = url.hostname.toLowerCase();
  if (!allowedHosts(env).has(host)) {
    throw new Error(`Host ${host} is not allowed for dossier audio resolution.`);
  }
}

function htmlDecode(value) {
  return String(value || "")
    .replace(/\\u0026/g, "&")
    .replace(/\\\//g, "/")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)))
    .replace(/&#x2F;/gi, "/")
    .replace(/&#47;/g, "/");
}

function extractTitle(html) {
  const metaTitle = html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i)
    || html.match(/<meta\s+name=["']twitter:title["']\s+content=["']([^"']+)["']/i)
    || html.match(/<title[^>]*>([^<]+)<\/title>/i);
  return metaTitle ? htmlDecode(metaTitle[1]).replace(/\s+/g, " ").trim() : "";
}

function isNoiseAudio(url) {
  const pathname = new URL(url).pathname.toLowerCase();
  return /(^|\/)(sil|silence|blank|empty)[-_]?\d*\.mp3$/.test(pathname);
}

function scoreAudioUrl(url, sourceHost) {
  const parsed = new URL(url);
  let score = 0;
  if (parsed.hostname.endsWith("suno.ai")) score += 30;
  if (parsed.hostname === sourceHost) score += 6;
  if (/cdn\d*\.suno\.ai$/i.test(parsed.hostname)) score += 20;
  if (/\.mp3(?:[?#]|$)/i.test(parsed.href)) score += 8;
  if (isNoiseAudio(url)) score -= 100;
  return score;
}

function extractAudioCandidates(html, sourceHost) {
  const decoded = htmlDecode(html);
  const candidates = [...decoded.matchAll(AUDIO_URL_PATTERN)]
    .map((match) => match[0])
    .map((url) => {
      try {
        return new URL(url).toString();
      } catch {
        return "";
      }
    })
    .filter(Boolean);

  return [...new Set(candidates)]
    .filter((url) => !isNoiseAudio(url))
    .sort((a, b) => scoreAudioUrl(b, sourceHost) - scoreAudioUrl(a, sourceHost));
}

async function resolveAudio(request, env, sourceUrl) {
  const source = parseUrl(sourceUrl);
  if (!source) throw new Error("Missing or invalid url parameter.");
  assertAllowedAudioHost(source, env);

  if (AUDIO_FILE_PATTERN.test(source.pathname)) {
    return {
      ok: true,
      sourceUrl: source.toString(),
      playUrl: source.toString(),
      title: "",
      candidates: [source.toString()],
      source: "direct"
    };
  }

  const response = await fetch(source.toString(), {
    headers: {
      "Accept": "text/html,application/xhtml+xml",
      "User-Agent": "BanriGamingDossierAudioResolver/1.0"
    },
    cf: { cacheTtl: 3600, cacheEverything: true }
  });

  if (!response.ok) {
    throw new Error(`Source returned ${response.status}.`);
  }

  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    throw new Error(`Source is ${contentType || "not HTML"} and no direct audio URL was found.`);
  }

  const html = await response.text();
  const candidates = extractAudioCandidates(html, source.hostname);
  if (!candidates.length) {
    throw new Error("No playable audio file was found in the source page.");
  }

  return {
    ok: true,
    sourceUrl: source.toString(),
    playUrl: candidates[0],
    title: extractTitle(html),
    candidates: candidates.slice(0, 5),
    source: source.hostname
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    if (request.method !== "GET") {
      return jsonResponse(request, env, { ok: false, error: "Method not allowed" }, 405);
    }

    const requestUrl = new URL(request.url);
    if (requestUrl.pathname === "/health") {
      return jsonResponse(request, env, {
        ok: true,
        service: "banri-dossier-audio",
        allowedHosts: [...allowedHosts(env)],
        checkedAt: new Date().toISOString()
      });
    }

    try {
      const payload = await resolveAudio(request, env, requestUrl.searchParams.get("url"));
      return jsonResponse(request, env, payload);
    } catch (error) {
      return jsonResponse(request, env, {
        ok: false,
        error: error.message || "Audio resolution failed."
      }, 400);
    }
  }
};
