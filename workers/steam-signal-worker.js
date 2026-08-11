const STEAM_API_BASE = "https://api.steampowered.com";

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
    "Cache-Control": "no-store",
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

async function fetchSteamJson(path, params) {
  const url = new URL(`${STEAM_API_BASE}${path}`);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString(), {
    headers: { "User-Agent": "BanriGamingSteamSignal/1.0" }
  });

  if (!response.ok) {
    throw new Error(`Steam API returned ${response.status} for ${path}`);
  }

  return response.json();
}

function normalizeGame(game) {
  const playtimeMinutes = Math.max(0, Number(game.playtime_forever || 0));
  const appId = String(game.appid || "");

  return {
    appId,
    name: String(game.name || `Steam App ${appId}`),
    playtimeMinutes,
    playtimeHours: Number((playtimeMinutes / 60).toFixed(1)),
    imgIconUrl: String(game.img_icon_url || ""),
    hasCommunityVisibleStats: Boolean(game.has_community_visible_stats)
  };
}

function computeBuckets(games) {
  const ranges = [
    { label: "25 or more hours", test: (hours) => hours >= 25 },
    { label: "12 to 25 hours", test: (hours) => hours >= 12 && hours < 25 },
    { label: "6 to 12 hours", test: (hours) => hours >= 6 && hours < 12 },
    { label: "3 to 6 hours", test: (hours) => hours >= 3 && hours < 6 },
    { label: "2 to 3 hours", test: (hours) => hours >= 2 && hours < 3 },
    { label: "1 to 2 hours", test: (hours) => hours >= 1 && hours < 2 },
    { label: "0 to 1 hours", test: (hours) => hours > 0 && hours < 1 },
    { label: "Never played", test: (hours) => hours === 0 }
  ];

  return ranges.map((range) => ({
    label: range.label,
    count: games.filter((game) => range.test(Number(game.playtimeHours || 0))).length
  }));
}

function summarizeGames(games, totalGames) {
  const playedGames = games.filter((game) => Number(game.playtimeMinutes || 0) > 0).length;
  const totalHours = games.reduce((sum, game) => sum + Number(game.playtimeMinutes || 0), 0) / 60;

  return {
    totalGames,
    playedGames,
    neverPlayedGames: Math.max(0, totalGames - playedGames),
    playedPercent: totalGames ? Number(((playedGames / totalGames) * 100).toFixed(1)) : 0,
    totalHours: Number(totalHours.toFixed(1)),
    averagePlaytime: playedGames ? Number((totalHours / playedGames).toFixed(1)) : 0,
    syncedAt: Date.now(),
    source: "Steam Web API"
  };
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    if (request.method !== "GET") {
      return jsonResponse(request, env, { error: "Method not allowed" }, 405);
    }

    if (!env.STEAM_API_KEY) {
      return jsonResponse(request, env, { error: "Missing STEAM_API_KEY Worker secret" }, 500);
    }

    const requestUrl = new URL(request.url);
    const configuredSteamId = String(env.STEAM_ID64 || "").replace(/\D/g, "");
    const steamId = String(requestUrl.searchParams.get("steamId") || configuredSteamId).replace(/\D/g, "");
    const countryCode = String(requestUrl.searchParams.get("cc") || "us").toLowerCase().slice(0, 2);

    if (!steamId) {
      return jsonResponse(request, env, { error: "Missing steamId" }, 400);
    }

    if (configuredSteamId && steamId !== configuredSteamId) {
      return jsonResponse(request, env, { error: "SteamID is not allowed for this Worker" }, 403);
    }

    try {
      const common = { key: env.STEAM_API_KEY, steamid: steamId, format: "json" };
      const [profileData, levelData, ownedData, recentData] = await Promise.all([
        fetchSteamJson("/ISteamUser/GetPlayerSummaries/v0002/", {
          key: env.STEAM_API_KEY,
          steamids: steamId,
          format: "json"
        }),
        fetchSteamJson("/IPlayerService/GetSteamLevel/v1/", common),
        fetchSteamJson("/IPlayerService/GetOwnedGames/v0001/", {
          ...common,
          include_appinfo: 1,
          include_played_free_games: 1,
          cc: countryCode
        }),
        fetchSteamJson("/IPlayerService/GetRecentlyPlayedGames/v0001/", {
          ...common,
          count: 5
        }).catch(() => ({ response: { games: [] } }))
      ]);

      const player = profileData?.response?.players?.[0] || {};
      const games = (ownedData?.response?.games || [])
        .map(normalizeGame)
        .sort((a, b) => Number(b.playtimeMinutes || 0) - Number(a.playtimeMinutes || 0));
      const recentGames = (recentData?.response?.games || []).map(normalizeGame);
      const gameCount = Number(ownedData?.response?.game_count || games.length || 0);

      return jsonResponse(request, env, {
        profile: {
          steamId,
          personaName: player.personaname || "Banri",
          profileUrl: player.profileurl || "",
          avatar: player.avatar || "",
          avatarFull: player.avatarfull || player.avatarmedium || "",
          countryCode: player.loccountrycode || "",
          timeCreated: Number(player.timecreated || 0),
          level: Number(levelData?.response?.player_level || 0)
        },
        summary: summarizeGames(games, gameCount),
        buckets: computeBuckets(games),
        games,
        recentGames
      });
    } catch (error) {
      return jsonResponse(request, env, {
        error: error.message || "Steam signal sync failed"
      }, 502);
    }
  }
};
