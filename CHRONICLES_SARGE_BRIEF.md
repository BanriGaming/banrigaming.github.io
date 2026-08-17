# Banri Gaming Chronicles: Full System Brief For Sarge

This document explains how the Banri Gaming Chronicles feature currently works, what it is for, how the data is organized, and what decisions still need strategy. It is written so it can be copied into ChatGPT / Sarge for planning.

## High-Level Purpose

Chronicles is a logged-in play-by-post roleplay and collaborative storytelling area inside the Banri Gaming website. It is meant to replace or supplement Discord/forum-style roleplay threads with a more organized, premium, noir-themed interface.

The core idea:

- A **World** is a full roleplay setting or campaign, such as `Echoes After the Forge` or `The Sundertide of Varynth`.
- A **Category** is a region, province, sector, or organizational grouping inside a world.
- A **Thread** is a specific location inside a world, such as Coruscant, Dantooine, Korriban, a province city, a tavern, a ship, or another scene location.
- A **Post** is a player or narrator story entry inside a thread.
- A **Character** is a public character sheet tied to a world and owner.
- The **Story So Far** view gathers narrative posts across a world so people can read the full continuity without clicking thread-to-thread.

The design target is old-school forum roleplay, but with a futuristic noir / Nexus / archive interface.

## Access Model

Chronicles is a logged-in feature.

Users must authenticate through Firebase Auth. The site already supports user profiles, display names, public profile signals, avatars, member cards, and presence elsewhere in the site.

Admins have extra powers:

- Create worlds.
- Edit world lore.
- Create/edit/delete categories.
- Create/edit/delete threads.
- Edit other users' character records if needed.
- Post as Narrator.
- Use author override / editor mode when rebuilding old Discord story history.
- Delete threads and posts.

Normal logged-in users can:

- Read worlds, lore, threads, posts, and public characters.
- Create characters.
- Create story posts.
- Edit/delete their own posts.
- Reply/follow up to other posts.

## Main Views / Tabs

Chronicles has several main in-page views rather than separate pages.

### Dashboard / Overview

The Dashboard is the landing view for Chronicles.

It shows:

- Quick actions.
- Stats overview.
- Recent posts/activity.
- A primer explaining how play-by-post works.
- General onboarding information for people who may not know PbP/forum roleplay.

The Dashboard is meant to answer:

- What happened recently?
- Where should I jump in?
- How does this system work?

### Worlds

The Worlds view lists available roleplay worlds.

Each world can have:

- Title
- Genre
- Status such as active, paused, completed, or inactive
- Description
- Cover image
- Lore
- Categories
- Threads/locations

Clicking a world opens its organized thread/location registry.

World status matters for discovery. Active worlds are meant to be prominent. Paused/completed worlds can still be readable.

### World Categories

Categories exist inside worlds to organize threads.

Example for `Echoes After the Forge`:

- Galactic Core
  - Coruscant
  - Corellia
  - Alderaan
- Mid Rim
  - Jedha
  - Dantooine
  - Duro
  - Telos IV
- Outer Rim
  - Tatooine
  - Mandalore
  - Taris
- Shadow Worlds
  - Korriban
  - Ziost
  - Manaan
  - Rakata Prime

Example for `The Sundertide of Varynth`:

- Provinces or regions
- Cities/settlements inside those provinces
- Each city/location is a thread

Categories are not story posts. They are organizational containers.

### Threads / Locations

A thread is the main place where roleplay happens. It represents a physical or narrative location.

Examples:

- Coruscant
- Dantooine
- Korriban
- A tavern
- A ship
- A battlefield
- A province capital

Threads have:

- Title
- Description
- Category assignment
- Status
- Posts

The first post in many threads may be a location description. These can be marked as `Location Description` so they are not treated as a normal story event.

Threads are searchable inside a world, because a large world may have many locations.

### Thread View / Forum View

Thread View is the actual forum-style reading/writing area.

It shows posts in chronological order inside that location.

Each post includes:

- Author area
- Author display name
- Character/voice label
- Post type
- Timestamp
- Edited marker when applicable
- Markdown-rendered body
- Attachments/images
- Buttons for reply, follow-up, edit, delete, and opening linked posts

The style is meant to feel like a premium noir archive/forum, not a basic chatroom.

### Characters

Characters are public within Chronicles.

Each character card can be opened in a modal/detail view. The detail view is read-only by default, then editable when edit mode is enabled.

Character fields include:

