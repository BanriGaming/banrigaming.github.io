# BANRI Gaming Firebase Setup

Use `firebase-realtime-database-rules.json` as the Realtime Database Rules payload.

## Console Steps

1. Open Firebase Console for `banrigaming-90820`.
2. Go to Authentication > Sign-in method.
3. Enable Email/Password.
4. Create your account from the site login modal.
5. Copy your UID from Authentication > Users.
6. Go to Realtime Database > Data and add:

```json
{
  "admins": {
    "YOUR_FIREBASE_AUTH_UID": true
  }
}
```

7. Go to Realtime Database > Rules.
8. Paste the contents of `firebase-realtime-database-rules.json`.
9. Publish the rules.

## Data Shape

Private profile settings are stored at:

```text
profiles/{uid}
```

Only the signed-in user can read or write that node.

Public display data is stored at:

```text
publicProfiles/{uid}
```

Only public profile display fields are allowed there, and only the signed-in owner can write it. This gives Nexus features a safe public profile lookup without exposing email or private settings.

## Admin Data

The admin page writes these public-read/admin-write nodes:

```text
siteConfig/currentGames
siteConfig/tacticalFeed
siteConfig/quotes
siteConfig/hero
siteConfig/heroVisual
gamesLibrary
activityFeed
activityArchive
galleryCollections
galleryImages
chronicles/worlds
chronicles/threads
chronicles/posts
chronicles/characters
```

The `admins/{uid}` value controls whether the hidden Nexus admin entry appears and whether the admin page can save data.

`gamesLibrary` entries can also store optional `steamAppId` and `steamName` fields. A real Steam hours sync should run through a private worker or backend so your Steam Web API key is not exposed in browser code.

## Image Storage

Uploaded profile avatars, gallery images, and Chronicle post image attachments are stored as small Realtime Database data URLs. This avoids Firebase Storage, which requires a paid-plan upgrade for this project. Use image URLs for larger screenshots or artwork.

Current upload limits:

```text
Profile avatars: 900 KB or smaller
Gallery images: 2 MB or smaller
Chronicle post attachments: 1 MB or smaller
```

## Midnight Relay

The private Nexus chat uses:

```text
relayMessages
relayReactions
presence/{uid}
```

Only signed-in users can read relay data. Users can edit/delete their own messages, write their own presence record, and add/remove their own reactions.

## Chronicles

The private play-by-post area uses:

```text
chronicles/worlds
chronicles/threads/{worldId}
chronicles/posts/{worldId}/{threadId}
chronicles/characters
chronicles/codex
chronicles/echoes
```

Only signed-in users can read Chronicles data. Worlds and location threads are admin-only to write. Signed-in users can create and manage their own posts, character records, dossier Codex notes, and public/personal Echo side chronicles. Admins can write any Chronicle entry, which is what enables editor mode for rebuilding older Discord/forum posts under the correct author name.

The `Notify New Posts` button uses the browser Notifications API. It can alert you to new Chronicle posts while the page is open, and the on/off preference is saved in local storage for that browser.
