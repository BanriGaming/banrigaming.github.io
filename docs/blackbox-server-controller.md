# Blackbox Server Controller Handoff

This document explains the Bancy Waypoint Worlds controller structure and what still needs to be configured on Blackbox, Firebase, and Cloudflare.

## Direction

The public website already has `/worlds.html` for hosted server cards. This pass adds a second, authenticated controller layer:

```text
Bancy Waypoint website
  -> Firebase Auth ID token
  -> Cloudflare Tunnel public hostname
  -> game-server-controller on Blackbox
  -> private socket proxy
  -> Docker Engine
```

The website never gets a Docker socket, Docker API port, service account JSON, or Cloudflare token.

## Files Created On Blackbox Share

The controller scaffold is at:

```text
S:\server-controller
```

On the NAS, that is:

```text
/volume1/docker/server-controller
```

Important files:

- `S:\server-controller\compose.yaml`
- `S:\server-controller\.env.example`
- `S:\server-controller\controller\Dockerfile`
- `S:\server-controller\controller\package.json`
- `S:\server-controller\controller\server.js`
- `S:\server-controller\README.md`
- `S:\server-controller\SETUP-STEPS.md`

## Website Files Changed

- `assets/js/site-store.js`
  - Adds `serverController` Firebase config helpers.
- `admin.html`
  - Adds the `Controller Access` tab.
- `assets/js/admin.js`
  - Lets admins save the controller API URL, polling interval, enabled flag, and allowed UIDs.
- `worlds.html`
  - Adds `Server Registry` and `Blackbox Controller` tabs.
- `assets/js/worlds.js`
  - Loads controller config, sends Firebase ID tokens, polls status, and sends start/stop/restart commands.
- `assets/css/main.css`
  - Styles the controller tab and admin access rows.
- `firebase-realtime-database-rules.json`
  - Adds rules for `serverController`.

## Firebase Realtime Database Path

The website Admin page writes:

```text
serverController
```

Shape:

```json
{
  "apiUrl": "https://servers-api.bancy.gg",
  "enabled": true,
  "pollSeconds": 8,
  "allowedUids": {
    "firebaseUidHere": true
  },
  "servers": {
    "palworld": {
      "id": "palworld",
      "label": "Palworld",
      "game": "Palworld",
      "container": "palworld-server",
      "enabled": true,
      "order": 11
    }
  },
  "updatedAt": 1780000000000,
  "updatedByUid": "adminUidHere"
}
```

Copy the updated `firebase-realtime-database-rules.json` into Firebase Rules before testing the controller tab live.

## Admin And Operator Access

There are two different permissions:

- Website admin: controls `/admin.html`, game library data, Worlds records, and can add controller operators.
- Controller operator: can see the Worlds `Blackbox Controller` tab and send start, stop, and restart commands.

To make another person a website admin:

1. Have them register and log in once.
2. Open `/admin.html` as Darren.
3. Go to `Members`, copy their Firebase UID.
4. In Firebase Console > Realtime Database > Data, add `admins/theirFirebaseUidHere = true`.

The current rules intentionally do not let the website edit `/admins`; this keeps admin promotion owner-only from Firebase Console.

To let an admin or trusted person use server controls:

1. Open `/admin.html`.
2. Go to `Controller Access`.
3. Add them from the member dropdown or paste their UID.
4. Click `Save Controller`.

## Approved Server IDs

The controller reads approved Docker targets from Firebase at `serverController/servers`. Future server additions should be made from `/admin.html`; the baked-in fallback list is only used when Firebase has no saved server config or cannot be reached.

To add a future Blackbox-hosted server:

1. Create the Docker project/container on Blackbox.
2. Confirm the container has a stable `container_name` such as `palworld-server`.
3. Open Admin > `World Servers`.
4. Click `Add Server`.
5. Set `Status Source` to `Blackbox Controller`.
6. Enter the `Controller ID` and exact Docker `Container` name.
7. Fill the public registry details: title, game, host, region, tags, connection records, notes, and password if needed.
8. For automatic player counts, enable `Live Player Query` and set the GameDig query type, host, port, and optional max players fallback. Leave those blank for games that cannot be queried yet.
9. Save the server record.

Saving the server record writes both the public `worldServers` card and the private `serverController/servers` allowlist. The Blackbox controller reads that allowlist from Firebase live, so adding another server from the website does not require editing `server.js` again. The public registry never uses hand-entered player activity for Blackbox servers; it displays `playersOnline`, `playersMax`, and `activityLevel` from the controller response.

Soulmask also has an optional read-only log fallback. The controller compose mounts `/volume1/docker/soulmask/data/Logs` at `/game-logs/soulmask` and reads `WS.log` when the normal GameDig query returns zero or fails.

You only need to rebuild the `server-controller` Docker app when the controller app code, Dockerfile, compose file, environment variables, package dependencies, or service-account mount changes. Creating or updating a game server's own Docker project is handled in that game's folder, then linked from Admin.

Default fallback route IDs:

```text
dragonwilds
soulmask
vrising
enshrouded
valheim
terraria
corekeeper
barotrauma
romestead
ats
```

Those map to these default container names:

```text
dragonwilds-server
soulmask-server
vrising-server
enshrouded-server
valheim-server
terraria-server
corekeeper-server
barotrauma-server
romestead-server
ats-server
```

After this dynamic-controller update is rebuilt once on Blackbox, adding another server through the website does not require editing `server.js` again.

## V Rising Note

Current `S:\vrising\compose.yaml` does not set `container_name`. To make the controller find it by the expected name, add:

```yaml
container_name: vrising-server
```

under the `vrising:` service.

## Blackbox Setup

On Blackbox:

```bash
cd /volume1/docker/server-controller
cp .env.example .env
```

Edit `.env`, then fill:

```bash
ALLOWED_ORIGINS=http://127.0.0.1:8088,http://localhost:8088,http://127.0.0.1:5500,http://localhost:5500,https://banrigaming.github.io,https://bancy.gg,https://www.bancy.gg
ADMIN_UIDS=YOUR_FIREBASE_UID
FIREBASE_DATABASE_URL=https://banrigaming-90820-default-rtdb.firebaseio.com
SERVER_CONTROL_PATH=serverController/allowedUids
SERVER_CONFIG_PATH=serverController/servers
CLOUDFLARED_TOKEN=YOUR_CLOUDFLARE_TUNNEL_TOKEN
```

Add Firebase service account JSON:

```text
/volume1/docker/server-controller/secrets/firebase-service-account.json
```

Then start:

```bash
docker compose up -d --build
```

Health check:

```bash
curl https://servers-api.bancy.gg/health
```

Expected:

```json
{"ok":true,"playerQuery":true}
```

## Admin Setup

In `/admin.html`:

1. Open `Controller Access`.
2. Paste the Cloudflare public API URL.
3. Toggle `Controller Enabled`.
4. Add allowed Firebase UIDs.
5. Save Controller.

Then in `/worlds.html`, signed-in allowed users will see the `Blackbox Controller` tab.

## Behavior

- `Refresh Status` polls approved Docker containers.
- `Start` starts one server.
- `Switch` stops any other approved running server before starting the selected server.
- `Stop` stops the selected running server.
- `Restart` stops and starts the selected server.
- Missing containers show as `Missing` and their controls are disabled.

## Security Rules Of Thumb

- No `ports:` in the controller compose.
- Do not expose Docker `2375`.
- Do not mount Docker socket into the Node controller.
- Do not add arbitrary container control from the frontend.
- Keep service account JSON and Cloudflare token out of GitHub.