- Name
- Species / Origin World
- Age / Cycle of Years
- Vocation / Role
- Alignment
- Affiliation
- Current Location
- Status
- Image/avatar
- Origin Tale
- Armament / Equipment
- Skills / Force Aptitudes
- Personality Notes
- Hooks / Rumors
- Owner UID / owner display name
- World ID

Admins can edit ownership/display attribution so old Discord-imported characters can be rebuilt under the proper creator name even if the admin is entering them manually.

### Lore

Each world has lore. Lore is public/readable, but only admins should edit it.

Lore is displayed in a modal or dedicated reading area. Admins can toggle edit mode, update the lore, save it, then return to read mode.

Current seeded lore includes:

- `Echoes After the Forge`
- `The Sundertide of Varynth`

The lore is important because it establishes canon boundaries, tone, setting rules, and context for posts.

### Story So Far

Story So Far is the continuity reader.

It exists because play-by-post stories can spread across many threads and locations. If someone wants to catch up, they should not have to manually jump from Coruscant to Dantooine to Korriban and follow every follow-up link.

Story So Far gathers narrative posts across a selected world and can show:

- Full Chronicle: all narrative posts in chronological order
- Summary Signal: a local/free digest generated from existing posts in the browser

Important:

- `Location Description` posts are excluded from Story So Far as story events.
- Non-narrative/hidden post types can be excluded.
- Posts are ordered by timestamp.
- Each Story So Far entry can link back to its original thread/location.

OpenAI-powered AI summaries were prototyped but are currently parked because OpenAI API usage requires paid API credits separate from ChatGPT Plus. The visible UI has been removed/commented out for now, but the code is preserved for possible future use.

## Post Types

Posts can represent different types of entries.

### Player Post

A normal in-character roleplay entry from a player/character.

### Narrator Post

A story/system/world event posted by the Narrator or admin.

This is for:

- Timeline movement
- Environmental changes
- Scene-setting events
- Consequences
- World reactions
- Non-player events

Narrator posts are not tied to one player character in the same way normal posts are.

### Location Description

A setup post describing a location/thread.

Examples:

- “Welcome to Coruscant, the heart of galactic politics.”
- “All story posts that take place on Coruscant occur here.”
- Guidelines for how to use that location.

These should not count as story events in Story So Far.

## Editor Features

The post editor supports Markdown-style writing.

Toolbar features include:

- Bold
- Italic
- Heading
- Quote
- List
- Code
- Link
- Image
- OOC
- Preview

The quote behavior is intended to quote only lines that begin with `>` rather than swallowing the entire post.

OOC markup uses:

```text
[OOC: message here]
```

Rendered OOC text appears in a special visual style so it is clearly out-of-character.

Images can be attached by:

- Image URL
- File upload as data URL

Attached images are constrained visually so they do not become enormous in the post layout.

## Follow-Ups And Linked Continuity

Players can follow up to another post.

The idea comes from Discord usage where a player copied a message link and wrote “Post follow-up” with a hyperlink. In Chronicles, the system can build a follow-up prefill and link the new post back to the original.

This lets posts in different locations still reference each other.

Example:

- A post on Korriban triggers a response on Dantooine.
- The Dantooine post can include a follow-up link back to the Korriban post.
- Story So Far can still read both in chronological order.

## Character-Altering Effects

The post editor has an option for whether a writer allows other writers to make character-altering effects involving their character.

This is meant to communicate consent boundaries.

Examples of character-altering effects:

- Serious injury
- Permanent injury
- Capture
- Possession/mind control
- Death
- Major emotional/relationship consequences
- Forced relocation
- Loss of equipment

The post displays a small noir-themed badge/icon indicating:

- Allowed
- Not allowed

The badge should be subtle, small, and hoverable, with more detail in the tooltip.

This is not a mechanical rule engine. It is a consent/safety signal for collaborative writing.

## Admin / Editor Mode

Admin/editor mode exists because old Discord play-by-post history needs to be rebuilt manually.

Admin/editor features include:

- Create posts on behalf of other characters/people.
- Override author display.
- Choose Narrator voice.
- Create worlds.
- Create categories.
- Create threads/locations.
- Edit lore.
- Edit character owner/creator attribution.
- Delete posts/threads when needed.

This is important because the admin may enter old story posts from multiple people while importing a campaign archive.

## Post Editing Behavior

Editing a post should update the existing post, not create a duplicate.

If a post is edited and moved to a different world/thread/location, the original post should be removed from the old location and written to the new location with the same post identity where possible.

