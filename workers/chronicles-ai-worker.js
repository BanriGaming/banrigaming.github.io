const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";
const DEFAULT_MODEL = "gpt-5.6-luna";
const MAX_DRAFT_CHARS = 12000;
const MAX_POSTS_FOR_SUMMARY = 120;
const MAX_POST_CHARS = 2600;
const DEFAULT_FIREBASE_DATABASE_URL = "https://banrigaming-90820-default-rtdb.firebaseio.com";
const FIREBASE_KEY_BINDINGS = [
  "FIREBASE_WEB_API_KEY",
  "FIREBASE_API_KEY",
  "VITE_FIREBASE_API_KEY",
  "PUBLIC_FIREBASE_API_KEY"
];

function corsHeaders(request, env) {
  const requestOrigin = request.headers.get("Origin") || "";
  const configuredOrigins = String(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN || "*")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const isNullOrigin = requestOrigin === "null";
  const isLocalDevOrigin = /^https?:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(:\d+)?$/i.test(requestOrigin)
    || /^https?:\/\/192\.168\.\d+\.\d+(:\d+)?$/i.test(requestOrigin)
    || /^https?:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/i.test(requestOrigin);
  const isGitHubPagesOrigin = /^https:\/\/[a-z0-9-]+\.github\.io$/i.test(requestOrigin);
  const isAllowedOrigin = configuredOrigins.includes("*")
    || configuredOrigins.includes(requestOrigin)
    || isNullOrigin
    || isLocalDevOrigin;
  const origin = requestOrigin
    ? (isAllowedOrigin || isGitHubPagesOrigin ? requestOrigin : "null")
    : "*";

  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
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

function clampText(value, maxLength) {
  const text = String(value || "").trim();
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n[truncated]` : text;
}

function extractBearerToken(request, payload = {}) {
  const header = request.headers.get("Authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const headerToken = match ? match[1].trim() : "";
  return headerToken || String(payload.idToken || payload.firebaseIdToken || payload.token || "").trim();
}

function getTextBinding(env, names) {
  for (const name of names) {
    const value = env[name];
    if (typeof value === "string" && value.trim()) {
      return { name, value: value.trim() };
    }
  }
  return { name: "", value: "" };
}

function getEnvStatus(env) {
  const firebaseKey = getTextBinding(env, FIREBASE_KEY_BINDINGS);
  return {
    openAiKey: Boolean(env.OPENAI_API_KEY),
    firebaseKey: Boolean(firebaseKey.value),
    firebaseKeyBinding: firebaseKey.name || "",
    checkedFirebaseBindings: FIREBASE_KEY_BINDINGS,
    allowedOrigins: Boolean(env.ALLOWED_ORIGINS || env.ALLOWED_ORIGIN),
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    reasoningEffort: env.OPENAI_REASONING_EFFORT || "default"
  };
}

async function verifyFirebaseUser(request, env, payload = {}) {
  const idToken = extractBearerToken(request, payload);
  if (!idToken) {
    throw Object.assign(new Error("Missing Firebase ID token."), { status: 401 });
  }
  const firebaseKey = getTextBinding(env, FIREBASE_KEY_BINDINGS);
  if (!firebaseKey.value) {
    throw Object.assign(new Error(`Missing Firebase web API key Worker binding. Checked: ${FIREBASE_KEY_BINDINGS.join(", ")}.`), { status: 500 });
  }

  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${firebaseKey.value}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken })
  });
  const data = await response.json().catch(() => ({}));
  const user = data?.users?.[0];

  if (!response.ok || !user?.localId) {
    throw Object.assign(new Error("Firebase token verification failed."), { status: 401 });
  }

  return {
    uid: user.localId,
    email: user.email || "",
    displayName: user.displayName || user.email || "Chronicle Writer"
  };
}

async function readRequestPayload(request) {
  const contentType = request.headers.get("Content-Type") || "";

  if (contentType.toLowerCase().includes("application/json")) {
    return request.json().catch(() => ({}));
  }

  const text = await request.text().catch(() => "");
  if (!text.trim()) return {};

  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function callOpenAI(env, { system, user, json = false, maxOutputTokens = 1200 }) {
  if (!env.OPENAI_API_KEY) {
    throw Object.assign(new Error("Missing OPENAI_API_KEY Worker secret."), { status: 500 });
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("OpenAI request timed out."), 25000);

  const body = {
    model: env.OPENAI_MODEL || DEFAULT_MODEL,
    input: [
      { role: "system", content: system },
      { role: "user", content: user }
    ],
    max_output_tokens: maxOutputTokens
  };

  if (String(body.model).startsWith("gpt-5.6")) {
    body.reasoning = {
      effort: env.OPENAI_REASONING_EFFORT || "none"
    };
  } else {
    body.temperature = 0.35;
  }

  if (json) {
    body.text = {
      format: {
        type: "json_object"
      }
    };
  }

  let response;
  try {
    response = await fetch(OPENAI_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      signal: controller.signal
    });
  } catch (error) {
    throw Object.assign(new Error(error?.message || "OpenAI request failed before a response was returned."), { status: 502 });
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw Object.assign(new Error(data?.error?.message || `OpenAI returned ${response.status}.`), { status: 502 });
  }

  return {
    text: extractResponseText(data),
    usage: data.usage || null,
    model: data.model || body.model
  };
}

function extractResponseText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const pieces = [];
  (data.output || []).forEach((item) => {
    (item.content || []).forEach((part) => {
      if (typeof part.text === "string") pieces.push(part.text);
      if (typeof part.content === "string") pieces.push(part.content);
    });
  });

  return pieces.join("\n").trim();
}

function buildAssistPrompt(payload) {
  const mode = String(payload.mode || "polish").trim();
  const modes = {
    notes: {
      label: "Write From Notes",
      instruction: "Transform the user's rough notes into one polished play-by-post response."
    },
    polish: {
      label: "Polish My Post",
      instruction: "Keep the existing events, intent, dialogue, and continuity, but improve prose, pacing, atmosphere, and clarity."
    },
    grammar: {
      label: "Grammar & Punctuation",
      instruction: "Only fix grammar, punctuation, spelling, line breaks, and readability. Do not rewrite style or add new story events."
    }
  };
  const selected = modes[mode] || modes.polish;

  return {
    mode: modes[mode] ? mode : "polish",
    label: selected.label,
    system: [
      "You are the Chronicles writing assistant for Banri Gaming.",
      "Write literate play-by-post roleplay prose in third-person past tense unless the user clearly supplied direct dialogue or OOC text.",
      "Preserve the writer's intent and do not take control of other player characters.",
      "Do not add lasting injuries, deaths, romance, mind control, or character-altering effects unless the draft explicitly asks for them.",
      "Return only the revised post text. Do not include analysis or labels."
    ].join(" "),
    user: [
      `Mode: ${selected.label}`,
      selected.instruction,
      `World: ${clampText(payload.worldTitle, 120) || "Unknown"}`,
      `Thread: ${clampText(payload.threadTitle, 120) || "Unknown"}`,
      `Author: ${clampText(payload.authorName, 80) || "Unknown"}`,
      "",
      "Draft / notes:",
      clampText(payload.draft, MAX_DRAFT_CHARS)
    ].join("\n")
  };
}

function buildSummaryPrompt(payload) {
  const posts = Array.isArray(payload.posts) ? payload.posts : [];
  const trimmedPosts = posts
    .filter((post) => String(post.postType || "player") !== "location-description")
    .slice(-MAX_POSTS_FOR_SUMMARY)
    .map((post, index) => ({
      n: index + 1,
      id: String(post.id || ""),
      title: String(post.title || post.threadTitle || "Untitled"),
      authorName: String(post.authorName || "Unknown"),
      threadTitle: String(post.threadTitle || "Unknown Location"),
      createdAt: post.createdAt || 0,
      postType: String(post.postType || "player"),
      body: clampText(post.body, MAX_POST_CHARS)
    }));

  return {
    system: [
      "You are the continuity archivist for Banri Gaming Chronicles.",
      "Summarize a play-by-post world for returning writers.",
      "Use the supplied posts in chronological order. Ignore any location description posts if present.",
      "Do not invent facts, characters, locations, or outcomes.",
      "Return compact JSON only with keys summary, latestEvents, characterPositions, unresolvedHooks."
    ].join(" "),
    user: JSON.stringify({
      worldTitle: String(payload.worldTitle || "Unknown World"),
      worldGenre: String(payload.worldGenre || ""),
      postCount: Number(payload.postCount || trimmedPosts.length),
      lastPostId: String(payload.lastPostId || ""),
      posts: trimmedPosts
    })
  };
}

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    const match = String(text || "").match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

function getFirebaseDatabaseUrl(env) {
  return String(env.FIREBASE_DATABASE_URL || env.FIREBASE_DB_URL || DEFAULT_FIREBASE_DATABASE_URL).replace(/\/+$/, "");
}

function encodeFirebasePath(path) {
  return String(path || "")
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function firebaseRestUrl(env, path, idToken) {
  const url = new URL(`${getFirebaseDatabaseUrl(env)}/${encodeFirebasePath(path)}.json`);
  url.searchParams.set("auth", idToken);
  return url.toString();
}

async function firebaseRestRead(env, path, idToken) {
  const response = await fetch(firebaseRestUrl(env, path, idToken), {
    method: "GET",
    headers: { "Accept": "application/json" }
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || `Firebase read returned ${response.status}.`), { status: 502 });
  }
  return data;
}

async function firebaseRestPatch(env, path, idToken, payload) {
  const response = await fetch(firebaseRestUrl(env, path, idToken), {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw Object.assign(new Error(data?.error || `Firebase write returned ${response.status}.`), { status: 502 });
  }
  return data;
}

async function createAssistResult(env, payload, user) {
  const prompt = buildAssistPrompt(payload);
  const result = await callOpenAI(env, {
    system: prompt.system,
    user: prompt.user,
    maxOutputTokens: 1600
  });

  return {
    action: "assist",
    mode: prompt.mode,
    label: prompt.label,
    result: result.text,
    updatedAt: Date.now(),
    user: {
      uid: user.uid,
      displayName: user.displayName
    },
    usage: result.usage,
    model: result.model
  };
}

function createAuthCheckResult(env, user) {
  return {
    action: "auth-check",
    ok: true,
    message: "Firebase auth token accepted.",
    updatedAt: Date.now(),
    user: {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName
    },
    status: getEnvStatus(env)
  };
}

async function createDiagnoseResult(env, user) {
  const result = await callOpenAI(env, {
    system: "You are a connection diagnostic for Banri Gaming. Return exactly: Nexus AI online.",
    user: "Confirm the Chronicles AI relay is connected.",
    maxOutputTokens: 20
  });

  return {
    action: "diagnose",
    ok: true,
    message: result.text || "Nexus AI online.",
    updatedAt: Date.now(),
    user: {
      uid: user.uid,
      displayName: user.displayName
    },
    usage: result.usage,
    model: result.model
  };
}

async function createSummaryResult(env, payload, user) {
  const prompt = buildSummaryPrompt(payload);
  const result = await callOpenAI(env, {
    system: prompt.system,
    user: prompt.user,
    json: true,
    maxOutputTokens: 1400
  });
  const parsed = safeJsonParse(result.text) || {};

  return {
    action: "summarize",
    worldId: String(payload.worldId || ""),
    summary: clampText(parsed.summary || result.text, 4000),
    latestEvents: clampText(parsed.latestEvents || "", 3000),
    characterPositions: clampText(parsed.characterPositions || "", 3000),
    unresolvedHooks: clampText(parsed.unresolvedHooks || "", 3000),
    postCount: Number(payload.postCount || 0),
    lastPostId: String(payload.lastPostId || ""),
    updatedAt: Date.now(),
    updatedByUid: user.uid,
    updatedByName: user.displayName,
    source: `OpenAI / ${result.model}`,
    usage: result.usage
  };
}

async function runAiAction(env, payload, user) {
  const action = String(payload.action || "").trim();

  if (action === "auth-check") return createAuthCheckResult(env, user);
  if (action === "diagnose") return createDiagnoseResult(env, user);
  if (action === "assist") return createAssistResult(env, payload, user);
  if (action === "summarize") return createSummaryResult(env, payload, user);

  throw Object.assign(new Error("Unknown action."), { status: 400 });
}

async function handleQueuedRequest(request, env, url) {
  const idToken = String(url.searchParams.get("idToken") || "").trim();
  const requestId = String(url.searchParams.get("requestId") || "").trim();
  const uid = String(url.searchParams.get("uid") || "").trim();

  if (!requestId) {
    return jsonResponse(request, env, { error: "Missing queued AI request id." }, 400);
  }

  const user = await verifyFirebaseUser(request, env, { idToken });
  if (uid && uid !== user.uid) {
    return jsonResponse(request, env, { error: "Queued AI request UID mismatch." }, 403);
  }

  const queuePath = `chronicles/aiQueue/${user.uid}/${requestId}`;
  const queued = await firebaseRestRead(env, queuePath, idToken);
  if (!queued || queued.uid !== user.uid || queued.id !== requestId) {
    return jsonResponse(request, env, { error: "Queued AI request was not found or does not belong to this user." }, 404);
  }

  const payload = queued.request || queued.payload || {};

  try {
    await firebaseRestPatch(env, queuePath, idToken, {
      status: "processing",
      startedAt: Date.now()
    }).catch(() => {});

    const result = await runAiAction(env, payload, user);
    await firebaseRestPatch(env, queuePath, idToken, {
      status: "complete",
      response: result,
      processedAt: Date.now()
    }).catch(() => {});

    return jsonResponse(request, env, result);
  } catch (error) {
    await firebaseRestPatch(env, queuePath, idToken, {
      status: "error",
      error: error.message || "Queued AI request failed.",
      processedAt: Date.now()
    }).catch(() => {});
    throw error;
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders(request, env) });
    }

    const url = new URL(request.url);
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
      return jsonResponse(request, env, {
        ok: true,
        service: "banri-chronicles-ai",
        status: getEnvStatus(env),
        checkedAt: new Date().toISOString()
      });
    }

    if (request.method === "GET" && url.pathname === "/process-ai-request") {
      try {
        return await handleQueuedRequest(request, env, url);
      } catch (error) {
        return jsonResponse(request, env, {
          error: error.message || "Queued Chronicles AI request failed.",
          status: getEnvStatus(env)
        }, error.status || 500);
      }
    }

    if (request.method !== "POST") {
      return jsonResponse(request, env, { error: "Method not allowed" }, 405);
    }

    try {
      const payload = await readRequestPayload(request);
      const user = await verifyFirebaseUser(request, env, payload);
      return jsonResponse(request, env, await runAiAction(env, payload, user));
    } catch (error) {
      return jsonResponse(request, env, {
        error: error.message || "Chronicles AI request failed.",
        status: getEnvStatus(env)
      }, error.status || 500);
    }
  }
};
