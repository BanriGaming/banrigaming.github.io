# Chronicles AI Worker Setup

This keeps the OpenAI API key off the public website. The browser sends a Firebase ID token to the Worker, the Worker verifies that token, then calls OpenAI.

## Cloudflare Worker Secrets / Variables

Create these in the Cloudflare Worker settings or with Wrangler:

- `OPENAI_API_KEY`: your OpenAI API key.
- `FIREBASE_WEB_API_KEY`: the Firebase web API key from this site config.
- `ALLOWED_ORIGINS`: comma-separated allowed origins, for example:
  `https://banrigaming.github.io,http://127.0.0.1:5500,http://127.0.0.1:8088,http://localhost:5500,http://localhost:8088`
- `FIREBASE_DATABASE_URL` optional: defaults to `https://banrigaming-90820-default-rtdb.firebaseio.com`.
- `OPENAI_MODEL` optional: defaults to `gpt-5.6-luna`.
- `OPENAI_REASONING_EFFORT` optional: defaults to `none` for the GPT-5.6 model family.

The Worker accepts `FIREBASE_API_KEY`, `VITE_FIREBASE_API_KEY`, or `PUBLIC_FIREBASE_API_KEY` as fallbacks, but `FIREBASE_WEB_API_KEY` is the intended name.

## Deploy Command

From the repository root:

```bash
npx wrangler deploy workers/chronicles-ai-worker.js --name banri-chronicles-ai --compatibility-date 2026-08-17
```

If you manage secrets in the terminal instead of the Cloudflare dashboard:

```bash
npx wrangler secret put OPENAI_API_KEY --name banri-chronicles-ai
npx wrangler secret put FIREBASE_WEB_API_KEY --name banri-chronicles-ai
npx wrangler secret put ALLOWED_ORIGINS --name banri-chronicles-ai
npx wrangler secret put FIREBASE_DATABASE_URL --name banri-chronicles-ai
npx wrangler secret put OPENAI_MODEL --name banri-chronicles-ai
npx wrangler secret put OPENAI_REASONING_EFFORT --name banri-chronicles-ai
```

After deployment, visit:

```text
https://your-worker-url.workers.dev/health
```

The health response should show `openAiKey: true` and `firebaseKey: true`. It only reports whether bindings exist; it does not expose secret values or spend OpenAI tokens.

Then copy the Worker URL into `Admin Console > Chronicles AI > Worker URL`, save it, and use `Check Worker` in the admin panel before testing AI Assist from a Chronicles post editor.

## Firebase Rules

Copy `firebase-realtime-database-rules.json` into Firebase Realtime Database rules after this feature is merged. The rules add `chronicles/summaries` so generated world summaries can be shared with logged-in Chronicles members, and `chronicles/aiQueue/{uid}` so the browser can queue AI requests privately while the Worker processes them through Firebase REST.