This behavior matters because users may forget to select the correct location before posting.

## Deleting Posts And Threads

Users can delete posts they own.

Admins can delete any post or thread.

Deleted posts/threads are marked in deleted registries so default seeded content can be hidden too.

Thread deletion removes:

- The thread record
- Its posts
- Its deleted marker is set so seed defaults do not reappear

## Notifications

Chronicles has the concept of notifications for new posts.

Current behavior:

- The app tracks known post IDs after initial load.
- New posts can trigger notification behavior after the initial snapshot is ready.

Strategic future question:

- Should notifications be browser notifications, in-site notifications, email, Discord webhook, or a mix?
- Should notifications be per world, per thread, per mentioned character, or global?

## Firebase Data Model

Chronicles uses Firebase Realtime Database.

Main paths:

```text
chronicles/worlds/{worldId}
chronicles/categories/{worldId}/{categoryId}
chronicles/threads/{worldId}/{threadId}
chronicles/posts/{worldId}/{threadId}/{postId}
chronicles/deletedThreads/{worldId}/{threadId}
chronicles/deletedPosts/{worldId}/{threadId}/{postId}
chronicles/summaries/{worldId}
chronicles/characters/{characterId}
chronicles/aiQueue/{uid}/{requestId}
```

Notes:

- `chronicles/summaries` exists for future AI-generated summaries but is currently not surfaced.
- `chronicles/aiQueue` exists for future queued AI processing but is currently parked.
- AI is not needed for normal Chronicles usage.
- The important live paths are worlds, categories, threads, posts, deleted markers, and characters.

## Seeded Defaults

The app includes local seed data for initial worlds, threads, categories, posts, lore, and characters. Firebase data merges with these defaults.

Seed data ensures the page is not empty even before Firebase is fully populated.

Deleted markers prevent unwanted seeded content from coming back after an admin deletes it.

## Security Rules Concept

The intended rules are:

- Logged-in users can read Chronicles.
- Admins can manage worlds, categories, threads, and lore.
- Users can create/edit/delete their own posts.
- Admins can edit/delete any posts.
- Users can create/edit their own characters.
- Admins can edit character attribution.
- AI queue entries are private to the requesting UID.

## Current AI Status

OpenAI AI Assist and AI Story Summary were prototyped with:

- Cloudflare Worker
- OpenAI API
- Firebase auth verification
- Firebase queue fallback

However, OpenAI API usage requires paid API credits, separate from ChatGPT Plus. Because the goal is to avoid paid API usage right now, the visible AI controls have been removed/commented out.

The code remains parked for possible future use.

Current visible Chronicles behavior is fully usable without OpenAI.

## Current Strategic Questions For Sarge

The user wants help deciding how best to use and grow Chronicles.

Questions to think through:

1. How should old Discord posts be imported cleanly?
2. Should every old Discord channel/location become a thread?
3. Should every first post be marked as Location Description?
4. How should follow-up links be represented when importing old Discord messages?
5. Should characters be imported first, then posts, or posts first with character attribution added later?
6. Should each world have a landing/overview page separate from the Worlds tab?
7. Should Story So Far stay chronological only, or support filters by character/location/category?
8. Should narrator posts appear visually different from player posts?
9. Should OOC notes be allowed in story posts or moved to a separate discussion layer?
10. Should imported posts keep original Discord timestamps or use new import timestamps with original date metadata?
11. Should summaries be manually written by the admin for now instead of AI-generated?
12. Should notifications be per world, per thread, or global?
13. How strict should character-altering effect consent be?
14. Should character sheets support relationships, inventory, current arc, and timeline notes?
15. Should each world have a timeline/event log separate from posts?

## Practical Import Plan

Recommended order:

1. Create or verify the world.
2. Add world lore.
3. Create categories/regions.
4. Create threads/locations.
5. Mark each location intro/setup post as `Location Description`.
6. Create character sheets.
7. Import old story posts in chronological order.
8. Use author override/editor mode so posts show the correct writer/character.
9. Add follow-up links where old Discord replies crossed locations.
10. Review Story So Far to confirm chronological continuity reads correctly.

## Important Tone And Design Direction

Chronicles should feel like:

- Noir archive
- Futuristic relay
- Holocron / Nexus terminal
- Premium writing forum
- Collaborative story engine

It should not feel like:

- A plain Discord clone
- A generic forum template
- A chatroom
- A spreadsheet of posts

The goal is a serious, immersive writing environment that makes friends and family want to participate in a shared story.
