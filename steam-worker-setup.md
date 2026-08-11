# Banri Steam Signal Worker

This site must not expose the Steam Web API key in frontend JavaScript. Deploy
`workers/steam-signal-worker.js` as a Cloudflare Worker and store the API key as
a Worker secret.

## Worker Secrets / Variables

Set these in Cloudflare Workers:

```text
STEAM_API_KEY = your Steam Web API key
STEAM_ID64 = 76561198134543238
ALLOWED_ORIGIN = https://banrigaming.github.io
```

The Worker automatically allows local dev origins such as
`http://127.0.0.1:5500`, `http://127.0.0.1:8088`, and `http://localhost:5500`.
For a stricter custom list, set either `ALLOWED_ORIGIN` or `ALLOWED_ORIGINS` to a
comma-separated list:

```text
ALLOWED_ORIGINS = https://banrigaming.github.io,http://127.0.0.1:5500,http://127.0.0.1:8088
```

For quick testing you can also use `ALLOWED_ORIGIN = *`, but production should
use the real site origin.

## Wrangler Commands

From the repo root or a Worker project folder:

```bash
wrangler deploy
wrangler secret put STEAM_API_KEY
wrangler secret put STEAM_ID64
wrangler secret put ALLOWED_ORIGIN
```

Paste the Worker URL into:

```text
Admin Console -> Game Library -> Steam Signal -> Worker URL
```

Then press `Sync Steam Signal`. The admin sync saves the sanitized metrics to
Realtime Database under `steamSignal`, updates matched game-library hours, and
publishes an activity record.

## Firebase Rules

Copy the updated `firebase-realtime-database-rules.json` into Firebase rules
before syncing:

```json
"steamSignal": {
  ".read": true,
  ".write": "auth != null && root.child('admins').child(auth.uid).val() === true"
}
```

## Notes

- Steam account value and exact paid/free splits are not provided by the official
  Steam Web API, so the site does not calculate them yet.
- Match quality is best when each library record has a Steam App ID. The admin
  sync also attempts a title match for older records.
