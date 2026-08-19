import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  onValue,
  push,
  remove,
  ref,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  CHRONICLES_AUDIO_RESOLVER_URL,
  defaultChroniclesAiConfig,
  getFirebaseServices,
  isAdminUid,
  normalizeChroniclesAiConfig,
  readFileAsDataUrl,
  runChroniclesAiQueuedRequest,
  slugify
} from "./site-store.js?v=20260817g";

const { auth, database } = getFirebaseServices();
const CHRONICLES_AI_FEATURE_ENABLED = false;
const CHRONICLES_PORTRAIT_MAX_BYTES = 1024 * 1024;
const CHRONICLES_PORTRAIT_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const CHRONICLES_AUDIO_TYPES = new Set(["voice", "music", "ambience", "transmission", "sfx", "other"]);
const CHRONICLES_STORY_PAGE_SIZE = 3;

const ECHOES_LORE = `# Holocron Record VII-C: Echoes After the Forge

Recovered transmission from the Archives of Coruscant, classified 3955 BBY.

> The war is over, yet the wound remains. The stars themselves bear the scar.

## Canon Backdrop

This chronicle begins in the Old Republic era, nearly four thousand years before the Skywalker saga. Revan and Malak defied the Jedi Council during the Mandalorian Wars, returned from the Unknown Regions as Sith Lords, and dragged the galaxy into the Jedi Civil War.

Revan was betrayed by Malak, captured by the Jedi Council, and given a new identity in the hope that the light could redeem what the war had made. The journey that followed crossed Taris, Dantooine, Tatooine, Kashyyyk, Manaan, Korriban, Rakata Prime, and finally the Star Forge itself.

The canon path for this archive follows the light-side ending: Revan confronts and defeats Darth Malak, Bastila Shan is redeemed, and the Republic survives. The victory is real, but not clean.

## Prologue: The State of the Galaxy

The year is 3955 BBY, one year after the destruction of the Star Forge. The weapon that fed upon the Dark Side and forged fleets without end now drifts as molten debris above Rakata Prime. Darth Malak is dead. His Sith Armada lies shattered, its admirals turning pirate and its apprentices declaring themselves lords over the ruins of worlds.

The Galactic Republic has survived, but only in name. Thousands of systems burned during the Jedi Civil War. Trade routes are broken, and worlds once loyal to Coruscant now swear allegiance to whoever can protect them. Relief convoys vanish beyond the Galactic Core, and the Senate whispers of secession and civil unrest.

The Jedi Order endures only in fragments. The Council, humbled by its own blindness, struggles to rebuild temples and faith alike. Many Jedi Knights never returned from the front. Others refuse to answer the Council's call, haunted by what they became. Some have laid down their lightsabers altogether, seeking quiet lives on forgotten colonies or paths of grey neutrality.

From the Outer Rim, darker currents stir. Power vacuums attract warlords, cults, and relic hunters. Holocrons, once thought lost, resurface on black markets. On certain nights, travelers swear hyperspace feels thin, as though something vast watches from between the stars.

This is the galaxy's uneasy dawn: no single master, no certain peace, only echoes of empires fallen, faiths betrayed, and powers yet unnamed.

## Purpose of the Chronicle

This archive exists for collaborative storytelling through Play-by-Post entries. Each participant writes from the view of a single original character whose choices weave the continuing history of the Old Republic's recovery.

## Inscription Into the Holocron

Before posting, add a character record to the Registry of Beings:

- Name
- Species / Origin World
- Cycle of Years
- Vocation / Role
- Alignment
- Affiliation
- Origin Tale
- Current Location
- Armament / Equipment
- Skills / Force Aptitudes
- Personality Notes
- Hooks / Rumors

## Accepted Vocations

Force-users may be Jedi Guardians, Consulars, Sentinels, Gray Wanderers, Dark Adepts, Sith Remnants, or other lore-fitting paths.

Non-Force users may be Republic soldiers, pilots, engineers, Mandalorians, mercenaries, bounty hunters, smugglers, traders, explorers, spies, scholars, civilians, or any grounded role that fits the era.

Every voice shapes the chronicle. No single path is greater than another.

## Conduct Within the Archive

Write in third-person past tense. The Holocron records what has happened, not what is happening.

Control only your own character. Do not decide another character's injuries, choices, or fate without permission.

Stay within KOTOR-era Star Wars logic. Avoid anachronistic technology, invincibility, and anything that breaks the shared tone.

Each post should add meaning or motion. A full paragraph is the minimum; more is encouraged when it deepens the scene.

Use OOC notes sparingly with (( )) or [OOC:] tags. If a duel or conflict is unclear, settle it privately or ask a Custodian to mediate.

## Structure of the Galaxy

Active sector archives include Coruscant, Dantooine, Taris, Onderon, Dxun, Korriban, Manaan, Kashyyyk, Tatooine, Rakata Prime, Nar Shaddaa, Telos IV, Corellia, Alderaan, Duro, Mandalore, and assorted Outer Rim colonies.

Worlds not yet known or accessible include Naboo, Kamino, Geonosis, Mustafar, Scarif, Crait, Batuu, Exegol, Jakku, Hosnian Prime, and any Clone Wars or Skywalker-era stations, fleets, or factions.

Players may invent original planets or stations if they fit Old Republic technology and tone. Time flows sequentially within each location. Travel between worlds must remain plausible within galactic distance and communication limits.

## On Power and Growth

Force-users begin with fundamental disciplines: Force Push, Force Pull, Force Sense, and basic saber forms. Mastery evolves through storytelling, training, discovery, and consequence.

Non-Force users progress through experience, equipment, reputation, allies, contacts, and hard-earned scars.

The Holocron records deeds, not dice.

## Canon Alignment

Timeline: immediately after the destruction of the Star Forge.

Known figures: Revan has vanished, Malak is dead, the Jedi Council is reassembling, the Republic is reeling, and the Sith are fractured.

Active worlds include a rebuilding Taris, ruined Dantooine, restless Onderon, haunted Korriban, Rakata Prime, and countless lawless Outer Rim systems.

## Joining the Chronicle

Submit your inscribed record to the Registry, await confirmation from a Holocron Custodian, choose a starting world or vessel, then post your first entry describing arrival, mission, or struggle.

Peace is a whisper, not a promise. The Forge is gone, yet its embers drift among the stars. Write carefully, what you create may outlive you.`;

const SUNDERTIDE_LORE = `# The Sundertide of Varynth

> When the world broke, it did not fall apart. It drifted away from itself.

## The Age Before

No one living remembers the first world, only the silence that followed its end. Long ago, Varynth was whole: land and sky one body, seas unbroken, magic flowing evenly through every vein of the earth. Then came the Sundertide, a cataclysm born not of gods, but of imbalance.

The world's core convulsed. Rivers boiled. The sky folded inward. Mountains tore loose and hung suspended, seas drained into the air, and entire continents rose while others sank into darkness.

When the storm cleared, the world had become four.

## Cael-Ascendia: The Upper Continent

High above the storms lies Cael-Ascendia, a continent drenched in endless light. Its lands are fertile and radiant, its cities proud, bastions of order built atop what little stability remains. Arcadia's forges thunder with invention. Caelune's marble towers gleam as the center of trade and study.

From its ports, ships ascend toward the Skybound Reach. Cael-Ascendia thrives, but its thriving is uneasy. Every tremor beneath the stone reminds its people that the world below still moves.

## The Skybound Reach

Above Ascendia drift the remnants of mountains torn from the surface. Islands of stone and crystal sail the upper winds, tethered only by ancient aether currents. Airships from Arcadia brave the tempests to ferry explorers and merchants to Elysium, the lone sky-city where wind-borne guilds and adventurers chart the shifting horizon.

Each island hides relics of the world before, and dangers that were never meant to wake again. Islands shift without warning. Storms devour fleets. Strange entities shaped by Sundertide magic awaken in the mists.

## Tetherfall: The Spirelands

Between light and shadow stands Tetherfall, a vast scar encircling the Spire of Velara. The Spire pierces the clouds, its crystal and obsidian veins pulsing faintly with the same energy that once held the world together.

Around it stretches a wasteland of fissures and glowing storms where gravity, time, and magic blur. Pilgrims call it the bridge between realms. Scholars call it a wound that never healed. Both are correct.

## The Chasmyr Expanse

Far beneath the storms lies the Expanse, covered in an unending shroud that blots out light. Here the sun is only a rumor. Cities lie entombed in mist, forests bleed, and the ground itself remembers the scream of the Sundertide.

Among its ruins stand Dawnsworn, where sorcery festers; Crimson Vale, where the trees pulse with living blood; and Orrenfall, the ghost-kingdom of a forgotten age. Hunters still venture into Wyrm's Hollow at the base of Tetherfall, chasing fortune through the shadows. Most never return.

## The Sundertide's Wake

Current age: Cycle of the Sundertide, Year 843 of the Reforged Era.

The Aetheric Cycle is counted from the first year the Spire of Velara reignited after the long silence. Each century is called a Cycle, marked by the changing pulse of the Spire's glow. The world now stands deep within the Eighth Cycle, an age of fragile revival.

Eight centuries since the fracture, the world has adapted but never recovered. The scars of the Sundertide remain in the torn skies above, the rifts below, and the unstable veins of magic that hum across Tetherfall.

What was once worshiped as divine is now studied as volatile. What was once lost is being rediscovered. The Age of Silence has ended, and with it, an age of exploration, ambition, and consequence begins.

## The Present

The world stands at a crossroads between rediscovery and ruin. Guilds rise across Caelune and Elysium to chart lost realms, profit from relics of the First World, or seek answers buried deep within the Expanse.

For many years now, the Spire of Velara has begun to tremble. Scholars of Caelune noticed the faint hum in their crystals. Airship captains reported magnetic storms near Tetherfall. Miners of the Chasmyr Expanse feel a deep rhythm in the earth, like the heartbeat of a sleeping giant.

If the Spire shatters, the upper continent could fall, the Reach could collapse, and the Sundertide could rise again.

Whispers spread faster than the winds. Some say the Spire is straining under centuries of imbalance. Others claim something deep within the Chasmyr Expanse stirs: the same power that fractured the world once before.

It is an age of soaring airships, magic, war, fortune, bleeding forests, crystals that hum with memory, and blades forged from fallen sky.

Does the Sundertide stir again? Varynth waits for those bold or desperate enough to decide whether it will heal or break anew.`;

const RESOURCE_GUIDES = [
  {
    id: "ui-overview",
    title: "Chronicles UI Overview",
    text: "Dashboard, worlds, threads, resources, and Story So Far in one operating map.",
    body: `## What Chronicles Is

Chronicles is a private play-by-post writing system built around worlds, location threads, characters, and narrative posts.

Players write entries like mini-chapters. Each post describes a character's actions, dialogue, thoughts, and consequences inside a shared world.

## Dashboard

The Dashboard is the active writing command center.

- Recent Posts shows the newest narrative entries across all active worlds.
- Open Post jumps directly to the original location thread.
- Follow Up answers that post while preserving a link back to the source entry.
- Create Post opens the transmission editor.
- Create Character opens the dossier intake form.
- Create Echo starts a personal character side chronicle.
- New Thread and New World appear only for admins.

## Worlds And Threads

Worlds are the top-level campaigns or settings, such as Echoes After the Forge or Sundertide of Varynth.

Threads are locations inside a world. A thread can be a planet, city, tavern, starship, battlefield, ruin, province, sector, or any place where characters can write scenes.

Admins can group threads into categories. For example:

- Star Wars: Galactic Core, Mid Rim, Outer Rim, Shadow Worlds.
- Fantasy: provinces, kingdoms, regions, cities, wilderness zones.

Use thread search when a world has too many locations to scan. Characters should write arrivals and departures when moving between locations so the timeline stays readable.

## Story So Far

Story So Far is the catch-up view.

- Full Chronicle shows narrative posts in chronological order.
- Summary Signal is reserved for compact digests later.
- Location Description posts are excluded from Story So Far.
- Deleted posts are removed from the timeline and counts.

Use Story So Far when someone wants to read the campaign without jumping thread-to-thread.

## Resources

Resources is the operating manual. It explains how each tool works, how fields should be formatted, and how to keep the archive clean.`
  },
  {
    id: "posts",
    title: "Posts And Follow-Ups",
    text: "How to transmit a narrative post, write narrator events, and link follow-up responses.",
    body: `## Create Post

The post editor is where normal story entries are written.

Required fields:

- World
- Thread / Location
- Narrative Post

Recommended fields:

- Character Voice
- Post Title
- Character Effects preference

## Character Voice

Selecting a character fills the author fields so the post is linked to that dossier. This is what updates the dossier's location history and latest appearance.

## Follow-Ups

Use Follow Up on a post when your entry is answering another writer. The editor inserts a link back to the source post so readers can follow the chain.

## Narrator Posts

Admins can post as Narrator for world events, environmental consequences, or custodian timeline movement.

## Location Descriptions

Admins can mark a post as Location Description. These are useful as first posts in a thread, but they are excluded from Story So Far so the timeline stays focused on actual story events.`
  },
  {
    id: "dossier",
    title: "Character Dossiers",
    text: "Every dossier field, tab, URL format, connection format, archive format, and Codex detail.",
    body: `## Dossiers

A dossier is a public character record. It stores profile lore, status, linked posts, gallery art, audio, relationships, archive files, OOC preferences, Codex entries, and Echoes.

## Main Fields

- Name: the character name.
- Species / Origin: species and homeworld or origin.
- Cycle of Years: age.
- Vocation / Role: job, class, faction role, or archetype.
- Alignment: moral or faction alignment.
- Affiliation: group, faction, order, guild, or independent status.
- Current Location: derived from the character's latest linked post.
- Current Arc: the active story arc, chapter, or campaign phase.
- Active Objective: what the character is trying to do now.
- Condition / Status: health, state, condition, or narrative status.
- Portrait Upload: JPEG, PNG, WebP, or GIF. This is stored in Realtime Database as compact portrait data.
- Origin Tale: character history, opening lore, or biography.
- Armament / Equipment: weapons, tools, armor, ships, relics, or carried items.
- Skills / Aptitudes: talents, Force abilities, magic, professions, combat style, languages, or technical abilities.
- Personality Notes: temperament, motives, flaws, habits, or social behavior.
- Hooks / Rumors: public hooks, leads, mysteries, reputation, or rumors others can use.
- Writing Preference: how the writer prefers scenes to be handled.
- Consent Boundary: what requires permission before other writers affect this character.
- Posting Pace: how often the writer expects to respond.
- OOC Notes: public collaborator notes attached to the character.

## Gallery Images

Gallery art is URL-only. Use Imgur direct image links, Discord CDN image links, personal CDN links, or any host that gives a real image URL ending in a useful file type such as .png, .jpg, .jpeg, .webp, or .gif.

Format one image per line:

\`\`\`
URL | Title | Caption
https://i.imgur.com/example.png | Karniss | Ancient Deshade of the First Empire
\`\`\`

If an Imgur album link does not load, open the image directly and use the direct image URL, usually like:

\`\`\`
https://i.imgur.com/fileId.png
\`\`\`

## Dossier Audio

Audio records can be direct MP3/audio URLs or Suno share links. Suno pages are compatible when the audio resolver Worker is deployed; the system resolves the playable audio behind the scenes.

Format one audio signal per line:

\`\`\`
Source URL | Title | Caption | Type | Optional direct playback URL | Optional pinned
https://suno.com/s/songId | Rhun's Doctrine | Character theme | music | | pinned
https://example.com/theme.mp3 | Battle Motif | Boss theme | music
\`\`\`

The Source URL is what Open Audio opens. The direct playback URL is optional and only needed when you already have a playable MP3/CDN URL. Pinning can also be managed from the Archive Files tab. A maximum of two pinned audio signals display in the dossier header.

## Connections

Connections are public relationship records. Use them for allies, rivals, enemies, family, patrons, factions, mentors, ships, or important NPC links. If the name matches an existing dossier, it becomes a dossier link.

Format one connection per line:

\`\`\`
Name | Relationship Type | Status | Public Note
Aelira Kaen | Ally | Trusted | Shared history after the Forge
Karniss | Guardian | Unstable | Bound to the tomb archive
\`\`\`

## Archive File URLs

Archive files are linked references, not Firebase uploads. Use them for maps, PDFs, documents, art references, external lore pages, recovered records, playlists, or supporting files.

Format one archive file per line:

\`\`\`
URL | Title | Caption | Type
https://example.com/map.pdf | Tomb Map | Recovered record | document
https://example.com/reference.png | Armor Study | Visual reference | image
\`\`\`

Suggested types: document, map, reference, image, music, audio, relic, report, or other.

## Dossier Tabs

- Profile shows the core public biography.
- Appearances lists posts linked to that character.
- Codex stores lore notes, ability rules, doctrine, science, research, limits, and field notes.
- Echoes shows personal side chronicles tied to the character.
- Connections shows public relationship records.
- Gallery shows URL-linked character art.
- Archive Files shows audio and external reference files. This is where header audio can be pinned or unpinned.
- OOC shows collaborator notes, writing preference, consent boundary, and posting pace.

## Codex Entries

Codex is part of the dossier system. Use it for ability explanations, relic notes, doctrine, metaphysics, research logs, combat limits, consequences, or any reference that should stay attached to the character.

Codex input format:

- Character: the dossier this record belongs to.
- Entry Title: readable title.
- Classification: ability, doctrine, field note, relic, research, or another useful label.
- Short Summary: one-line scan text.
- Tags: comma-separated labels such as force, dread aura, Korriban.
- Codex Record: markdown body text.

## Ownership

Admins can edit all dossiers. Normal users can edit dossiers assigned to their UID or created by them.

## Continue As

Continue As opens a new post with that character selected. This is the cleanest way to keep the dossier history accurate.`
  },
  {
    id: "echoes",
    title: "Echoes",
    text: "How personal side-stories work and how they differ from main thread posts.",
    body: `## Echoes

Echoes are public personal side chronicles tied to a character dossier.

Use Echoes for:

- Character memories.
- Solo scenes.
- Side journeys.
- Private lore revealed publicly.
- Small substories that support the main campaign.

## Difference From Posts

Posts happen in location threads and affect the active campaign timeline.

Echoes are linked to a character and live in the Echoes tab and dossier. They are readable by everyone, but they do not automatically enter Story So Far.

## Input Format

- Character: the character this Echo belongs to.
- Visibility: Public, Draft, or Archived.
- Continuity: Canon, Soft Canon, Rumor, or Draft.
- Timeline: when it happens relative to the main story.
- Location: where it happens.
- Cover Image URL: optional linked art.
- Reader Summary: short context.
- Echo Text: the full side-story in markdown.`
  },
  {
    id: "formatting",
    title: "Formatting And OOC",
    text: "Markdown, quote lines, OOC notes, images, and character-effects badges.",
    body: `## Markdown Tools

The editor buttons insert common markdown:

- B for bold.
- I for italic.
- H for heading.
- > for a quote line.
- List for bullet lists.
- Link for a hyperlink.
- Image for an image URL.
- OOC for an out-of-character note.

## Quote Lines

Use the quote button for a single quoted line. If you want multiple separate quote boxes, put normal text or a blank line between quoted lines.

## OOC Notes

OOC inserts this format:

[OOC: your note here]

When posted, it renders as a special out-of-character note.

## Images

For thread posts, you can attach image URLs or small uploaded images. Larger artwork is better as URL links.

## Character Effects

The character-effects checkbox marks whether other writers may make character-altering calls in that scene. Locked means they should ask first.`
  },
  {
    id: "admin",
    title: "Admin And Custodian Tools",
    text: "What admins can create, edit, and maintain inside Chronicles.",
    body: `## Admin Role

Admins act as custodians and editors.

Admins can:

- Create worlds.
- Create categories.
- Create and edit location threads.
- Edit all character dossiers.
- Post as Narrator.
- Create Location Description posts.
- Rebuild older Discord or forum posts under the correct author name.
- Delete threads and posts when needed.

## Editor Mode

Author Override and Owner Display are admin tools for rebuilding old posts. Use them when importing history from Discord or another writing archive.

## Firebase Rules

Chronicles uses Realtime Database paths for worlds, threads, categories, posts, characters, Codex, Echoes, summaries, and deleted-post markers. After this feature, paste the updated rules file into Firebase before testing saves live.`
  },
  {
    id: "etiquette",
    title: "Writing Etiquette",
    text: "Tone, pacing, agency, god-modding, and collaboration expectations.",
    body: `## Narrative Expectations

Write in third-person past tense. Each post should add motion, atmosphere, dialogue, consequence, or a hook another player can answer.

## Agency

Control your own character. Do not decide another character's injury, death, emotions, or permanent consequences without permission.

## Collaboration

There are no win conditions. The goal is shared drama, growth, atmosphere, and memorable scenes.

## Conflict

If a conflict is unclear, pause and ask the other writer or a custodian before continuing.

## OOC

Use OOC notes sparingly. Keep them useful, short, and respectful.`
  }
];

const DEFAULT_WORLDS = [
  {
    id: "echoes-after-the-forge",
    title: "Echoes After the Forge",
    genre: "Star Wars RPG",
    status: "Active",
    image: "/assets/img/hero/banri-hero-05.webp",
    description: "One year after the Star Forge falls, the Republic survives in name while Sith remnants, relic hunters, and broken trade routes pull the galaxy apart.",
    lore: ECHOES_LORE,
    order: 1
  },
  {
    id: "sundertide-of-varynth",
    title: "Sundertide of Varynth",
    genre: "Fantasy World",
    status: "Active",
    image: "/assets/img/hero/banri-hero-03.webp",
    description: "A fractured world of sky-isles, deep fog, unstable magic, and a Spire whose pulse may wake the old catastrophe.",
    lore: SUNDERTIDE_LORE,
    order: 2
  }
];

const DEFAULT_THREADS = {
  "echoes-after-the-forge": [
    {
      id: "coruscant",
      categoryId: "galactic-core",
      title: "Coruscant",
      description: "Republic capital and Jedi Council seat. All story posts that take place on Coruscant occur here.",
      order: 1
    },
    {
      id: "korriban-training-grounds",
      categoryId: "shadow-worlds",
      title: "Korriban Old Training Grounds",
      description: "Ruins, caves, Sith remnants, and hungry tomb winds. Post departures before moving between worlds.",
      order: 2
    }
  ],
  "sundertide-of-varynth": [
    {
      id: "caelune",
      categoryId: "cael-ascendia",
      title: "Caelune",
      description: "The luminous capital of Cael-Ascendia, where guild banners, scholars, and politics crowd the skyline.",
      order: 1
    },
    {
      id: "skybound-reach",
      categoryId: "skybound-reach",
      title: "Skybound Reach",
      description: "Floating islands, airships, relic storms, and shifting routes above the broken world.",
      order: 2
    },
    {
      id: "chasmyr-expanse",
      categoryId: "chasmyr-expanse",
      title: "Chasmyr Expanse",
      description: "The world below. Black fog, buried cities, old sorcery, and the long memory of the Sundertide.",
      order: 3
    }
  ]
};

const DEFAULT_CATEGORIES = {
  "echoes-after-the-forge": [
    { id: "galactic-core", title: "Galactic Core", description: "Coruscant, Corellia, Alderaan, and the political gravity wells of the Republic.", order: 1 },
    { id: "mid-rim", title: "Mid Rim", description: "Jedha, Dantooine, Duro, Telos IV, and worlds rebuilding between old wounds.", order: 2 },
    { id: "outer-rim", title: "Outer Rim", description: "Tatooine, Mandalore, Taris, Nar Shaddaa, and lawless frontier routes.", order: 3 },
    { id: "shadow-worlds", title: "Shadow Worlds", description: "Korriban, Ziost, Manaan, Rakata Prime, and places where relics still whisper.", order: 4 }
  ],
  "sundertide-of-varynth": [
    { id: "cael-ascendia", title: "Cael-Ascendia", description: "Upper continent provinces, including Caelune and Arcadia.", order: 1 },
    { id: "skybound-reach", title: "Skybound Reach", description: "Elysium and the drifting islands above the broken world.", order: 2 },
    { id: "tetherfall", title: "Tetherfall", description: "Spirelands, unstable ley storms, and the old bridge between realms.", order: 3 },
    { id: "chasmyr-expanse", title: "Chasmyr Expanse", description: "Dawnsworn, Crimson Vale, Orrenfall, Wyrm's Hollow, and the world below.", order: 4 }
  ]
};

const DEFAULT_POSTS = {
  "echoes-after-the-forge": {
    coruscant: [
      {
        id: "coruscant-heart",
        uid: "seed",
        authorName: "Banri",
        ownerDisplayName: "Banri",
        postType: "location-description",
        title: "Coruscant // Heart of the Republic",
        body: "> The city-world never sleeps; its lights outshine the stars it governs.\n\nWelcome to Coruscant, the core of galactic politics.\n\nAll story posts that take place on Coruscant occur here. Characters on Coruscant may freely interact in-character. Travel between districts should be written out immersively. Arriving from another world should begin with a post at a spaceport or orbital platform. Departing should include a departure sequence before moving to the destination thread.",
        attachments: [],
        createdAt: Date.parse("2025-10-23T16:41:00-05:00")
      }
    ],
    "korriban-training-grounds": [
      {
        id: "butcher-of-korriban",
        uid: "seed",
        authorName: "Rikstarf",
        ownerDisplayName: "Rikstarf",
        characterId: "rykard-vael",
        characterDisplayName: "Rykard Vael",
        postType: "player",
        title: "The Butcher of Korriban",
        body: "Rykard Vael lingered among the old training grounds with a crude red blade, a scar across his cheek, and a bounty spreading through the caves behind him. The western ruins remembered every lesson taught in blood.",
        attachments: [],
        createdAt: Date.parse("2025-10-24T19:02:00-05:00")
      }
    ]
  },
  "sundertide-of-varynth": {
    caelune: [
      {
        id: "sundertide-prologue",
        uid: "seed",
        authorName: "Banri",
        ownerDisplayName: "Banri",
        postType: "narrator",
        title: "Prologue // The Sundertide of Varynth",
        body: "When the world broke, it did not fall apart. It drifted away from itself.\n\nEight centuries later, the Spire of Velara had begun to tremble again. Guild banners filled Caelune's skyline while scholars argued over the hum in their crystals, and far below, the Chasmyr Expanse answered with a rhythm like a buried heart.",
        attachments: [],
        createdAt: Date.parse("2025-10-26T02:27:00-05:00")
      }
    ]
  }
};

const DEFAULT_CHARACTERS = [
  {
    id: "darth-rhun-vaal",
    uid: "seed",
    ownerDisplayName: "Banri",
    worldId: "echoes-after-the-forge",
    name: "Darth Rhun Vaal",
    species: "Human / Ossus",
    age: "Approx. 1,145 years",
    role: "Mythic Sith entity",
    alignment: "Dark",
    affiliation: "Sith archive fragment / Reawakened",
    location: "Korriban Wastes",
    status: "Reawakened",
    image: "",
    origin: `Compiled by the Imperial Reclamation Service, Division of Obscure Antiquities. Era of activity: approx. 5100 BBY to 3955 BBY. Classification: High Threat / Mythic Entity. Recovered fragments: Korriban Wastes, Tomb of the Hollow Flame.

Jedi Name: Saelric Marr. Born on Ossus around 5100 BBY, trained at the Jedha Enclave under Jedi Master Eldric Taal. Saelric began as a gifted and contemplative Padawan drawn not to glory or battle, but to history, myth, and unanswered echoes in the Force. His mind was a vault of forbidden knowledge. He recorded, preserved, and quietly questioned.

Despite his scholarly temperament, Saelric was not untouched by conflict. Under Master Taal, he saw battle during skirmishes against Sith forces in the height of Marka Ragnos's reign. When Master Taal fell in an overwhelming duel, Saelric survived only by fleeing. He returned to the Order physically, but not spiritually, haunted by the truth that knowledge alone could not save those he cared for.

His obsession with lost Force knowledge led him to a derelict ruin on Ziost. Amid fractured glyphs and half-collapsed temples, he uncovered a blackened Sith Holocron attributed to Sorzus Syn, one of the original Dark Jedi exiles and a founder of the Sith tradition. Marka Ragnos found him there, not as prey, but as potential. Thus Darth Rhun Vaal was born.

Unlike most Sith, Rhun Vaal did not seek armies or fleets. He sought understanding. Through Sorzus Syn's alchemy and Ragnos's teachings on aura projection, he created the Dread Aura, a weapon that did not attack but sank into the minds of its victims. Some screamed. Some fled. Some forgot who they were.

Under Marka Ragnos, Vaal became the shadow behind the throne: the Ebon Voice, the whisper that made armies tremble before they saw the banner. Ragnos pursued dominion of the flesh. Vaal pursued dominion of the soul.

Long before stasis, Vaal found Karniss, a massive Dashade entombed in ancient blackstone on Urkupp. Karniss was a void to the Force and resistant to conventional techniques. Vaal broke the creature's will not by domination, but by flooding its mind with dread it could not understand. Karniss knelt as guardian and bound soul.

Sensing the Sith Empire would collapse into hunger for power, Rhun Vaal carved a chamber of living stone beneath the tomb of Marka Ragnos. He and Karniss entered voluntary stasis: not death, not sleep, preservation.

In 3955 BBY, scavengers disturbed the tomb without fear. Fear had been the lock. The aura shattered. Karniss woke first. Then Darth Rhun Vaal opened his eyes.`,
    equipment: "Single-bladed burnt-orange lightsaber forged from Ossan alloys and later reworked through Sith alchemy. Minimal components, elegant construction, precise intent. Ancient Sith artifacts, recovered Holocron fragments, living-stone chamber rites, and blood-bound preservation glyphs.",
    skills: "Dread Aura: projects pure despair into nearby minds, breaking will and coordination, shattering weak minds, and weakening seasoned ones. Dashade Binding: commands Karniss, a Force-resistant assassin bound by ritual. Alchemical Mastery: crafts rituals, mutates life, manipulates memory, and infuses dread into matter. Force Preservation: long-term stasis, consciousness suspension, and protective dark glyphs. Memory Scarring: places he walks remember him in the Force. Archival Knowledge: tactical, philosophical, and cultural knowledge from both Jedi and Sith histories.",
    personality: "Silent, calculating, scholarly, and terrifyingly patient. Rhun Vaal treats fear as both language and material. He does not crave chaos for its own sake; he wants the galaxy to remember discipline, consequence, and dread.",
    hooks: "Recovered fragments place him near Korriban. Jedi records list him missing or presumed dead, Sith tomb records mark him archived, and newer transmissions imply he has reawakened. Karniss may move ahead of him as guardian, assassin, or warning.",
    order: 1
  },
  {
    id: "aelira-kaen",
    uid: "seed",
    ownerDisplayName: "Bhumika",
    worldId: "echoes-after-the-forge",
    name: "Aelira Kaen",
    species: "Echani-Human Hybrid / Lorrd",
    age: "Twenty-six",
    role: "Gray-aligned Force user",
    alignment: "Grey / Light",
    affiliation: "Independent Gray Operative No. V-145",
    location: "Outer Rim",
    status: "Active",
    image: "",
    origin: `Compiled by the Republic Reconstruction Bureau, Division of Force Anomalies. Era of activity: approx. 3975 BBY to 3950 BBY. Classification: Gray-Aligned Force User / Potential High-Value Asset. Recovered fragments: Outer Rim data caches, Malachor V debris, and eyewitness accounts from Taris and Dromund Kaas sectors.

Appearance: 1.73m, athletic and wiry, graceful even when still. Pale-silver undertone from Echani heritage. Storm-gray eyes that shift toward silver when channeling the Force. Ash-blonde hair, braided during combat. Thin scar along the left cheek from Sith captivity. Lightweight durafiber combat robes reinforced with Echani weave, hooded cloak trimmed with dark violet lining.

Aelira Kaen was born on a Republic supply post during the height of the Mandalorian Wars. Her parents, Jedi Knights Naelen Kaen and Lira Kaen, broke the Code's distance rule for love, believing compassion itself to be the truest expression of the Force. Her childhood passed amid hangar bays and refugee camps, learning saber drills between aid shipments.

When Malak's Sith raids swept across the sector, her mother fell defending civilians. Aelira, then fifteen, was seized by a Sith Inquisitor conducting experiments on Force sensitivity and pain thresholds. For nearly four years, she endured captivity meant to twist empathy into hatred.

Her father, believed dead, tracked the cell in secret. Grief became fury, and fury became obsession. By the time he reached her, Naelen had surrendered to vengeance. He annihilated the Sith outpost and everyone within except Aelira. He saved her body, but scarred her faith.

Hidden on frontier worlds, Naelen trained her in both Jedi and Sith disciplines. She learned Ataru's fluid grace and Djem So's decisive strength, channeling anger without letting it own her. When Naelen demanded she embrace darkness fully, she refused. Their duel leveled the camp they called home. She won, but did not kill him. That mercy marked her first step toward the Gray Path.

During the Republic's reconstruction, Aelira aided relief convoys near Dantooine. Bastila Shan recognized both her potential and volatility, teaching breathing disciplines of Battle Meditation without manipulation: focus without control. Later, while tracing lost holocrons through the Mid Rim, Aelira crossed paths with Revan, who urged her to accept emotion as a compass, not a chain.

Years later, on a forgotten fueling moon, she was challenged by Roth Kendar, a gray-armored Mandalorian and clanless exile seeking proof of worth. Their duel was fierce and clean. When she disarmed him, she refused the killing blow. Roth invoked the Kote'sh Vow, binding his honor to her life until released. Since then, the Honor-Bound Mandalorian has served beside her as partner, equal, and anchor.

Aelira refined a philosophy she calls Resonant Flow: channeling emotion into harmony rather than suppression. She moves between warzones and ruins, restoring lost archives, rescuing Force-sensitive refugees, and dismantling Sith cult remnants.`,
    equipment: "Lightsaber Echoheart, a dual-kyber magenta blade forged from her parents' crystals. Harmonized frequencies create a low thrumming resonance even when deactivated. Echani bracers, compact non-lethal stun blaster, standard utility belt, lightweight durafiber combat robes reinforced with Echani weave, and hooded cloak.",
    skills: "Force Valor and Tutaminis: converts emotion into heightened physicality and defense. Resonant Flow: instinctive amplification of surrounding life energy grounded in Living Force awareness. Empathy Sense: reads emotional echoes to anticipate intention. Hybrid Saber Form: Ataru agility merged with Djem So power. Echani Combat Arts: predicts strikes through micro-motion. Limited telekinesis and moment-to-moment precognition rather than prophecy.",
    personality: "Quick-witted and sharp-tongued, Aelira treats danger as conversation. Defiant humor masks a fiercely protective heart. She rejects both Jedi suppression and Sith indulgence, insisting the Force breathes through honest emotion. She values loyalty born of choice over oath.",
    hooks: "To Jedi she is heretic; to Sith, traitor; to the frightened, hope wrapped in flame. Reported to have shattered a Sith cult's dread-idol on Dromund Kaas with a Force-amplified shout. Rumored contact for Republic Intelligence when a mission needs a Jedi who does not listen to Councils. Some claim she carries a holocron voice that answers in her father's tone. Mandalorian circles whisper of Roth Kendar, the lone vod who calls her Alor be Verd Kote.",
    order: 2
  },
  {
    id: "rykard-vael",
    uid: "seed",
    ownerDisplayName: "Rikstarf",
    worldId: "echoes-after-the-forge",
    name: "Rykard Vael",
    species: "Human / Korriban",
    age: "23 years",
    role: "Force user",
    alignment: "Grey / Dark",
    affiliation: "Sith Remnant",
    location: "Korriban old training grounds",
    status: "Active",
    image: "",
    origin: `Known as the Butcher of Korriban, Rykard Vael was a trainee from a Sith remnant inhabiting caves and old ruins on Korriban's western hemisphere. Chosen for his high affinity for the Force, he stood above other students not only through power, but through a dangerous lack of fear.

Jealous rivals ambushed him and left a scar across his right cheek. The attackers were not merely defeated. They were brutalized. Rykard was found unconscious among what remained of them, holding only a crude dagger.

The event granted him fame and infamy. Lord Khareas took interest in him and trained him further in battle, strategy, and subversion. When a power struggle among Sith lords killed Khareas, Rykard fled with a price on his head and began searching for a way off Korriban.`,
    equipment: "Single-bladed crude red lightsaber recovered from a weapons cache in a fallen ship.",
    skills: "High combat prowess and broad Force utilization. Capable of using Force lightning, though not yet proficient.",
    personality: "Merciless, strategic, difficult to intimidate, and deeply shaped by survival inside Sith ruin culture.",
    hooks: "Wanted by Sith remnants after Lord Khareas' death. Currently hiding near the old Korriban training grounds.",
    order: 3
  },
  {
    id: "daro-vex",
    uid: "seed",
    ownerDisplayName: "Banri",
    worldId: "echoes-after-the-forge",
    name: "Daro Vex",
    species: "Human / Corellia",
    age: "Thirty-two",
    role: "Non-Force user / Smuggler / Freelance pilot",
    alignment: "Grey / Self-interested neutral",
    affiliation: "Independent / Unofficial Republic contractor on occasion",
    location: "Orbiting Taris aboard The Wayfarer's Debt",
    status: "Example sheet / Active template",
    image: "",
    origin: `Born in the shipyards of Coronet City, Daro Vex learned to fly before he learned to walk. When the Jedi Civil War erupted, he sold supplies to both sides: first hauling kolto for the Republic, then running forged transponder codes for Sith admirals who paid better.

After the Star Forge's destruction, Daro found himself stranded in a galaxy with no clear borders, where every hyperspace lane is a gamble and every job is a moral choice. He claims he is done choosing sides, yet his hold always seems full of Republic-grade munitions bound for the wrong buyers.`,
    equipment: "BlasTech DL-22 blaster pistol, compact vibroknife, smuggler's flight jacket with under-mesh armor, portable decryptor, slicer's datapad, and light freighter The Wayfarer's Debt.",
    skills: "Expert pilot, skilled slicer, contraband negotiator, fluent in Basic, Huttese, and rudimentary Mando'a. Quick-draw duelist who favors avoidance over heroics.",
    personality: "Cynical humor hides a cautious conscience. Loyal only until payment clears, though his record shows he has risked his ship for passengers who could not pay.",
    hooks: "Owes debts to at least three Hutt cartels. Rumored to have smuggled Jedi survivors out of Sith space. Claims to have seen a red-robed figure near Rakata Prime.",
    order: 4
  }
];

const state = {
  user: null,
  isAdmin: false,
  view: "dashboard",
  selectedWorldId: "echoes-after-the-forge",
  selectedThreadId: "coruscant",
  selectedCharacterId: "",
  dossierTab: "profile",
  selectedLoreWorldId: "",
  storyWorldId: "echoes-after-the-forge",
  storyMode: "full",
  storyPage: 1,
  editingPost: null,
  editingThread: null,
  editingAttachments: [],
  loreEditing: false,
  characterEditing: false,
  characterSearch: "",
  echoSearch: "",
  threadSearch: "",
  worldListMode: "selected",
  routeApplied: false,
  pendingPostAnchor: "",
  remoteWorlds: [],
  remoteCategories: {},
  remoteThreads: {},
  remotePosts: {},
  remoteCharacters: [],
  remoteCodex: [],
  remoteEchoes: [],
  aiSummaries: {},
  chroniclesAiConfig: structuredClone(defaultChroniclesAiConfig),
  aiAssistResult: "",
  editingCodex: null,
  editingEcho: null,
  deletedThreads: {},
  deletedPosts: {},
  unsubscribers: [],
  postIdsKnown: new Set(),
  audioResolveCache: new Map(),
  audioResolvePending: new Map(),
  dossierAudioPlayer: null,
  dossierAudioTrack: null,
  postNotificationsReady: false,
  notificationsEnabled: localStorage.getItem("banriChroniclesNotifications") === "true"
};

const elements = {
  locked: document.getElementById("chroniclesLocked"),
  app: document.getElementById("chroniclesApp"),
  profileName: document.getElementById("chroniclesProfileName"),
  profileRole: document.getElementById("chroniclesProfileRole"),
  stats: document.getElementById("chroniclesStats"),
  worldPreview: document.getElementById("chroniclesWorldPreview"),
  worldGrid: document.getElementById("chroniclesWorldGrid"),
  threadTitle: document.getElementById("chroniclesThreadTitle"),
  threadSearch: document.getElementById("chroniclesThreadSearch"),
  threadList: document.getElementById("chroniclesThreadList"),
  threadViewTitle: document.getElementById("chroniclesThreadViewTitle"),
  threadViewMeta: document.getElementById("chroniclesThreadViewMeta"),
  threadViewDescription: document.getElementById("chroniclesThreadViewDescription"),
  threadViewPosts: document.getElementById("chroniclesThreadViewPosts"),
  recentPosts: document.getElementById("chroniclesRecentPosts"),
  characterSearch: document.getElementById("chroniclesCharacterSearch"),
  characterGrid: document.getElementById("chroniclesCharacterGrid"),
  echoSearch: document.getElementById("chroniclesEchoSearch"),
  echoGrid: document.getElementById("chroniclesEchoGrid"),
  dossierShell: document.getElementById("chroniclesDossierShell"),
  storyWorld: document.getElementById("chroniclesStoryWorld"),
  storyStatus: document.getElementById("chroniclesStoryStatus"),
  storyContent: document.getElementById("chroniclesStoryContent"),
  howItWorks: document.getElementById("chroniclesHowItWorks"),
  resourceModals: document.getElementById("chroniclesResourceModals"),
  notifyButton: document.getElementById("chroniclesNotifyButton"),
  worldForm: document.getElementById("chroniclesWorldForm"),
  categoryForm: document.getElementById("chroniclesCategoryForm"),
  categoryStatus: document.getElementById("chroniclesCategoryStatus"),
  threadForm: document.getElementById("chroniclesThreadForm"),
  postForm: document.getElementById("chroniclesPostForm"),
  characterForm: document.getElementById("chroniclesCharacterForm"),
  codexForm: document.getElementById("chroniclesCodexForm"),
  echoForm: document.getElementById("chroniclesEchoForm"),
  postStatus: document.getElementById("chroniclesPostStatus"),
  characterStatus: document.getElementById("chroniclesCharacterStatus"),
  codexStatus: document.getElementById("chroniclesCodexStatus"),
  echoStatus: document.getElementById("chroniclesEchoStatus"),
  postPreview: document.getElementById("chroniclesPostPreview"),
  postAttachments: document.getElementById("chroniclesPostAttachments"),
  aiAssistModal: document.getElementById("chroniclesAiAssistModal"),
  aiAssistMode: document.getElementById("chroniclesAiMode"),
  aiAssistPreview: document.getElementById("chroniclesAiAssistPreview"),
  aiAssistStatus: document.getElementById("chroniclesAiAssistStatus"),
  aiAssistGenerate: document.getElementById("chroniclesAiGenerateButton"),
  aiAssistInsert: document.getElementById("chroniclesAiInsertButton"),
  aiAssistReplace: document.getElementById("chroniclesAiReplaceButton"),
  loreRead: document.getElementById("chroniclesLoreRead"),
  loreForm: document.getElementById("chroniclesLoreEditForm"),
  loreToggle: document.getElementById("chroniclesLoreEditToggle"),
  loreSave: document.getElementById("chroniclesLoreSaveButton"),
  loreStatus: document.getElementById("chroniclesLoreStatus"),
  characterRead: document.getElementById("chroniclesCharacterRead"),
  characterEditForm: document.getElementById("chroniclesCharacterEditForm"),
  characterEditToggle: document.getElementById("chroniclesCharacterEditToggle"),
  characterSave: document.getElementById("chroniclesCharacterSaveButton"),
  characterDetailStatus: document.getElementById("chroniclesCharacterDetailStatus")
};

function toArray(value) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value)
    .map(([id, item]) => ({ id, ...item }))
    .sort((a, b) => Number(a.order ?? a.createdAt ?? 0) - Number(b.order ?? b.createdAt ?? 0));
}

function mergeById(fallback, remote) {
  const merged = new Map();
  fallback.forEach((item) => merged.set(item.id, item));
  remote.forEach((item) => merged.set(item.id, { ...merged.get(item.id), ...item }));
  return [...merged.values()];
}

function getWorlds() {
  return mergeById(DEFAULT_WORLDS, state.remoteWorlds)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999) || a.title.localeCompare(b.title));
}

function getWorld(worldId) {
  return getWorlds().find((world) => world.id === worldId) || getWorlds()[0] || null;
}

function getThreadsForWorld(worldId) {
  const deleted = state.deletedThreads[worldId] || {};
  return mergeById(DEFAULT_THREADS[worldId] || [], toArray(state.remoteThreads[worldId]))
    .filter((thread) => deleted[thread.id] !== true)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999) || a.title.localeCompare(b.title));
}

function getThread(worldId, threadId) {
  return getThreadsForWorld(worldId).find((thread) => thread.id === threadId) || getThreadsForWorld(worldId)[0] || null;
}

function getCategoriesForWorld(worldId) {
  const threadCategoryFallbacks = getThreadsForWorld(worldId)
    .filter((thread) => thread.categoryId || thread.category)
    .map((thread, index) => ({
      id: slugify(thread.categoryId || thread.category),
      title: thread.category || toTitle(thread.categoryId || "Unsorted"),
      description: "",
      order: 50 + index
    }));

  return mergeById([...(DEFAULT_CATEGORIES[worldId] || []), ...threadCategoryFallbacks], toArray(state.remoteCategories[worldId]))
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999) || a.title.localeCompare(b.title));
}

function getCategory(worldId, categoryId) {
  return getCategoriesForWorld(worldId).find((category) => category.id === categoryId) || null;
}

function getCharacters() {
  return mergeById(DEFAULT_CHARACTERS, state.remoteCharacters)
    .sort((a, b) => Number(a.order || 999) - Number(b.order || 999) || a.name.localeCompare(b.name));
}

function getCharacter(characterId) {
  return getCharacters().find((character) => character.id === characterId) || null;
}

function getCodexEntries(characterId = "") {
  return toArray(state.remoteCodex)
    .filter((entry) => !characterId || entry.characterId === characterId)
    .filter(isRecordVisible)
    .sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt));
}

function getCodexEntry(entryId) {
  return getCodexEntries().find((entry) => entry.id === entryId) || null;
}

function getEchoes(characterId = "") {
  return toArray(state.remoteEchoes)
    .filter((entry) => !characterId || entry.characterId === characterId)
    .filter(isRecordVisible)
    .sort((a, b) => toTime(b.updatedAt || b.createdAt) - toTime(a.updatedAt || a.createdAt));
}

function getEcho(echoId) {
  return getEchoes().find((entry) => entry.id === echoId) || null;
}

function getPostsForThread(worldId, threadId, sortDirection = "asc") {
  const fallbackPosts = DEFAULT_POSTS[worldId]?.[threadId] || [];
  const remotePosts = toArray(state.remotePosts[worldId]?.[threadId]);
  const deleted = state.deletedPosts[worldId]?.[threadId] || {};
  const posts = mergeById(fallbackPosts, remotePosts)
    .filter((post) => deleted[post.id] !== true)
    .filter((post) => post?.deleted !== true && post?.isDeleted !== true)
    .map((post) => ({
      ...post,
      worldId,
      worldTitle: getWorld(worldId)?.title || "World",
      threadId,
      threadTitle: getThread(worldId, threadId)?.title || "Thread",
      attachments: normalizeAttachments(post.attachments)
    }));

  return posts.sort((a, b) => sortDirection === "desc" ? toTime(b.createdAt) - toTime(a.createdAt) : toTime(a.createdAt) - toTime(b.createdAt));
}

function hasDefaultPost(worldId, threadId, postId) {
  return Boolean(DEFAULT_POSTS[worldId]?.[threadId]?.some((post) => post.id === postId));
}

function getPosts() {
  const posts = [];
  getWorlds().forEach((world) => {
    getThreadsForWorld(world.id).forEach((thread) => {
      posts.push(...getPostsForThread(world.id, thread.id, "desc"));
    });
  });
  return posts.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
}

function getPostsForWorld(worldId, sortDirection = "asc") {
  const posts = [];
  getThreadsForWorld(worldId).forEach((thread) => {
    posts.push(...getPostsForThread(worldId, thread.id, sortDirection));
  });
  return posts.sort((a, b) => sortDirection === "desc" ? toTime(b.createdAt) - toTime(a.createdAt) : toTime(a.createdAt) - toTime(b.createdAt));
}

function normalizeLookup(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function characterAliases(character) {
  return [
    character?.name,
    character?.alias,
    character?.title,
    character?.characterDisplayName
  ].map(normalizeLookup).filter(Boolean);
}

function postMatchesCharacter(post, character) {
  if (!post || !character) return false;
  if (post.characterId && post.characterId === character.id) return true;
  if ((post.postType || "player") !== "player") return false;

  const aliases = characterAliases(character);
  if (!aliases.length) return false;
  const postNames = [
    post.characterDisplayName,
    post.authorName
  ].map(normalizeLookup).filter(Boolean);
  return postNames.some((name) => aliases.includes(name));
}

function getCharacterPosts(character, sortDirection = "desc") {
  if (!character) return [];
  return getPostsForWorld(character.worldId, sortDirection)
    .filter(isNarrativePost)
    .filter((post) => postMatchesCharacter(post, character));
}

function getLatestCharacterPost(character) {
  return getCharacterPosts(character, "desc")[0] || null;
}

function resolveCharacterThread(character) {
  if (!character) return null;
  const stateData = character.currentState || {};
  const latest = getLatestCharacterPost(character);
  if (latest) return getThread(latest.worldId, latest.threadId);

  const threadId = stateData.locationThreadId || character.locationThreadId || "";
  if (threadId) {
    const thread = getThread(character.worldId, threadId);
    if (thread?.id === threadId) return thread;
  }

  const location = normalizeLookup(stateData.location || character.location);
  if (location) {
    const match = getThreadsForWorld(character.worldId)
      .find((thread) => normalizeLookup(thread.title) === location || normalizeLookup(thread.id) === location);
    if (match) return match;
  }

  return getThread(character.worldId, state.selectedThreadId);
}

function getCharacterCurrentState(character) {
  const stateData = character?.currentState || {};
  const latest = getLatestCharacterPost(character);
  const thread = resolveCharacterThread(character);
  return {
    location: latest?.threadTitle || thread?.title || stateData.location || character?.location || "Location not set",
    arcTitle: stateData.arcTitle || character?.arcTitle || "No active arc set",
    objective: stateData.objective || character?.objective || "Objective not recorded",
    condition: stateData.condition || character?.status || "Active",
    affiliation: stateData.affiliation || character?.affiliation || "",
    latest,
    thread
  };
}

function getNarrativePostsForWorld(worldId, sortDirection = "asc") {
  return getPostsForWorld(worldId, sortDirection).filter(isNarrativePost);
}

function isNarrativePost(post) {
  return (post.postType || "player") !== "location-description" && post.excludeFromStory !== true;
}

function postTypeLabel(post) {
  const labels = {
    narrator: "Narrator Event",
    "location-description": "Location Description",
    player: "Player Post"
  };
  return labels[post?.postType || "player"] || "Player Post";
}

function renderCharacterEffectsBadge(post) {
  if ((post?.postType || "player") !== "player") return "";
  const allowed = post.allowCharacterEffects === true;
  const label = allowed
    ? "Character effects allowed: this writer allows other writers to make character-altering calls for their character in this scene."
    : "Character effects locked: ask this writer before making lasting or character-altering effects to their character.";
  return `
    <span class="chronicles-consent-badge ${allowed ? "allowed" : "locked"}" title="${escapeAttr(label)}" aria-label="${escapeAttr(label)}" data-consent-tooltip="${escapeAttr(label)}" tabindex="0">
      <span aria-hidden="true">${allowed ? "&#10003;" : "&times;"}</span>
      <small>${allowed ? "Effects allowed" : "Effects locked"}</small>
    </span>
  `;
}

function ensureSelectedWorldAndThread() {
  const world = getWorld(state.selectedWorldId);
  if (!world) return;
  state.selectedWorldId = world.id;

  const thread = getThread(world.id, state.selectedThreadId);
  state.selectedThreadId = thread?.id || "";
  state.storyWorldId = getWorld(state.storyWorldId)?.id || world.id;
}

function renderAll() {
  if (!elements.app || !state.user) return;
  applyRouteFromUrl();
  if (state.view !== "dossier") stopDossierAudio();
  ensureSelectedWorldAndThread();
  renderAdminVisibility();
  renderProfile();
  renderStats();
  renderResourceGuides();
  renderWorldCards(elements.worldGrid, getWorlds());
  renderThreads();
  renderThreadView();
  renderRecentPosts();
  renderCharacters();
  renderEchoes();
  renderCharacterDossier();
  renderStorySoFar();
  renderNotificationButton();
  populateSelects();
  showView(state.view);
  scrollToPendingPost();
}

function renderProfile() {
  const name = getDisplayName();
  if (elements.profileName) elements.profileName.textContent = name;
  if (elements.profileRole) elements.profileRole.textContent = state.isAdmin ? "Chronicle custodian / editor mode" : "Chronicle participant";
}

function renderStats() {
  if (!elements.stats) return;
  const worlds = getWorlds();
  const threadCount = worlds.reduce((total, world) => total + getThreadsForWorld(world.id).length, 0);
  const posts = getPosts();
  const characters = getCharacters();

  elements.stats.innerHTML = [
    ["Worlds", worlds.length],
    ["Characters", characters.length],
    ["Threads", threadCount],
    ["Posts", posts.length]
  ].map(([label, count]) => `
    <article>
      <strong>${escapeHtml(count)}</strong>
      <span>${escapeHtml(label)}</span>
    </article>
  `).join("");
}

function renderResourceGuides() {
  if (!elements.howItWorks) return;
  elements.howItWorks.innerHTML = RESOURCE_GUIDES.map((item, index) => `
    <article class="chronicles-primer-card chronicles-guide-card">
      <span>${String(index + 1).padStart(2, "0")}</span>
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
      <button type="button" data-bs-toggle="modal" data-bs-target="#chroniclesGuideModal-${escapeAttr(item.id)}">Open Guide</button>
    </article>
  `).join("");

  if (!elements.resourceModals || elements.resourceModals.dataset.rendered === "true") return;
  elements.resourceModals.innerHTML = RESOURCE_GUIDES.map((item) => `
    <div class="modal fade chronicles-modal chronicles-guide-modal" id="chroniclesGuideModal-${escapeAttr(item.id)}" tabindex="-1" aria-labelledby="chroniclesGuideTitle-${escapeAttr(item.id)}" aria-hidden="true">
      <div class="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
        <div class="modal-content">
          <div class="modal-header">
            <div>
              <p class="banri-modal-kicker mb-1">Chronicles Manual</p>
              <h2 class="modal-title" id="chroniclesGuideTitle-${escapeAttr(item.id)}">${escapeHtml(item.title)}</h2>
            </div>
            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
          </div>
          <div class="modal-body">
            <div class="chronicles-guide-body chronicles-markdown">
              ${renderMarkdown(item.body)}
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-banri-primary" type="button" data-bs-dismiss="modal">Close Guide</button>
          </div>
        </div>
      </div>
    </div>
  `).join("");
  elements.resourceModals.dataset.rendered = "true";
}

function renderWorldCards(target, worlds) {
  if (!target) return;
  target.innerHTML = worlds.length ? worlds.map((world) => {
    const threads = getThreadsForWorld(world.id);
    const posts = getPosts().filter((post) => post.worldId === world.id);
    const activeClass = world.id === state.selectedWorldId ? " active" : "";
    return `
      <article class="chronicles-world-card${activeClass}" style="--chronicle-image: url('${escapeAttr(world.image || "/assets/img/hero/banri-hero-01.webp")}')">
        <span>${escapeHtml(world.genre || "World")}</span>
        <strong>${escapeHtml(world.title)}</strong>
        <p>${escapeHtml(world.description || "Lore pending.")}</p>
        <small>${escapeHtml(world.status || "Active")} / ${threads.length} threads / ${posts.length} posts</small>
        <div class="chronicles-world-actions">
          <button type="button" data-chronicles-open-world="${escapeAttr(world.id)}">Open World</button>
          <button type="button" data-chronicles-open-lore="${escapeAttr(world.id)}">Lore</button>
          <button type="button" data-chronicles-open-story="${escapeAttr(world.id)}">Story So Far</button>
        </div>
      </article>
    `;
  }).join("") : '<div class="relay-empty">No worlds registered yet.</div>';
}

function renderThreads() {
  if (state.worldListMode === "all") {
    renderAllWorldThreads();
    return;
  }

  const world = getWorld(state.selectedWorldId);
  if (elements.threadTitle) elements.threadTitle.textContent = world ? `${world.title} Threads` : "Location Threads";
  if (!elements.threadList) return;

  const allThreads = world ? getThreadsForWorld(world.id) : [];
  const search = state.threadSearch.trim().toLowerCase();
  const categories = world ? getCategoriesForWorld(world.id) : [];
  const unsortedCategory = { id: "uncategorized", title: "Unsorted Signal", description: "Threads without a province/category yet.", order: 999 };
  const knownCategoryIds = new Set(categories.map((category) => category.id));
  const threads = allThreads.filter((thread) => {
    if (!search) return true;
    const category = getCategory(world.id, thread.categoryId) || unsortedCategory;
    const haystack = [
      thread.title,
      thread.description,
      thread.category,
      category.title,
      category.description
    ].join(" ").toLowerCase();
    return haystack.includes(search);
  });
  const groups = [...categories, unsortedCategory]
    .map((category) => ({
      ...category,
      threads: threads.filter((thread) => {
        const categoryId = thread.categoryId || (thread.category ? slugify(thread.category) : "");
        return category.id === "uncategorized" ? !categoryId || !knownCategoryIds.has(categoryId) : categoryId === category.id;
      })
    }))
    .filter((category) => category.threads.length || (category.id !== "uncategorized" && !search));

  elements.threadList.innerHTML = groups.length ? groups.map((category) => `
    <section class="chronicles-category-group">
      <div class="chronicles-category-heading">
        <div>
          <p>// ${escapeHtml(category.title)}</p>
          ${category.description ? `<span>${escapeHtml(category.description)}</span>` : ""}
        </div>
        <small>${category.threads.length} location${category.threads.length === 1 ? "" : "s"}</small>
      </div>
      <div class="chronicles-category-threads">
        ${category.threads.length ? category.threads.map((thread) => renderThreadRow(world.id, thread)).join("") : '<div class="relay-empty">No locations in this category yet.</div>'}
      </div>
    </section>
  `).join("") : '<div class="relay-empty">No matching location threads.</div>';
}

function renderAllWorldThreads() {
  if (elements.threadTitle) elements.threadTitle.textContent = "All World Locations";
  if (!elements.threadList) return;

  const search = state.threadSearch.trim().toLowerCase();
  const worlds = getWorlds()
    .map((world) => {
      const threads = getThreadsForWorld(world.id).filter((thread) => {
        if (!search) return true;
        const category = getCategory(world.id, thread.categoryId);
        return [
          world.title,
          world.description,
          thread.title,
          thread.description,
          thread.category,
          category?.title,
          category?.description
        ].join(" ").toLowerCase().includes(search);
      });
      return { world, threads };
    })
    .filter(({ threads }) => threads.length || !search);

  elements.threadList.innerHTML = worlds.length ? worlds.map(({ world, threads }) => `
    <section class="chronicles-category-group chronicles-world-thread-group">
      <div class="chronicles-category-heading">
        <div>
          <p>// ${escapeHtml(world.title)}</p>
          <span>${escapeHtml(world.description || "Lore pending.")}</span>
        </div>
        <small>${threads.length} location${threads.length === 1 ? "" : "s"}</small>
      </div>
      <div class="chronicles-category-threads">
        ${threads.length ? threads.map((thread) => renderThreadRow(world.id, thread)).join("") : '<div class="relay-empty">No locations registered in this world yet.</div>'}
      </div>
    </section>
  `).join("") : '<div class="relay-empty">No world or location records match that search.</div>';
}

function renderThreadRow(worldId, thread) {
  const posts = getPostsForThread(worldId, thread.id, "desc");
  const latest = posts[0];
  return `
    <article class="chronicles-thread-row">
      <div>
        <strong>${escapeHtml(thread.title)}</strong>
        <p>${escapeHtml(thread.description || "Location notes pending.")}</p>
        <small>${posts.length} posts${latest ? ` / latest by ${escapeHtml(latest.authorName || "Unknown")}` : ""}</small>
      </div>
      <div class="chronicles-thread-actions">
        ${state.isAdmin ? `<button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-edit-thread="${escapeAttr(`${worldId}:${thread.id}`)}">Edit</button>` : ""}
        ${state.isAdmin ? `<button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-delete-thread="${escapeAttr(`${worldId}:${thread.id}`)}">Delete</button>` : ""}
        <button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-open-thread="${escapeAttr(`${worldId}:${thread.id}`)}">Open Thread</button>
        <button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-thread-post="${escapeAttr(`${worldId}:${thread.id}`)}">Post Here</button>
      </div>
    </article>
  `;
}

function renderThreadView() {
  const world = getWorld(state.selectedWorldId);
  const thread = world ? getThread(world.id, state.selectedThreadId) : null;
  if (!world || !thread) {
    if (elements.threadViewPosts) elements.threadViewPosts.innerHTML = '<div class="relay-empty">Select a world and location thread.</div>';
    return;
  }

  if (elements.threadViewTitle) elements.threadViewTitle.textContent = thread.title;
  const category = getCategory(world.id, thread.categoryId);
  if (elements.threadViewMeta) elements.threadViewMeta.textContent = `${world.title}${category ? ` / ${category.title}` : ""} / Forum Thread`;
  if (elements.threadViewDescription) elements.threadViewDescription.textContent = thread.description || "Location notes pending.";

  const posts = getPostsForThread(world.id, thread.id, "asc");
  if (!elements.threadViewPosts) return;

  elements.threadViewPosts.innerHTML = posts.length ? posts.map((post) => `
    <article id="chronicle-post-${escapeAttr(post.id)}" class="chronicles-forum-post" data-chronicles-post-id="${escapeAttr(post.id)}">
      <aside class="chronicles-forum-author">
        <strong>${escapeHtml(post.authorName || "Unknown")}</strong>
        <span>${escapeHtml(post.ownerDisplayName || post.authorName || "Chronicle")}</span>
        <small>${escapeHtml(postTypeLabel(post))}${isNarrativePost(post) ? "" : " / Hidden from Story So Far"}</small>
      </aside>
      <div class="chronicles-forum-body">
        <header>
          <div>
            <h3>${escapeHtml(post.title || thread.title)}</h3>
            <time datetime="${escapeAttr(toDateTime(post.createdAt))}">${escapeHtml(formatDate(post.createdAt))}${post.updatedAt ? " / edited" : ""}</time>
          </div>
        </header>
        ${renderCharacterEffectsBadge(post)}
        <div class="chronicles-markdown">${renderMarkdown(post.body)}</div>
        ${renderAttachments(post.attachments)}
        <div class="chronicles-forum-actions">
          <button type="button" data-chronicles-reply-post="${escapeAttr(post.id)}">Reply</button>
          <button type="button" data-chronicles-follow-post="${escapeAttr(post.id)}">Follow Up</button>
          ${canEditPost(post) ? `<button type="button" data-chronicles-edit-post="${escapeAttr(post.id)}">Edit</button>` : ""}
          ${canEditPost(post) ? `<button type="button" data-chronicles-delete-post="${escapeAttr(post.id)}">Delete</button>` : ""}
        </div>
      </div>
    </article>
  `).join("") : '<div class="relay-empty">No posts in this thread yet.</div>';
}

function renderRecentPosts() {
  if (!elements.recentPosts) return;
  const posts = getPosts().slice(0, CHRONICLES_STORY_PAGE_SIZE);
  elements.recentPosts.innerHTML = posts.length ? posts.map((post) => `
    <article class="chronicles-post">
      <header>
        <div>
          <strong>${escapeHtml(post.authorName || "Unknown")}</strong>
          <span>${escapeHtml(post.worldTitle)} / ${escapeHtml(post.threadTitle)}</span>
        </div>
        <time datetime="${escapeAttr(toDateTime(post.createdAt))}">${escapeHtml(formatDate(post.createdAt))}</time>
      </header>
      ${post.title ? `<h3>${escapeHtml(post.title)}</h3>` : ""}
      <div class="chronicles-post-body">${renderParagraphs(post.body)}</div>
      <div class="chronicles-forum-actions">
        <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(post.worldId)}:${escapeAttr(post.threadId)}:${escapeAttr(post.id)}">Open Thread</button>
        <button type="button" data-chronicles-follow-post="${escapeAttr(post.id)}">Follow Up</button>
      </div>
    </article>
  `).join("") : '<div class="relay-empty">No chronicle posts yet.</div>';
}

function renderStorySoFar() {
  if (!elements.storyContent) return;
  const world = getWorld(state.storyWorldId) || getWorlds()[0];
  if (!world) {
    elements.storyContent.innerHTML = '<div class="relay-empty">No worlds registered yet.</div>';
    return;
  }

  state.storyWorldId = world.id;
  renderStoryWorldSelect(world.id);
  renderStoryModeButtons();

  const posts = getNarrativePostsForWorld(world.id, "asc");
  elements.storyContent.innerHTML = state.storyMode === "summary"
    ? renderStorySummary(world, posts)
    : renderFullStory(world, posts);
}

function renderStoryWorldSelect(selectedWorldId) {
  if (!elements.storyWorld) return;
  const current = elements.storyWorld.value || selectedWorldId;
  elements.storyWorld.innerHTML = getWorlds()
    .map((world) => `<option value="${escapeAttr(world.id)}">${escapeHtml(world.title)} / ${escapeHtml(world.status || "Active")}</option>`)
    .join("");
  elements.storyWorld.value = getWorld(current) ? current : selectedWorldId;
}

function renderStoryModeButtons() {
  document.querySelectorAll("[data-chronicles-story-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.chroniclesStoryMode === state.storyMode);
  });
}

function renderFullStory(world, posts) {
  const firstPost = posts[0];
  const latestPost = posts[posts.length - 1];
  const activeThreads = getActiveStoryThreads(world.id);
  const totalPages = Math.max(1, Math.ceil(posts.length / CHRONICLES_STORY_PAGE_SIZE));
  const currentPage = clampStoryPage(state.storyPage, totalPages);
  state.storyPage = currentPage;
  const startIndex = (currentPage - 1) * CHRONICLES_STORY_PAGE_SIZE;
  const pagePosts = posts.slice(startIndex, startIndex + CHRONICLES_STORY_PAGE_SIZE);
  const rangeStart = posts.length ? startIndex + 1 : 0;
  const rangeEnd = posts.length ? startIndex + pagePosts.length : 0;
  return `
    <div class="chronicles-story-header">
      <div>
        <p class="banri-modal-kicker mb-1">${escapeHtml(world.genre || "World")} / ${escapeHtml(world.status || "Active")}</p>
        <h3>${escapeHtml(world.title)} Chronicle</h3>
        <span>${posts.length} narrative post${posts.length === 1 ? "" : "s"} across ${activeThreads.length} active location${activeThreads.length === 1 ? "" : "s"} / showing ${rangeStart}-${rangeEnd} / location descriptions hidden</span>
      </div>
      <small>${firstPost ? escapeHtml(formatDate(firstPost.createdAt)) : "No entries"}${latestPost && latestPost !== firstPost ? ` - ${escapeHtml(formatDate(latestPost.createdAt))}` : ""}</small>
    </div>
    ${renderStoryPager(currentPage, totalPages, posts.length)}
    <div class="chronicles-story-timeline">
      ${pagePosts.length ? pagePosts.map((post, index) => renderStoryEntry(post, startIndex + index)).join("") : '<div class="relay-empty">No narrative posts have been transmitted in this world yet.</div>'}
    </div>
    ${renderStoryPager(currentPage, totalPages, posts.length)}
  `;
}

function clampStoryPage(page, totalPages) {
  return Math.min(Math.max(Number(page) || 1, 1), Math.max(Number(totalPages) || 1, 1));
}

function renderStoryPager(currentPage, totalPages, totalPosts) {
  if (totalPages <= 1) return "";
  const pageWindow = new Set([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const buttons = [...pageWindow]
    .filter((page) => page >= 1 && page <= totalPages)
    .sort((a, b) => a - b)
    .map((page, index, pages) => {
      const gap = index && page - pages[index - 1] > 1 ? '<span aria-hidden="true">...</span>' : "";
      return `${gap}<button class="${page === currentPage ? "active" : ""}" type="button" data-chronicles-story-page="${page}" ${page === currentPage ? 'aria-current="page"' : ""}>${page}</button>`;
    }).join("");

  return `
    <nav class="chronicles-story-pager" aria-label="Story So Far pagination">
      <button type="button" data-chronicles-story-page="${currentPage - 1}" ${currentPage <= 1 ? "disabled" : ""}>Previous</button>
      <div>${buttons}</div>
      <button type="button" data-chronicles-story-page="${currentPage + 1}" ${currentPage >= totalPages ? "disabled" : ""}>Next</button>
      <small>Page ${currentPage} of ${totalPages} / ${totalPosts} posts</small>
    </nav>
  `;
}

function renderStoryEntry(post, index) {
  return `
    <article class="chronicles-story-entry" id="chronicles-story-${escapeAttr(post.id)}">
      <aside>
        <strong>${String(index + 1).padStart(2, "0")}</strong>
        <span>${escapeHtml(post.threadTitle || "Thread")}</span>
      </aside>
      <div>
        <header>
          <div>
            <p>${escapeHtml(postTypeLabel(post))} / ${escapeHtml(post.authorName || "Unknown")} / ${escapeHtml(post.ownerDisplayName || post.authorName || "Chronicle")}</p>
            <h3>${escapeHtml(post.title || post.threadTitle || "Chronicle Entry")}</h3>
          </div>
          <time datetime="${escapeAttr(toDateTime(post.createdAt))}">${escapeHtml(formatDate(post.createdAt))}${post.updatedAt ? " / edited" : ""}</time>
        </header>
        ${renderCharacterEffectsBadge(post)}
        <div class="chronicles-markdown">${renderMarkdown(post.body)}</div>
        ${renderAttachments(post.attachments)}
        <div class="chronicles-forum-actions">
          <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(post.worldId)}:${escapeAttr(post.threadId)}:${escapeAttr(post.id)}">Open Original Thread</button>
          <button type="button" data-chronicles-follow-post="${escapeAttr(post.id)}">Follow Up</button>
        </div>
      </div>
    </article>
  `;
}

function renderStorySummary(world, posts) {
  const aiSummary = CHRONICLES_AI_FEATURE_ENABLED ? normalizeAiSummary(state.aiSummaries[world.id]) : null;
  if (aiSummary?.summary) {
    return renderAiStorySummary(world, posts, aiSummary);
  }

  const activeThreads = getActiveStoryThreads(world.id);
  const latestPosts = [...posts].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)).slice(0, 8);
  const authorCounts = countBy(posts, (post) => post.authorName || "Unknown");
  const topAuthors = [...authorCounts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const opening = posts[0];
  const latest = latestPosts[0];

  return `
    <div class="chronicles-story-header">
      <div>
        <p class="banri-modal-kicker mb-1">Summary Signal / ${escapeHtml(world.status || "Active")}</p>
        <h3>${escapeHtml(world.title)} At A Glance</h3>
        <span>${posts.length} narrative post${posts.length === 1 ? "" : "s"} indexed from ${activeThreads.length} active location${activeThreads.length === 1 ? "" : "s"}. Location descriptions are ignored.</span>
      </div>
      <small>Generated live from current Chronicle posts</small>
    </div>
    <div class="chronicles-story-summary-grid">
      <article>
        <strong>Current Continuity</strong>
        <p>${escapeHtml(buildContinuitySummary(world, posts, activeThreads))}</p>
      </article>
      <article>
        <strong>Opening Signal</strong>
        <p>${opening ? escapeHtml(`${opening.threadTitle}: ${summarizePost(opening, 260)}`) : "No opening entry yet."}</p>
      </article>
      <article>
        <strong>Latest Signal</strong>
        <p>${latest ? escapeHtml(`${latest.threadTitle}: ${summarizePost(latest, 260)}`) : "No latest entry yet."}</p>
      </article>
      <article>
        <strong>Active Voices</strong>
        <p>${topAuthors.length ? escapeHtml(topAuthors.map(([author, count]) => `${author} (${count})`).join(" / ")) : "No authors have posted yet."}</p>
      </article>
    </div>
    <div class="chronicles-story-summary-columns">
      <section>
        <h3>Latest Events</h3>
        ${latestPosts.length ? latestPosts.map((post) => `
          <article class="chronicles-story-digest-item">
            <span>${escapeHtml(formatDate(post.createdAt))} / ${escapeHtml(post.threadTitle)}</span>
            <strong>${escapeHtml(post.title || "Untitled Entry")}</strong>
            <p>${escapeHtml(summarizePost(post, 220))}</p>
            <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(post.worldId)}:${escapeAttr(post.threadId)}:${escapeAttr(post.id)}">Open Post</button>
          </article>
        `).join("") : '<div class="relay-empty">No recent events yet.</div>'}
      </section>
      <section>
        <h3>Location Activity</h3>
        ${activeThreads.length ? activeThreads.map(({ thread, posts: threadPosts }) => {
          const last = threadPosts[threadPosts.length - 1];
          return `
            <article class="chronicles-story-digest-item">
              <span>${threadPosts.length} post${threadPosts.length === 1 ? "" : "s"} / ${last ? escapeHtml(formatDate(last.createdAt)) : "No posts"}</span>
              <strong>${escapeHtml(thread.title)}</strong>
              <p>${escapeHtml(thread.description || "Location notes pending.")}</p>
              <button type="button" data-chronicles-open-thread="${escapeAttr(`${world.id}:${thread.id}`)}">Open Location</button>
            </article>
          `;
        }).join("") : '<div class="relay-empty">No active locations have posts yet.</div>'}
      </section>
    </div>
  `;
}

function normalizeAiSummary(summary = {}) {
  if (!summary || typeof summary !== "object") return null;
  const text = String(summary.summary || "").trim();
  if (!text) return null;

  return {
    worldId: String(summary.worldId || ""),
    summary: text,
    latestEvents: String(summary.latestEvents || "").trim(),
    characterPositions: String(summary.characterPositions || "").trim(),
    unresolvedHooks: String(summary.unresolvedHooks || "").trim(),
    postCount: Number(summary.postCount || 0),
    lastPostId: String(summary.lastPostId || ""),
    updatedAt: Number(summary.updatedAt || 0),
    updatedByName: String(summary.updatedByName || "Nexus AI").trim(),
    source: String(summary.source || "AI Summary").trim()
  };
}

function renderAiStorySummary(world, posts, summary) {
  const activeThreads = getActiveStoryThreads(world.id);
  const latestPosts = [...posts].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt)).slice(0, 6);
  const freshness = summary.lastPostId && latestPosts[0]?.id && summary.lastPostId !== latestPosts[0].id
    ? "New posts may be waiting for refresh."
    : "Current to latest indexed post.";

  return `
    <div class="chronicles-story-header">
      <div>
        <p class="banri-modal-kicker mb-1">AI Summary Signal / ${escapeHtml(world.status || "Active")}</p>
        <h3>${escapeHtml(world.title)} At A Glance</h3>
        <span>${posts.length} narrative post${posts.length === 1 ? "" : "s"} across ${activeThreads.length} active location${activeThreads.length === 1 ? "" : "s"}. ${escapeHtml(freshness)}</span>
      </div>
      <small>${summary.updatedAt ? `Updated ${escapeHtml(formatDate(summary.updatedAt))}` : "Awaiting refresh"} / ${escapeHtml(summary.updatedByName)}</small>
    </div>
    <div class="chronicles-ai-summary">
      <article class="chronicles-ai-summary-card primary">
        <span>Continuity</span>
        <p>${escapeHtml(summary.summary)}</p>
      </article>
      <article class="chronicles-ai-summary-card">
        <span>Latest Events</span>
        <p>${escapeHtml(summary.latestEvents || "No latest event digest returned yet.")}</p>
      </article>
      <article class="chronicles-ai-summary-card">
        <span>Character Positions</span>
        <p>${escapeHtml(summary.characterPositions || "No character position digest returned yet.")}</p>
      </article>
      <article class="chronicles-ai-summary-card">
        <span>Unresolved Hooks</span>
        <p>${escapeHtml(summary.unresolvedHooks || "No unresolved hooks returned yet.")}</p>
      </article>
    </div>
    <div class="chronicles-story-summary-columns mt-3">
      <section>
        <h3>Recent Source Posts</h3>
        ${latestPosts.length ? latestPosts.map((post) => `
          <article class="chronicles-story-digest-item">
            <span>${escapeHtml(formatDate(post.createdAt))} / ${escapeHtml(post.threadTitle)}</span>
            <strong>${escapeHtml(post.title || "Untitled Entry")}</strong>
            <p>${escapeHtml(summarizePost(post, 180))}</p>
            <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(post.worldId)}:${escapeAttr(post.threadId)}:${escapeAttr(post.id)}">Open Post</button>
          </article>
        `).join("") : '<div class="relay-empty">No source posts yet.</div>'}
      </section>
      <section>
        <h3>Signal Metadata</h3>
        <article class="chronicles-story-digest-item">
          <span>${escapeHtml(summary.source)}</span>
          <strong>${Number(summary.postCount || posts.length).toLocaleString()} Indexed Posts</strong>
          <p>Location descriptions are excluded from the AI prompt and the public Story So Far digest.</p>
        </article>
      </section>
    </div>
  `;
}

function buildContinuitySummary(world, posts, activeThreads) {
  if (!posts.length) return `${world.title} has no transmitted story entries yet.`;
  const latest = posts[posts.length - 1];
  const locations = activeThreads.slice(0, 4).map(({ thread }) => thread.title).join(", ");
  const authorCounts = countBy(posts, (post) => post.authorName || "Unknown");
  const authors = [...authorCounts.keys()].slice(0, 5).join(", ");
  return `${world.title} currently spans ${posts.length} chronicle entries. Activity is centered around ${locations || "the registered locations"}, with recent motion ending in ${latest.threadTitle}. Current voices include ${authors || "the registered writers"}.`;
}

function getActiveStoryThreads(worldId) {
  return getThreadsForWorld(worldId)
    .map((thread) => ({
      thread,
      posts: getPostsForThread(worldId, thread.id, "asc").filter(isNarrativePost)
    }))
    .filter(({ posts }) => posts.length);
}

function summarizePost(post, limit = 220) {
  const text = plainStoryText(post.body);
  if (text.length <= limit) return text || "No post body available.";
  return `${text.slice(0, limit).replace(/\s+\S*$/, "")}...`;
}

function plainStoryText(value) {
  return String(value || "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[`*_>#~]/g, "")
    .replace(/^-+\s*/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

function countBy(items, getter) {
  const map = new Map();
  items.forEach((item) => {
    const key = getter(item);
    map.set(key, (map.get(key) || 0) + 1);
  });
  return map;
}

function parseTags(value) {
  return normalizeTagList(String(value || "").split(","));
}

function normalizeTagList(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(",");
  return [...new Set(items
    .map((tag) => String(tag || "").trim())
    .filter(Boolean)
    .slice(0, 12))];
}

function renderCharacters() {
  if (!elements.characterGrid) return;
  const worlds = getWorlds();
  const search = state.characterSearch.trim().toLowerCase();
  const characters = getCharacters().filter((character) => {
    const current = getCharacterCurrentState(character);
    if (!search) return true;
    const world = worlds.find((item) => item.id === character.worldId);
    return [
      character.name,
      character.ownerDisplayName,
      character.species,
      character.role,
      character.alignment,
      character.affiliation,
      character.location,
      current.location,
      character.status,
      world?.title
    ].join(" ").toLowerCase().includes(search);
  });

  elements.characterGrid.innerHTML = characters.length ? characters.map((character) => {
    const world = worlds.find((item) => item.id === character.worldId);
    const current = getCharacterCurrentState(character);
    return `
      <article class="chronicles-character-card">
        <div class="chronicles-character-portrait${character.image ? " has-image" : ""}" style="${character.image ? `--character-image: url('${escapeAttr(character.image)}')` : ""}">
          <span>${escapeHtml((character.name || "?").charAt(0))}</span>
        </div>
        <div>
          <p>${escapeHtml(world?.title || "Unassigned World")} / Created by ${escapeHtml(character.ownerDisplayName || "Unknown")}</p>
          <h3>${escapeHtml(character.name || "Unnamed Character")}</h3>
          <dl>
            <dt>Role</dt><dd>${escapeHtml(character.role || "Unassigned")}</dd>
            <dt>Alignment</dt><dd>${escapeHtml(character.alignment || "Unknown")}</dd>
            <dt>Location</dt><dd>${escapeHtml(current.location || "Not set")}</dd>
          </dl>
          ${character.origin ? `<p>${escapeHtml(character.origin).slice(0, 220)}${character.origin.length > 220 ? "..." : ""}</p>` : ""}
          <div class="chronicles-forum-actions">
            <button type="button" data-chronicles-open-character="${escapeAttr(character.id)}">Open Dossier</button>
          </div>
        </div>
      </article>
    `;
  }).join("") : '<div class="relay-empty">No character records match that signal.</div>';
}

function renderEchoes() {
  if (!elements.echoGrid) return;
  const search = state.echoSearch.trim().toLowerCase();
  const echoes = getEchoes().filter((echo) => {
    if (!search) return true;
    const character = getCharacter(echo.characterId);
    const world = getWorld(echo.worldId || character?.worldId);
    return [
      echo.title,
      echo.summary,
      echo.body,
      echo.timeline,
      echo.location,
      echo.status,
      echo.canonStatus,
      echo.tags?.join?.(" "),
      character?.name,
      character?.ownerDisplayName,
      world?.title
    ].join(" ").toLowerCase().includes(search);
  });

  elements.echoGrid.innerHTML = echoes.length ? echoes.map((echo) => renderEchoCard(echo, { showCharacter: true })).join("") : `
    <div class="relay-empty">
      No Echoes have been recorded yet. Create one from a character dossier or the Echoes tab.
    </div>
  `;
}

function renderEchoCard(echo, options = {}) {
  const character = getCharacter(echo.characterId);
  const world = getWorld(echo.worldId || character?.worldId);
  const canEdit = canEditChronicleRecord(echo);
  const cover = normalizeDossierUrl(echo.coverImage || echo.image || "");
  const tags = normalizeTagList(echo.tags);
  return `
    <article class="chronicles-record-card chronicles-echo-card${cover ? " has-cover" : ""}">
      ${cover ? `
        <button class="chronicles-record-cover" type="button" data-chronicles-open-media data-chronicles-media-url="${escapeAttr(cover)}" data-chronicles-media-title="${escapeAttr(echo.title || "Echo cover")}" data-chronicles-media-caption="${escapeAttr(echo.summary || "")}">
          <img src="${escapeAttr(cover)}" alt="${escapeAttr(echo.title || "Echo cover")}" loading="lazy" referrerpolicy="no-referrer" />
        </button>
      ` : ""}
      <div class="chronicles-record-body">
        <p class="chronicles-record-kicker">${escapeHtml(world?.title || "World")} / ${options.showCharacter ? escapeHtml(character?.name || "Unlinked Character") : "Personal Echo"}</p>
        <h3>${escapeHtml(echo.title || "Untitled Echo")}</h3>
        <dl class="chronicles-record-meta">
          <dt>Status</dt><dd>${escapeHtml(toTitle(echo.status || "public"))}</dd>
          <dt>Continuity</dt><dd>${escapeHtml(toTitle(echo.canonStatus || "canon"))}</dd>
          <dt>Timeline</dt><dd>${escapeHtml(echo.timeline || "Not recorded")}</dd>
          <dt>Location</dt><dd>${escapeHtml(echo.location || "Unspecified")}</dd>
        </dl>
        ${echo.summary ? `<p>${escapeHtml(echo.summary)}</p>` : ""}
        <div class="chronicles-markdown chronicles-record-markdown">
          ${renderMarkdown(echo.body || "No echo text recorded yet.")}
        </div>
        ${tags.length ? `<div class="chronicles-record-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="chronicles-forum-actions">
          ${character ? `<button type="button" data-chronicles-open-character="${escapeAttr(character.id)}">Open Dossier</button>` : ""}
          ${canEdit ? `<button type="button" data-chronicles-edit-echo="${escapeAttr(echo.id)}">Edit Echo</button>` : ""}
          ${canEdit ? `<button type="button" data-chronicles-delete-echo="${escapeAttr(echo.id)}">Delete</button>` : ""}
        </div>
      </div>
    </article>
  `;
}

function getPrimaryDossierAudio(character) {
  return normalizeDossierMediaItems(character?.audio || character?.audioFiles, "audio")
    .find((item) => item.url) || null;
}

function getHeaderDossierAudioItems(character) {
  const items = normalizeDossierMediaItems(character?.audio || character?.audioFiles, "audio")
    .filter((item) => item.url);
  const pinned = items.filter((item) => item.pinned === true);
  return pinned.slice(0, 2);
}

function renderDossierAudioControl(character) {
  const audioItems = getHeaderDossierAudioItems(character);
  if (!audioItems.length) return "";
  return `
    <div class="chronicles-dossier-audio-strip">
      ${audioItems.map((audio) => renderDossierAudioSignal(character, audio)).join("")}
    </div>
  `;
}

function renderDossierAudioSignal(character, audio) {
  const title = audio.title || "Theme Signal";
  const caption = audio.caption || "Dossier audio";
  const playUrl = getPlayableDossierAudioUrl(audio);
  const canPlay = Boolean(playUrl);
  return `
    <div class="chronicles-dossier-audio-signal${canPlay ? "" : " is-external"}" data-chronicles-audio-source="${escapeAttr(audio.url)}" data-chronicles-audio-id="${escapeAttr(audio.id)}" data-chronicles-character-id="${escapeAttr(character.id)}">
      <button type="button" data-chronicles-dossier-audio="${escapeAttr(playUrl)}" aria-pressed="false" aria-label="Play ${escapeAttr(title)}" ${canPlay ? "" : "disabled title=\"Resolving direct audio URL...\""}>
        <span aria-hidden="true"></span>
      </button>
      <div>
        <strong>${escapeHtml(title)}</strong>
        <small data-chronicles-audio-caption="${escapeAttr(caption)}">${escapeHtml(canPlay ? caption : "Resolving source audio...")}</small>
      </div>
      <a href="${escapeAttr(audio.url)}" target="_blank" rel="noopener">Open</a>
      ${canPlay ? `<audio preload="none" src="${escapeAttr(playUrl)}"></audio>` : ""}
    </div>
  `;
}

function renderCharacterDossier() {
  if (!elements.dossierShell) return;
  const character = getCharacter(state.selectedCharacterId);
  if (!character) {
    elements.dossierShell.innerHTML = `
      <div class="panel-frame placeholder-panel">
        <p class="banri-modal-kicker">Character Dossier</p>
        <h2 id="chroniclesDossierTitle">No dossier selected.</h2>
        <p>Open a character from the registry to read their dossier.</p>
      </div>
    `;
    return;
  }

  const world = getWorld(character.worldId);
  const current = getCharacterCurrentState(character);
  const latest = current.latest;
  const canEdit = canEditCharacter(character);
  const canPostAsCharacter = canUseCharacterVoice(character);
  const activeTab = ["profile", "chronicle", "codex", "echoes", "connections", "gallery", "archive", "ooc"].includes(state.dossierTab) ? state.dossierTab : "profile";
  const portraitStyle = character.image ? `--dossier-portrait: url('${escapeAttr(character.image)}')` : "";
  const initial = (character.name || "?").charAt(0);
  const audioControl = renderDossierAudioControl(character);

  elements.dossierShell.innerHTML = `
    <div class="section-heading">
      <p><span>//</span> Character Dossier</p>
      <h2 id="chroniclesDossierTitle">${escapeHtml(character.name || "Unnamed Character")}</h2>
      <button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-view-jump="characters">Back to Registry</button>
    </div>

    <article class="chronicles-dossier panel-frame">
      <header class="chronicles-dossier-header">
        <div class="chronicles-dossier-portrait${character.image ? " has-image" : ""}" style="${portraitStyle}">
          <span>${escapeHtml(initial)}</span>
        </div>
        <div class="chronicles-dossier-identity">
          <p class="banri-modal-kicker mb-2">${escapeHtml(world?.title || "Unassigned World")} / ${escapeHtml(character.ownerDisplayName || "Unknown")}</p>
          <h3>${escapeHtml(character.name || "Unnamed Character")}</h3>
          ${character.alias ? `<p class="chronicles-dossier-alias">${escapeHtml(character.alias)}</p>` : ""}
          ${audioControl}
          <div class="chronicles-dossier-facts">
            ${renderDossierFact("Role", character.role || "Unassigned")}
            ${renderDossierFact("Species / Origin", character.species || "Unknown")}
            ${renderDossierFact("Cycle of Years", character.age || "Not recorded")}
            ${renderDossierFact("Affiliation", current.affiliation || "None recorded")}
            ${renderDossierFact("Alignment", character.alignment || "Unknown")}
          </div>
          <div class="chronicles-dossier-actions">
            ${canPostAsCharacter ? `<button class="btn btn-banri-primary btn-sm" type="button" data-chronicles-continue-character="${escapeAttr(character.id)}">Continue as ${escapeHtml(character.name || "Character")}</button>` : ""}
            ${current.thread ? `<button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-open-thread="${escapeAttr(`${character.worldId}:${current.thread.id}`)}">Open Current Location</button>` : ""}
            ${canEdit ? `<button class="btn btn-banri-outline btn-sm" type="button" data-chronicles-edit-character="${escapeAttr(character.id)}">Edit Dossier</button>` : ""}
          </div>
        </div>
      </header>

      <section class="chronicles-dossier-state" aria-label="Current character state">
        ${renderDossierFact("Current Location", current.location)}
        ${renderDossierFact("Current Arc", current.arcTitle)}
        ${renderDossierFact("Active Objective", current.objective)}
        ${renderDossierFact("Condition", current.condition)}
        ${renderDossierFact("Last Appearance", latest ? `${latest.threadTitle} / ${formatDate(latest.createdAt)}` : "No linked posts yet")}
      </section>

      <nav class="chronicles-dossier-tabs" aria-label="Dossier sections">
        ${renderDossierTabButton("profile", "Profile", activeTab)}
        ${renderDossierTabButton("chronicle", "Appearances", activeTab)}
        ${renderDossierTabButton("codex", "Codex", activeTab)}
        ${renderDossierTabButton("echoes", "Echoes", activeTab)}
        ${renderDossierTabButton("connections", "Connections", activeTab)}
        ${renderDossierTabButton("gallery", "Gallery", activeTab)}
        ${renderDossierTabButton("archive", "Archive Files", activeTab)}
        ${renderDossierTabButton("ooc", "OOC", activeTab)}
      </nav>

      <div class="chronicles-dossier-content">
        ${renderDossierTabContent(character, activeTab)}
      </div>
    </article>
  `;
  resolveDossierAudioSignals(character);
  syncDossierAudioControls();
}

function renderDossierFact(label, value) {
  return `
    <div class="chronicles-dossier-fact">
      <span>${escapeHtml(label)}</span>
      <strong>${escapeHtml(value || "Not recorded")}</strong>
    </div>
  `;
}

function renderDossierTabButton(tab, label, activeTab) {
  return `<button class="${tab === activeTab ? "active" : ""}" type="button" data-chronicles-dossier-tab="${escapeAttr(tab)}">${escapeHtml(label)}</button>`;
}

function renderDossierTabContent(character, tab) {
  if (tab === "chronicle") return renderDossierChronicle(character);
  if (tab === "codex") return renderDossierCodex(character);
  if (tab === "echoes") return renderDossierEchoes(character);
  if (tab === "connections") return renderDossierConnections(character);
  if (tab === "gallery") return renderDossierGallery(character);
  if (tab === "archive") return renderDossierArchive(character);
  if (tab === "ooc") return renderDossierOoc(character);
  return renderDossierProfile(character);
}

function renderDossierProfile(character) {
  const sections = [
    readSection("Origin Tale", character.origin),
    readSection("Armament / Equipment", character.equipment),
    readSection("Skills / Aptitudes", character.skills),
    readSection("Personality Notes", character.personality),
    readSection("Hooks / Rumors", character.hooks)
  ].filter(Boolean).join("");
  return `
    <div class="chronicles-dossier-profile">
      <div class="chronicles-dossier-readable">
        ${sections || '<div class="relay-empty">No profile dossier sections recorded yet.</div>'}
      </div>
    </div>
  `;
}

function renderDossierCodex(character) {
  const entries = getCodexEntries(character.id);
  const canManage = canEditCharacter(character);
  return `
    <div class="chronicles-dossier-records">
      <div class="chronicles-dossier-subhead">
        <p>// Codex</p>
        <span>${entries.length} record${entries.length === 1 ? "" : "s"}</span>
        ${canManage ? `<button type="button" data-chronicles-open="codex">New Codex Entry</button>` : ""}
      </div>
      <div class="chronicles-record-grid compact">
        ${entries.length ? entries.map(renderCodexCard).join("") : '<div class="relay-empty">No codex entries recorded yet. Use this space for abilities, doctrines, private lore, research notes, and character-specific mechanics.</div>'}
      </div>
    </div>
  `;
}

function renderCodexCard(entry) {
  const character = getCharacter(entry.characterId);
  const world = getWorld(entry.worldId || character?.worldId);
  const canEdit = canEditChronicleRecord(entry);
  const tags = normalizeTagList(entry.tags);
  return `
    <article class="chronicles-record-card chronicles-codex-card">
      <div class="chronicles-record-body">
        <p class="chronicles-record-kicker">${escapeHtml(entry.category || "Field Note")} / ${escapeHtml(world?.title || "World")}</p>
        <h3>${escapeHtml(entry.title || "Untitled Codex Entry")}</h3>
        ${entry.summary ? `<p>${escapeHtml(entry.summary)}</p>` : ""}
        <div class="chronicles-markdown chronicles-record-markdown">
          ${renderMarkdown(entry.body || "No codex text recorded yet.")}
        </div>
        ${tags.length ? `<div class="chronicles-record-tags">${tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
        <div class="chronicles-record-stamp">
          ${escapeHtml(character?.name || "Unlinked Character")} / Updated ${escapeHtml(formatDate(entry.updatedAt || entry.createdAt))}
        </div>
        ${canEdit ? `
          <div class="chronicles-forum-actions">
            <button type="button" data-chronicles-edit-codex="${escapeAttr(entry.id)}">Edit Codex</button>
            <button type="button" data-chronicles-delete-codex="${escapeAttr(entry.id)}">Delete</button>
          </div>
        ` : ""}
      </div>
    </article>
  `;
}

function renderDossierEchoes(character) {
  const echoes = getEchoes(character.id);
  const canManage = canEditCharacter(character);
  return `
    <div class="chronicles-dossier-records">
      <div class="chronicles-dossier-subhead">
        <p>// Echoes</p>
        <span>${echoes.length} side chronicle${echoes.length === 1 ? "" : "s"}</span>
        ${canManage ? `<button type="button" data-chronicles-open="echo">Create Echo</button>` : ""}
      </div>
      <div class="chronicles-record-grid">
        ${echoes.length ? echoes.map((echo) => renderEchoCard(echo, { showCharacter: false })).join("") : '<div class="relay-empty">No personal echoes recorded yet. Use Echoes for character substories, memories, quiet scenes, and public side chapters that support the main chronicle.</div>'}
      </div>
    </div>
  `;
}

function renderDossierChronicle(character) {
  const posts = getCharacterPosts(character, "desc");
  const appearances = [...posts.reduce((map, post) => {
    const key = `${post.worldId}:${post.threadId}`;
    const existing = map.get(key) || { ...post, count: 0 };
    existing.count += 1;
    if (toTime(post.createdAt) > toTime(existing.createdAt)) {
      existing.createdAt = post.createdAt;
      existing.id = post.id;
      existing.title = post.title;
    }
    map.set(key, existing);
    return map;
  }, new Map()).values()].sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));

  return `
    <div class="chronicles-dossier-chronicle">
      <section>
        <div class="chronicles-dossier-subhead">
          <p>// Recent Entries</p>
          <span>${posts.length} linked post${posts.length === 1 ? "" : "s"}</span>
        </div>
        <div class="chronicles-dossier-posts">
          ${posts.length ? posts.slice(0, 8).map((post) => `
            <article>
              <div>
                <strong>${escapeHtml(post.title || post.threadTitle)}</strong>
                <span>${escapeHtml(post.worldTitle)} / ${escapeHtml(post.threadTitle)} / ${escapeHtml(formatDate(post.createdAt))}</span>
              </div>
              <p>${escapeHtml(summarizePost(post, 180))}</p>
              <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(post.worldId)}:${escapeAttr(post.threadId)}:${escapeAttr(post.id)}">Open Post</button>
            </article>
          `).join("") : '<div class="relay-empty">No character-linked story posts yet. Use Character Voice when posting to build this history.</div>'}
        </div>
      </section>
      <section>
        <div class="chronicles-dossier-subhead">
          <p>// Location History</p>
          <span>${appearances.length} location${appearances.length === 1 ? "" : "s"}</span>
        </div>
        <div class="chronicles-dossier-appearances">
          ${appearances.length ? appearances.map((appearance) => `
            <article>
              <strong>${escapeHtml(appearance.threadTitle)}</strong>
              <span>${escapeHtml(appearance.worldTitle)} / ${appearance.count} post${appearance.count === 1 ? "" : "s"} / ${escapeHtml(formatDate(appearance.createdAt))}</span>
              <button type="button" data-chronicles-open-thread-from-post="${escapeAttr(appearance.worldId)}:${escapeAttr(appearance.threadId)}:${escapeAttr(appearance.id)}">Jump In</button>
            </article>
          `).join("") : '<div class="relay-empty">No location appearances recorded yet.</div>'}
        </div>
      </section>
    </div>
  `;
}

function renderDossierConnections(character) {
  const relationships = normalizeDossierConnections(character.relationships || character.connections);
  return `
    <div class="chronicles-dossier-connections">
      ${relationships.length ? relationships.map((relationship) => {
        const target = getCharacter(relationship.targetCharacterId);
        return `
          <article>
            <p>${escapeHtml(relationship.type || "Connection")}</p>
            <h4>${target ? escapeHtml(target.name) : escapeHtml(relationship.externalName || "Unnamed connection")}</h4>
            <span>${escapeHtml(relationship.status || "Status not recorded")}</span>
            ${relationship.note ? `<div class="chronicles-markdown">${renderMarkdown(relationship.note)}</div>` : ""}
            ${target ? `<button type="button" data-chronicles-open-character="${escapeAttr(target.id)}">Open Dossier</button>` : ""}
          </article>
        `;
      }).join("") : '<div class="relay-empty">No structured connections recorded yet.</div>'}
    </div>
  `;
}

function renderDossierGallery(character) {
  const galleryItems = normalizeDossierMediaItems(character.gallery, "image");
  const legacyPortrait = character.image ? [{ id: "primary-portrait", title: "Primary Portrait", url: character.image, caption: "Character portrait stored in the dossier record." }] : [];
  const items = [...legacyPortrait, ...galleryItems].filter((item) => item.url || item.image || item.downloadURL);
  return `
    <div class="chronicles-dossier-gallery">
      ${items.length ? items.map((item) => {
        const url = item.url || item.image || item.downloadURL;
        const title = item.title || "Untitled image";
        const caption = item.caption || "";
        return `
          <article>
            <button class="chronicles-gallery-media" type="button" data-chronicles-open-media data-chronicles-media-url="${escapeAttr(url)}" data-chronicles-media-title="${escapeAttr(title)}" data-chronicles-media-caption="${escapeAttr(caption)}">
              <img src="${escapeAttr(url)}" alt="${escapeAttr(item.altText || title || `${character.name} gallery image`)}" loading="lazy" referrerpolicy="no-referrer" />
            </button>
            <div class="chronicles-gallery-meta">
              <span>Gallery Image</span>
              <strong>${escapeHtml(title)}</strong>
              <p>${caption ? escapeHtml(caption) : "No caption recorded."}</p>
              <button type="button" data-chronicles-open-media data-chronicles-media-url="${escapeAttr(url)}" data-chronicles-media-title="${escapeAttr(title)}" data-chronicles-media-caption="${escapeAttr(caption)}">Open Full Image</button>
            </div>
          </article>
        `;
      }).join("") : '<div class="relay-empty">No gallery images curated yet.</div>'}
    </div>
  `;
}

function renderDossierArchive(character) {
  const files = normalizeDossierMediaItems(character.archiveFiles || character.files, "archive");
  const audioItems = normalizeDossierMediaItems(character.audio || character.audioFiles, "audio");
  const hasFiles = files.length || audioItems.length;
  const canManageAudio = canEditCharacter(character);
  return `
    <div class="chronicles-dossier-files">
      ${hasFiles ? `
        ${files.map((file) => {
          const url = file.url || file.downloadURL || file.image;
          const title = file.title || file.name || "Unnamed file";
          const caption = file.caption || "";
          const kind = file.fileType || file.mimeType || "Archive File";
          const preview = url && isImageUrl(url) ? `
            <button class="chronicles-archive-preview" type="button" data-chronicles-open-media data-chronicles-media-url="${escapeAttr(url)}" data-chronicles-media-title="${escapeAttr(title)}" data-chronicles-media-caption="${escapeAttr(caption)}">
              <img src="${escapeAttr(url)}" alt="${escapeAttr(title)}" loading="lazy" referrerpolicy="no-referrer" />
            </button>
          ` : "";
          return `
            <article>
              ${preview}
              <p>${escapeHtml(kind)}</p>
              <strong>${escapeHtml(title)}</strong>
              ${caption ? `<span>${escapeHtml(caption)}</span>` : ""}
              ${url ? `<a href="${escapeAttr(url)}" target="_blank" rel="noopener">Open File</a>` : ""}
            </article>
          `;
        }).join("")}
        ${audioItems.length ? `
          <div class="chronicles-dossier-audio-grid">
            ${audioItems.map((item) => {
              const url = item.url || item.downloadURL || item.image;
              const playUrl = getPlayableDossierAudioUrl(item);
              const title = item.title || "Untitled audio";
              const caption = item.caption || "Archive audio signal";
              return `
                <article class="chronicles-dossier-audio-card${item.pinned ? " is-pinned" : ""}">
                  <p>${escapeHtml(item.audioType || "audio")} / URL Signal</p>
                  <strong>${escapeHtml(title)}</strong>
                  <div class="chronicles-dossier-audio-signal chronicles-dossier-audio-mini${playUrl ? "" : " is-external"}" data-chronicles-audio-source="${escapeAttr(url)}" data-chronicles-audio-id="${escapeAttr(item.id)}" data-chronicles-character-id="${escapeAttr(character.id)}">
                    <button type="button" data-chronicles-dossier-audio="${escapeAttr(playUrl)}" aria-pressed="false" aria-label="Play ${escapeAttr(title)}" ${playUrl ? "" : "disabled title=\"Resolving direct audio URL...\""}>
                      <span aria-hidden="true"></span>
                    </button>
                    <div>
                      <strong>${escapeHtml(title)}</strong>
                      <small data-chronicles-audio-caption="${escapeAttr(caption)}">${escapeHtml(playUrl ? caption : "Resolving source audio...")}</small>
                    </div>
                    ${playUrl ? `<audio preload="none" src="${escapeAttr(playUrl)}"></audio>` : ""}
                  </div>
                  <div class="chronicles-dossier-audio-seek" data-chronicles-audio-seek-panel>
                    <span data-chronicles-audio-current>0:00</span>
                    <input type="range" min="0" max="1000" value="0" step="1" data-chronicles-audio-seek aria-label="Seek ${escapeAttr(title)}" ${playUrl ? "" : "disabled"} />
                    <span data-chronicles-audio-duration>0:00</span>
                  </div>
                  <div class="chronicles-dossier-file-actions">
                    <a href="${escapeAttr(url)}" target="_blank" rel="noopener">Open Audio</a>
                    ${canManageAudio ? `<button type="button" data-chronicles-pin-audio="${escapeAttr(`${character.id}:${item.id}`)}">${item.pinned ? "Unpin Header" : "Pin Header"}</button>` : ""}
                  </div>
                </article>
              `;
            }).join("")}
          </div>
        ` : ""}
      ` : '<div class="relay-empty">No archive files or audio signals recorded yet.</div>'}
    </div>
  `;
}

function renderDossierOoc(character) {
  const notes = character.oocNotes || character.collaborationNotes || "";
  return `
    <div class="chronicles-dossier-ooc">
      ${renderDossierFact("Created By", character.ownerDisplayName || "Unknown")}
      ${renderDossierFact("Character Owner UID", state.isAdmin ? character.uid || "Not recorded" : "Protected")}
      ${renderDossierFact("Writing Preference", character.writingPreference || "Not recorded")}
      ${renderDossierFact("Consent Boundary", character.consentBoundary || "Use post-level character-effects badges")}
      ${renderDossierFact("Posting Pace", character.postingPace || "Not recorded")}
      <section class="chronicles-dossier-ooc-notes">
        <p>// Collaborator Notes</p>
        ${notes ? `<div class="chronicles-markdown">${renderMarkdown(notes)}</div>` : '<div class="relay-empty">No public OOC notes recorded yet.</div>'}
      </section>
    </div>
  `;
}

function renderAdminVisibility() {
  document.querySelectorAll("[data-chronicles-admin-only]").forEach((item) => {
    item.classList.toggle("d-none", !state.isAdmin);
  });
}

function renderNotificationButton() {
  if (!elements.notifyButton) return;
  const supported = "Notification" in window;
  elements.notifyButton.disabled = !supported;
  elements.notifyButton.textContent = supported && state.notificationsEnabled ? "Notifications On" : "Notify New Posts";
}

function populateSelects() {
  const worldOptions = getWorlds()
    .map((world) => `<option value="${escapeAttr(world.id)}">${escapeHtml(world.title)}</option>`)
    .join("");

  ["chroniclesThreadWorld", "chroniclesPostWorld", "chroniclesCharacterWorld", "chroniclesCharacterEditWorld"].forEach((id) => {
    const select = document.getElementById(id);
    if (!select) return;
    const current = select.value || state.selectedWorldId;
    select.innerHTML = worldOptions;
    select.value = getWorld(current) ? current : state.selectedWorldId;
  });

  populateCategorySelects();
  populateThreadSelect(document.getElementById("chroniclesPostThread")?.value || "");
  populatePostCharacterSelect(document.getElementById("chroniclesPostCharacter")?.value || "");
  populateRecordCharacterSelect("chroniclesCodexCharacter", document.getElementById("chroniclesCodexCharacter")?.value || state.selectedCharacterId);
  populateRecordCharacterSelect("chroniclesEchoCharacter", document.getElementById("chroniclesEchoCharacter")?.value || state.selectedCharacterId);
  renderStoryWorldSelect(state.storyWorldId);
}

function getWritableCharacters() {
  const characters = getCharacters();
  return state.isAdmin ? characters : characters.filter(canEditCharacter);
}

function populateRecordCharacterSelect(selectId, selectedCharacterId = "") {
  const select = document.getElementById(selectId);
  if (!select) return;
  const characters = getWritableCharacters();
  select.innerHTML = characters.length ? characters.map((character) => {
    const world = getWorld(character.worldId);
    return `<option value="${escapeAttr(character.id)}">${escapeHtml(character.name || "Unnamed Character")} / ${escapeHtml(world?.title || "World")}</option>`;
  }).join("") : '<option value="">No editable characters</option>';
  const preferred = characters.some((character) => character.id === selectedCharacterId) ? selectedCharacterId : characters[0]?.id || "";
  select.value = preferred;
}

function populateCategorySelects(selectedCategoryId = "") {
  const threadWorldSelect = document.getElementById("chroniclesThreadWorld");
  const categorySelect = document.getElementById("chroniclesThreadCategory");
  const categoryWorldSelect = document.getElementById("chroniclesCategoryWorld");
  const worldId = threadWorldSelect?.value || state.selectedWorldId;
  const categories = getCategoriesForWorld(worldId);

  if (categoryWorldSelect) {
    const current = categoryWorldSelect.value || state.selectedWorldId;
    categoryWorldSelect.innerHTML = getWorlds()
      .map((world) => `<option value="${escapeAttr(world.id)}">${escapeHtml(world.title)}</option>`)
      .join("");
    categoryWorldSelect.value = getWorld(current) ? current : state.selectedWorldId;
  }

  if (!categorySelect) return;
  categorySelect.innerHTML = [
    '<option value="">Unsorted Signal</option>',
    ...categories.map((category) => `<option value="${escapeAttr(category.id)}">${escapeHtml(category.title)}</option>`)
  ].join("");
  categorySelect.value = selectedCategoryId && categories.some((category) => category.id === selectedCategoryId) ? selectedCategoryId : "";
}

function populateThreadSelect(selectedThreadId = "") {
  const worldSelect = document.getElementById("chroniclesPostWorld");
  const threadSelect = document.getElementById("chroniclesPostThread");
  if (!worldSelect || !threadSelect) return;
  const threads = getThreadsForWorld(worldSelect.value);
  threadSelect.innerHTML = [
    '<option value="">Select a location...</option>',
    ...threads.map((thread) => `<option value="${escapeAttr(thread.id)}">${escapeHtml(thread.title)}</option>`)
  ].join("");
  if (selectedThreadId && threads.some((thread) => thread.id === selectedThreadId)) {
    threadSelect.value = selectedThreadId;
  } else {
    threadSelect.value = "";
  }
}

function populatePostCharacterSelect(selectedCharacterId = "") {
  const worldSelect = document.getElementById("chroniclesPostWorld");
  const characterSelect = document.getElementById("chroniclesPostCharacter");
  if (!worldSelect || !characterSelect) return;
  const worldId = worldSelect.value || state.selectedWorldId;
  const characters = getCharacters().filter((character) => character.worldId === worldId && canUseCharacterVoice(character));
  characterSelect.innerHTML = [
    '<option value="">No linked character</option>',
    ...characters.map((character) => `<option value="${escapeAttr(character.id)}">${escapeHtml(character.name || "Unnamed Character")} / ${escapeHtml(character.ownerDisplayName || "Unknown")}</option>`)
  ].join("");
  characterSelect.value = selectedCharacterId && characters.some((character) => character.id === selectedCharacterId) ? selectedCharacterId : "";
}

function applySelectedPostCharacterVoice(force = false) {
  const characterId = readValue("chroniclesPostCharacter");
  const character = getCharacter(characterId);
  const authorInput = document.getElementById("chroniclesPostAuthor");
  const ownerInput = document.getElementById("chroniclesPostOwner");
  if (!character) {
    if (force && !state.editingPost) {
      if (authorInput) authorInput.value = "";
      if (ownerInput) ownerInput.value = "";
    }
    return;
  }
  if (authorInput && (force || !authorInput.value.trim())) authorInput.value = character.name || "";
  if (ownerInput && (force || !ownerInput.value.trim())) ownerInput.value = character.ownerDisplayName || "";
}

function updatePostSubmitState() {
  const submitButton = document.getElementById("chroniclesPostSubmit");
  if (!submitButton) return;
  submitButton.disabled = !readValue("chroniclesPostThread") || !readValue("chroniclesPostBody");
}

function showView(view) {
  if (state.view === "dossier" && view !== "dossier") stopDossierAudio();
  state.view = view;
  document.querySelectorAll("[data-chronicles-view]").forEach((section) => {
    section.classList.toggle("active", section.dataset.chroniclesView === view);
  });
  document.querySelectorAll("[data-chronicles-view-button]").forEach((button) => {
    button.classList.toggle("active", button.dataset.chroniclesViewButton === view);
  });
}

function parseThreadRoute(value) {
  const parts = String(value || "").split(":");
  if (parts.length >= 2) {
    return {
      worldId: parts[0],
      threadId: parts.slice(1).join(":")
    };
  }
  return {
    worldId: state.selectedWorldId,
    threadId: String(value || "")
  };
}

function openWorld(worldId) {
  state.selectedWorldId = worldId;
  state.selectedThreadId = getThreadsForWorld(worldId)[0]?.id || "";
  state.storyWorldId = worldId;
  state.worldListMode = "selected";
  showView("worlds");
  renderAll();
}

function openStory(worldId) {
  state.storyWorldId = getWorld(worldId)?.id || state.selectedWorldId;
  state.selectedWorldId = state.storyWorldId;
  state.storyPage = 1;
  showView("story");
  renderAll();
}

function openCharacterDossier(characterId, options = {}) {
  const character = getCharacter(characterId);
  if (!character) return;
  if (state.selectedCharacterId && state.selectedCharacterId !== character.id) stopDossierAudio();
  state.selectedCharacterId = character.id;
  state.selectedWorldId = character.worldId || state.selectedWorldId;
  state.dossierTab = options.tab || state.dossierTab || "profile";
  state.view = "dossier";
  state.routeApplied = true;

  if (options.push !== false) {
    const nextUrl = `${window.location.pathname}?character=${encodeURIComponent(character.id)}`;
    window.history.pushState(null, "", nextUrl);
  }

  renderAll();
}

function openCharacterEditor(characterId) {
  const character = getCharacter(characterId);
  if (!character || !canEditCharacter(character)) return;
  state.selectedCharacterId = character.id;
  state.characterEditing = true;
  setText(elements.characterDetailStatus, "");
  renderCharacterDetailModal();
  showBootstrapModal("chroniclesCharacterDetailModal");
}

function continueAsCharacter(characterId) {
  const character = getCharacter(characterId);
  if (!character || !canUseCharacterVoice(character)) return;
  const current = getCharacterCurrentState(character);
  const latest = current.latest;
  const worldId = character.worldId || latest?.worldId || state.selectedWorldId;

  openPostModal({
    worldId,
    characterId: character.id
  });
}

function getDefaultWritableCharacterId() {
  const selected = getCharacter(state.selectedCharacterId);
  if (selected && canEditCharacter(selected)) return selected.id;
  return getWritableCharacters()[0]?.id || "";
}

function openCodexModal(entry = null) {
  const characterId = entry?.characterId || getDefaultWritableCharacterId();
  const character = getCharacter(characterId);
  if (!character || !canEditCharacter(character)) {
    setText(elements.codexStatus, "Create or open one of your characters before adding a codex record.");
    return;
  }

  state.editingCodex = entry;
  elements.codexForm?.reset();
  setText(elements.codexStatus, "");
  setText(document.getElementById("chroniclesCodexModalTitle"), entry ? "Edit Codex Entry" : "Create Codex Entry");
  populateRecordCharacterSelect("chroniclesCodexCharacter", character.id);
  setInputValue("chroniclesCodexTitle", entry?.title || "");
  setInputValue("chroniclesCodexCategory", entry?.category || "");
  setInputValue("chroniclesCodexSummary", entry?.summary || "");
  setInputValue("chroniclesCodexTags", normalizeTagList(entry?.tags).join(", "));
  setInputValue("chroniclesCodexBody", entry?.body || "");
  showBootstrapModal("chroniclesCodexModal");
}

function openEchoModal(entry = null) {
  const characterId = entry?.characterId || getDefaultWritableCharacterId();
  const character = getCharacter(characterId);
  if (!character || !canEditCharacter(character)) {
    setText(elements.echoStatus, "Create or open one of your characters before adding an Echo.");
    return;
  }

  const current = getCharacterCurrentState(character);
  state.editingEcho = entry;
  elements.echoForm?.reset();
  setText(elements.echoStatus, "");
  setText(document.getElementById("chroniclesEchoModalTitle"), entry ? "Edit Echo" : "Create Echo");
  populateRecordCharacterSelect("chroniclesEchoCharacter", character.id);
  setInputValue("chroniclesEchoTitle", entry?.title || "");
  setInputValue("chroniclesEchoStatusInput", entry?.status || "public");
  setInputValue("chroniclesEchoCanonStatus", entry?.canonStatus || "canon");
  setInputValue("chroniclesEchoTimeline", entry?.timeline || "");
  setInputValue("chroniclesEchoLocation", entry?.location || current.location || "");
  setInputValue("chroniclesEchoCover", entry?.coverImage || "");
  setInputValue("chroniclesEchoSummary", entry?.summary || "");
  setInputValue("chroniclesEchoBody", entry?.body || "");
  showBootstrapModal("chroniclesEchoModal");
}

function openThread(route) {
  const { worldId, threadId } = parseThreadRoute(route);
  state.selectedWorldId = worldId;
  state.selectedThreadId = threadId;
  state.worldListMode = "selected";
  showView("thread");
  renderAll();
}

function openThreadEditor(route) {
  const { worldId, threadId } = parseThreadRoute(route);
  const world = getWorld(worldId);
  const thread = world ? getThread(world.id, threadId) : null;
  if (!thread || !state.isAdmin) return;
  state.selectedWorldId = world.id;
  state.worldListMode = "selected";
  state.editingThread = { ...thread, worldId: world.id };
  setText(document.getElementById("chroniclesThreadModalTitle"), "Edit Thread");
  setInputValue("chroniclesThreadWorld", world.id);
  populateCategorySelects(thread.categoryId || "");
  setInputValue("chroniclesThreadTitleInput", thread.title || "");
  setInputValue("chroniclesThreadDescription", thread.description || "");
  showBootstrapModal("chroniclesThreadModal");
}

function openModal(kind, options = {}) {
  if (!state.user) {
    openLoginModal();
    return;
  }
  if ((kind === "world" || kind === "thread" || kind === "category") && !state.isAdmin) return;

  populateSelects();

  if (kind === "world") {
    elements.worldForm?.reset();
    showBootstrapModal("chroniclesWorldModal");
  } else if (kind === "thread") {
    elements.threadForm?.reset();
    state.editingThread = null;
    setText(document.getElementById("chroniclesThreadModalTitle"), "New Thread");
    const worldSelect = document.getElementById("chroniclesThreadWorld");
    if (worldSelect) worldSelect.value = state.selectedWorldId;
    populateCategorySelects();
    showBootstrapModal("chroniclesThreadModal");
  } else if (kind === "category") {
    elements.categoryForm?.reset();
    setText(elements.categoryStatus, "");
    const worldSelect = document.getElementById("chroniclesCategoryWorld");
    if (worldSelect) worldSelect.value = state.selectedWorldId;
    showBootstrapModal("chroniclesCategoryModal");
  } else if (kind === "post") {
    openPostModal(options);
  } else if (kind === "codex") {
    openCodexModal();
  } else if (kind === "echo") {
    openEchoModal();
  } else if (kind === "character") {
    elements.characterForm?.reset();
    setText(elements.characterStatus, "");
    const worldSelect = document.getElementById("chroniclesCharacterWorld");
    const ownerInput = document.getElementById("chroniclesCharacterOwner");
    const ownerUidInput = document.getElementById("chroniclesCharacterOwnerUid");
    if (worldSelect) worldSelect.value = state.selectedWorldId;
    if (ownerInput) ownerInput.value = state.isAdmin ? "" : getDisplayName();
    if (ownerUidInput) ownerUidInput.value = "";
    clearFileInput("chroniclesCharacterImage");
    setInputValue("chroniclesCharacterGalleryUrls", "");
    setInputValue("chroniclesCharacterAudioUrls", "");
    setInputValue("chroniclesCharacterConnections", "");
    setInputValue("chroniclesCharacterArchiveUrls", "");
    setInputValue("chroniclesCharacterWritingPreference", "");
    setInputValue("chroniclesCharacterConsentBoundary", "");
    setInputValue("chroniclesCharacterPostingPace", "");
    setInputValue("chroniclesCharacterOocNotes", "");
    renderPortraitUploadPreview("chroniclesCharacterImage", "chroniclesCharacterPortraitPreview");
    showBootstrapModal("chroniclesCharacterModal");
  }
}

function openPostModal(options = {}) {
  elements.postForm?.reset();
  state.editingPost = options.post || null;
  state.editingAttachments = normalizeAttachments(options.post?.attachments);
  setText(elements.postStatus, "");
  const postModalTitle = document.getElementById("chroniclesPostModalTitle");
  if (postModalTitle) postModalTitle.textContent = state.editingPost ? "Edit Post" : "Create Post";

  const worldId = options.worldId || options.post?.worldId || state.selectedWorldId;
  const threadId = options.post?.threadId || "";
  const worldSelect = document.getElementById("chroniclesPostWorld");
  const authorInput = document.getElementById("chroniclesPostAuthor");
  const ownerInput = document.getElementById("chroniclesPostOwner");

  if (worldSelect) worldSelect.value = worldId;
  populateThreadSelect(threadId);
  populatePostCharacterSelect(options.characterId || options.post?.characterId || "");
  setInputValue("chroniclesPostTitle", options.post?.title || "");
  setInputValue("chroniclesPostBody", options.post?.body || options.prefill || "");
  setInputValue("chroniclesPostType", options.post?.postType || "player");
  setCheckboxValue("chroniclesAllowCharacterEffects", options.post?.allowCharacterEffects === true);
  setInputValue("chroniclesPostImageUrl", "");
  if (authorInput) authorInput.value = options.post?.authorName || "";
  if (ownerInput) ownerInput.value = options.post?.ownerDisplayName || options.post?.authorName || "";
  if (options.characterId || options.post?.characterId) applySelectedPostCharacterVoice(!options.post);
  renderPostAttachmentPreview();
  renderPostPreview(false);
  updatePostSubmitState();
  showBootstrapModal("chroniclesPostModal");
}

function applyNarratorMode() {
  if (!state.isAdmin) return;
  setInputValue("chroniclesPostType", "narrator");
  setInputValue("chroniclesPostAuthor", "Narrator");
  setInputValue("chroniclesPostOwner", "Chronicle Custodian");
  if (!readValue("chroniclesPostTitle")) {
    setInputValue("chroniclesPostTitle", "Narrator Event");
  }
  setText(elements.postStatus, "Narrator voice armed.");
}

function openLoreModal(worldId) {
  const world = getWorld(worldId);
  if (!world) return;
  state.selectedLoreWorldId = world.id;
  state.loreEditing = false;
  setText(elements.loreStatus, "");
  const loreTitle = document.getElementById("chroniclesLoreModalTitle");
  const loreGenre = document.getElementById("chroniclesLoreGenre");
  if (loreTitle) loreTitle.textContent = world.title;
  if (loreGenre) loreGenre.textContent = world.genre || "World Lore";
  renderLoreModal();
  showBootstrapModal("chroniclesLoreModal");
}

function renderLoreModal() {
  const world = getWorld(state.selectedLoreWorldId);
  if (!world) return;
  if (elements.loreRead) {
    elements.loreRead.innerHTML = `
      <div class="chronicles-markdown">${renderMarkdown(world.lore || world.description || "Lore pending.")}</div>
    `;
  }
  setInputValue("chroniclesLoreTitleInput", world.title);
  setInputValue("chroniclesLoreGenreInput", world.genre || "");
  setInputValue("chroniclesLoreStatusInput", world.status || "Active");
  setInputValue("chroniclesLoreImageInput", world.image || "");
  setInputValue("chroniclesLoreDescriptionInput", world.description || "");
  setInputValue("chroniclesLoreBodyInput", world.lore || "");

  elements.loreRead?.classList.toggle("d-none", state.loreEditing);
  elements.loreForm?.classList.toggle("d-none", !state.loreEditing);
  elements.loreToggle?.classList.toggle("d-none", !state.isAdmin);
  elements.loreSave?.classList.toggle("d-none", !state.isAdmin || !state.loreEditing);
  if (elements.loreToggle) elements.loreToggle.textContent = state.loreEditing ? "Cancel Edit" : "Edit Lore";
}

function openCharacterDetail(characterId) {
  const character = getCharacter(characterId);
  if (!character) return;
  state.selectedCharacterId = character.id;
  state.characterEditing = false;
  setText(elements.characterDetailStatus, "");
  renderCharacterDetailModal();
  showBootstrapModal("chroniclesCharacterDetailModal");
}

function renderCharacterDetailModal() {
  const character = getCharacter(state.selectedCharacterId);
  if (!character) return;
  const world = getWorld(character.worldId);
  const characterTitle = document.getElementById("chroniclesCharacterDetailTitle");
  const characterWorld = document.getElementById("chroniclesCharacterDetailWorld");
  if (characterTitle) characterTitle.textContent = character.name || "Character";
  if (characterWorld) characterWorld.textContent = `${world?.title || "World"} / Created by ${character.ownerDisplayName || "Unknown"}`;

  if (elements.characterRead) {
    elements.characterRead.innerHTML = `
      <dl>
        ${detailRow("Created By", character.ownerDisplayName)}
        ${detailRow("World", world?.title)}
        ${detailRow("Species / Origin", character.species)}
        ${detailRow("Cycle of Years", character.age)}
        ${detailRow("Vocation / Role", character.role)}
        ${detailRow("Alignment", character.alignment)}
        ${detailRow("Affiliation", character.affiliation)}
        ${detailRow("Current Location", character.location)}
        ${detailRow("Status", character.status)}
        ${detailRow("Writing Preference", character.writingPreference)}
        ${detailRow("Consent Boundary", character.consentBoundary)}
        ${detailRow("Posting Pace", character.postingPace)}
      </dl>
      ${readSection("Origin Tale", character.origin)}
      ${readSection("Armament / Equipment", character.equipment)}
      ${readSection("Skills / Aptitudes", character.skills)}
      ${readSection("Personality Notes", character.personality)}
      ${readSection("Hooks / Rumors", character.hooks)}
      ${readSection("OOC Notes", character.oocNotes || character.collaborationNotes)}
    `;
  }

  setCharacterEditFields(character);
  const canEdit = canEditCharacter(character);
  elements.characterRead?.classList.toggle("d-none", state.characterEditing);
  elements.characterEditForm?.classList.toggle("d-none", !state.characterEditing);
  elements.characterEditToggle?.classList.toggle("d-none", !canEdit);
  elements.characterSave?.classList.toggle("d-none", !canEdit || !state.characterEditing);
  if (elements.characterEditToggle) elements.characterEditToggle.textContent = state.characterEditing ? "Cancel Edit" : "Edit Character";
}

function setCharacterEditFields(character) {
  const current = getCharacterCurrentState(character);
  setInputValue("chroniclesCharacterEditWorld", character.worldId || state.selectedWorldId);
  setInputValue("chroniclesCharacterEditName", character.name || "");
  setInputValue("chroniclesCharacterEditOwner", character.ownerDisplayName || "");
  setInputValue("chroniclesCharacterEditOwnerUid", character.uid === "seed" ? "" : character.uid || "");
  setInputValue("chroniclesCharacterEditSpecies", character.species || "");
  setInputValue("chroniclesCharacterEditAge", character.age || "");
  setInputValue("chroniclesCharacterEditRole", character.role || "");
  setInputValue("chroniclesCharacterEditAlignment", character.alignment || "");
  setInputValue("chroniclesCharacterEditAffiliation", character.affiliation || "");
  setInputValue("chroniclesCharacterEditLocation", current.location || "");
  setInputValue("chroniclesCharacterEditArc", character.currentState?.arcTitle || character.arcTitle || "");
  setInputValue("chroniclesCharacterEditObjective", character.currentState?.objective || character.objective || "");
  setInputValue("chroniclesCharacterEditStatusInput", character.currentState?.condition || character.status || "Active");
  clearFileInput("chroniclesCharacterEditImage");
  renderPortraitUploadPreview("chroniclesCharacterEditImage", "chroniclesCharacterEditPortraitPreview", character.image || "");
  setInputValue("chroniclesCharacterEditGalleryUrls", serializeDossierUrlItems(character.gallery, "image"));
  setInputValue("chroniclesCharacterEditAudioUrls", serializeDossierUrlItems(character.audio || character.audioFiles, "audio"));
  setInputValue("chroniclesCharacterEditConnections", serializeDossierConnections(character.relationships || character.connections));
  setInputValue("chroniclesCharacterEditArchiveUrls", serializeDossierUrlItems(character.archiveFiles || character.files, "archive"));
  setInputValue("chroniclesCharacterEditOrigin", character.origin || "");
  setInputValue("chroniclesCharacterEditEquipment", character.equipment || "");
  setInputValue("chroniclesCharacterEditSkills", character.skills || "");
  setInputValue("chroniclesCharacterEditPersonality", character.personality || "");
  setInputValue("chroniclesCharacterEditHooks", character.hooks || "");
  setInputValue("chroniclesCharacterEditWritingPreference", character.writingPreference || "");
  setInputValue("chroniclesCharacterEditConsentBoundary", character.consentBoundary || "");
  setInputValue("chroniclesCharacterEditPostingPace", character.postingPace || "");
  setInputValue("chroniclesCharacterEditOocNotes", character.oocNotes || character.collaborationNotes || "");
  const ownerInput = document.getElementById("chroniclesCharacterEditOwner");
  const ownerUidInput = document.getElementById("chroniclesCharacterEditOwnerUid");
  const locationInput = document.getElementById("chroniclesCharacterEditLocation");
  if (ownerInput) ownerInput.disabled = !state.isAdmin;
  if (ownerUidInput) ownerUidInput.disabled = !state.isAdmin;
  if (locationInput) locationInput.disabled = true;
}

async function handleWorldSubmit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const title = readValue("chroniclesWorldTitle");
  const worldId = slugify(title);
  if (!title || !worldId) return;

  try {
    await set(ref(database, `chronicles/worlds/${worldId}`), {
      id: worldId,
      title,
      genre: readValue("chroniclesWorldGenre") || "Play-by-post World",
      image: readValue("chroniclesWorldImage") || "/assets/img/hero/banri-hero-01.webp",
      description: readValue("chroniclesWorldDescription"),
      lore: readValue("chroniclesWorldLore"),
      status: readValue("chroniclesWorldStatus") || "Active",
      order: getWorlds().length + 1,
      createdBy: state.user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.selectedWorldId = worldId;
    state.storyWorldId = worldId;
    hideBootstrapModal("chroniclesWorldModal");
  } catch (error) {
    console.error(error);
  }
}

async function handleThreadSubmit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const worldId = readValue("chroniclesThreadWorld");
  const title = readValue("chroniclesThreadTitleInput");
  const threadId = state.editingThread?.id || slugify(title);
  if (!worldId || !title || !threadId) return;

  try {
    await set(ref(database, `chronicles/threads/${worldId}/${threadId}`), {
      ...(state.editingThread || {}),
      id: threadId,
      worldId,
      categoryId: readValue("chroniclesThreadCategory"),
      title,
      description: readValue("chroniclesThreadDescription"),
      order: state.editingThread?.order || getThreadsForWorld(worldId).length + 1,
      createdBy: state.editingThread?.createdBy || state.user.uid,
      createdAt: state.editingThread?.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    state.selectedWorldId = worldId;
    state.selectedThreadId = threadId;
    state.editingThread = null;
    hideBootstrapModal("chroniclesThreadModal");
    showView("thread");
  } catch (error) {
    console.error(error);
  }
}

async function handleCategorySubmit(event) {
  event.preventDefault();
  if (!state.isAdmin) return;
  const worldId = readValue("chroniclesCategoryWorld");
  const title = readValue("chroniclesCategoryTitle");
  const categoryId = slugify(title);
  if (!worldId || !title || !categoryId) {
    setText(elements.categoryStatus, "World and category name are required.");
    return;
  }

  try {
    await set(ref(database, `chronicles/categories/${worldId}/${categoryId}`), {
      id: categoryId,
      worldId,
      title,
      description: readValue("chroniclesCategoryDescription"),
      order: getCategoriesForWorld(worldId).length + 1,
      createdBy: state.user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.selectedWorldId = worldId;
    hideBootstrapModal("chroniclesCategoryModal");
    showView("worlds");
  } catch (error) {
    setText(elements.categoryStatus, error.message || "Category save failed.");
  }
}

function getChroniclesAiConfig() {
  return normalizeChroniclesAiConfig(state.chroniclesAiConfig);
}

function assertChroniclesAiReady(kind = "AI") {
  if (!CHRONICLES_AI_FEATURE_ENABLED) throw new Error("Chronicles AI is parked until API billing is intentionally enabled.");
  const config = getChroniclesAiConfig();
  if (!state.user) throw new Error("Sign in before using Chronicles AI.");
  if (!config.workerUrl) throw new Error("Chronicles AI Worker URL is not configured in the admin console.");
  if (kind === "assist" && !config.assistEnabled) throw new Error("AI Assist is disabled in the admin console.");
  if (kind === "summary" && !config.summaryEnabled) throw new Error("AI Summary is disabled in the admin console.");
  return config;
}

async function callChroniclesAi(payload, kind = "AI") {
  const config = assertChroniclesAiReady(kind);
  return runChroniclesAiQueuedRequest({
    workerUrl: config.workerUrl,
    user: state.user,
    payload
  }).catch((error) => {
    throw new Error(`${error.message || "Chronicles AI queue request failed."} Check Admin > Chronicles AI, then run Check Worker.`);
  });
}

function buildSummaryPosts(worldId) {
  return getNarrativePostsForWorld(worldId, "asc").map((post) => ({
    id: post.id,
    title: post.title || "",
    body: post.body || "",
    authorName: post.authorName || "",
    threadTitle: post.threadTitle || "",
    createdAt: post.createdAt || 0,
    postType: post.postType || "player"
  }));
}

function shouldSkipAutoSummary(worldId, posts, config) {
  if (!config.autoSummary || !posts.length) return true;
  const existing = normalizeAiSummary(state.aiSummaries[worldId]);
  const latestPost = posts[posts.length - 1];
  if (existing?.lastPostId === latestPost?.id) return true;

  const cooldownMs = Number(config.summaryCooldownMinutes || 5) * 60000;
  return Boolean(existing?.updatedAt && Date.now() - existing.updatedAt < cooldownMs);
}

async function refreshChroniclesSummary(worldId = state.storyWorldId, options = {}) {
  const config = assertChroniclesAiReady("summary");
  const world = getWorld(worldId);
  if (!world) throw new Error("Choose a world before refreshing the summary.");
  const posts = buildSummaryPosts(world.id);
  if (!posts.length) throw new Error("This world has no narrative posts to summarize yet.");
  if (!options.force && shouldSkipAutoSummary(world.id, posts, config)) return null;

  const latestPost = posts[posts.length - 1];
  const result = await callChroniclesAi({
    action: "summarize",
    worldId: world.id,
    worldTitle: world.title,
    worldGenre: world.genre || "",
    postCount: posts.length,
    lastPostId: latestPost?.id || "",
    posts
  }, "summary");

  const payload = {
    worldId: world.id,
    summary: String(result.summary || "").trim(),
    latestEvents: String(result.latestEvents || "").trim(),
    characterPositions: String(result.characterPositions || "").trim(),
    unresolvedHooks: String(result.unresolvedHooks || "").trim(),
    postCount: posts.length,
    lastPostId: latestPost?.id || "",
    updatedAt: Number(result.updatedAt || Date.now()),
    updatedByUid: state.user.uid,
    updatedByName: getDisplayName(),
    source: String(result.source || "OpenAI Summary").trim()
  };

  if (!payload.summary) throw new Error("AI summary returned empty text.");

  await set(ref(database, `chronicles/summaries/${world.id}`), payload);
  state.aiSummaries[world.id] = payload;
  renderStorySoFar();
  return payload;
}

function queueAutoSummaryRefresh(worldId) {
  if (!CHRONICLES_AI_FEATURE_ENABLED) return;
  const config = getChroniclesAiConfig();
  if (!config.workerUrl || !config.summaryEnabled || !config.autoSummary) return;
  refreshChroniclesSummary(worldId, { force: false })
    .catch((error) => console.warn("Chronicles auto-summary skipped:", error));
}

function openAiAssistModal() {
  try {
    assertChroniclesAiReady("assist");
  } catch (error) {
    setText(elements.postStatus, error.message || "AI Assist is not ready.");
    return;
  }
  state.aiAssistResult = "";
  if (elements.aiAssistPreview) elements.aiAssistPreview.value = "";
  if (elements.aiAssistMode) elements.aiAssistMode.value = "polish";
  setText(elements.aiAssistStatus, "");
  elements.aiAssistInsert?.setAttribute("disabled", "disabled");
  elements.aiAssistReplace?.setAttribute("disabled", "disabled");
  showBootstrapModal("chroniclesAiAssistModal");
}

async function generateAiAssist() {
  const draft = readValue("chroniclesPostBody");
  if (!draft) {
    setText(elements.aiAssistStatus, "Write notes or a draft before using AI Assist.");
    return;
  }

  const world = getWorld(readValue("chroniclesPostWorld") || state.selectedWorldId);
  const thread = world ? getThread(world.id, readValue("chroniclesPostThread") || state.selectedThreadId) : null;
  const button = elements.aiAssistGenerate;
  if (button) {
    button.disabled = true;
    button.textContent = "Generating...";
  }
  setText(elements.aiAssistStatus, "Routing draft through Nexus AI...");

  try {
    const result = await callChroniclesAi({
      action: "assist",
      mode: elements.aiAssistMode?.value || "polish",
      draft,
      worldTitle: world?.title || "",
      threadTitle: thread?.title || "",
      authorName: getDisplayName()
    }, "assist");

    state.aiAssistResult = String(result.result || "").trim();
    if (!state.aiAssistResult) throw new Error("AI Assist returned an empty result.");
    if (elements.aiAssistPreview) elements.aiAssistPreview.value = state.aiAssistResult;
    elements.aiAssistInsert?.removeAttribute("disabled");
    elements.aiAssistReplace?.removeAttribute("disabled");
    setText(elements.aiAssistStatus, `${result.label || "AI Assist"} complete. Review before using it.`);
  } catch (error) {
    setText(elements.aiAssistStatus, error.message || "AI Assist failed.");
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Generate";
    }
  }
}

function useAiAssistResult(mode = "replace") {
  const textarea = document.getElementById("chroniclesPostBody");
  const result = state.aiAssistResult || elements.aiAssistPreview?.value || "";
  if (!textarea || !result.trim()) return;

  if (mode === "insert") {
    const spacer = textarea.value.trim() ? "\n\n" : "";
    textarea.value = `${textarea.value}${spacer}${result.trim()}`;
  } else {
    textarea.value = result.trim();
  }

  textarea.focus();
  if (elements.postPreview && !elements.postPreview.classList.contains("d-none")) renderPostPreview(true);
  hideBootstrapModal("chroniclesAiAssistModal");
  setText(elements.postStatus, mode === "insert" ? "AI draft inserted below." : "AI draft replaced the editor text.");
}

async function handlePostSubmit(event) {
  event.preventDefault();
  if (!state.user) return;
  const worldId = readValue("chroniclesPostWorld");
  const threadId = readValue("chroniclesPostThread");
  const body = readValue("chroniclesPostBody");
  if (!worldId || !threadId || !body) {
    setText(elements.postStatus, "World, thread, and post body are required.");
    return;
  }

  setText(elements.postStatus, "Saving transmission...");

  try {
    const attachments = await collectPostAttachments(worldId, threadId);
    const postType = state.isAdmin ? readValue("chroniclesPostType") || state.editingPost?.postType || "player" : state.editingPost?.postType || "player";
    const override = state.isAdmin ? readValue("chroniclesPostAuthor") : "";
    const ownerOverride = state.isAdmin ? readValue("chroniclesPostOwner") : "";
    const systemAuthor = postType === "narrator" ? "Narrator" : postType === "location-description" ? "Location Archive" : "";
    const selectedCharacterRaw = postType === "player" ? getCharacter(readValue("chroniclesPostCharacter")) : null;
    const selectedCharacter = selectedCharacterRaw && canUseCharacterVoice(selectedCharacterRaw) ? selectedCharacterRaw : null;
    const authorName = override || systemAuthor || selectedCharacter?.name || state.editingPost?.authorName || getDisplayName();
    const ownerDisplayName = ownerOverride || (systemAuthor ? "Chronicle Custodian" : "") || selectedCharacter?.ownerDisplayName || state.editingPost?.ownerDisplayName || authorName;
    const postId = state.editingPost?.id || push(ref(database, `chronicles/posts/${worldId}/${threadId}`)).key;
    const originalWorldId = state.editingPost?.worldId || "";
    const originalThreadId = state.editingPost?.threadId || "";
    const isMovingPost = Boolean(state.editingPost && originalWorldId && originalThreadId && (originalWorldId !== worldId || originalThreadId !== threadId));
    const payload = {
      ...(state.editingPost || {}),
      id: postId,
      uid: state.editingPost?.uid || state.user.uid,
      worldId,
      threadId,
      ownerDisplayName,
      authorName,
      characterId: selectedCharacter?.id || "",
      characterDisplayName: selectedCharacter?.name || "",
      postType,
      allowCharacterEffects: readCheckbox("chroniclesAllowCharacterEffects"),
      title: readValue("chroniclesPostTitle"),
      body,
      attachments,
      editorMode: Boolean(override || systemAuthor || state.editingPost?.editorMode),
      excludeFromStory: postType === "location-description",
      createdAt: state.editingPost?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    const writes = {
      [`chronicles/posts/${worldId}/${threadId}/${postId}`]: payload
    };

    if (isMovingPost) {
      writes[`chronicles/posts/${originalWorldId}/${originalThreadId}/${postId}`] = null;
      if (hasDefaultPost(originalWorldId, originalThreadId, postId)) {
        writes[`chronicles/deletedPosts/${originalWorldId}/${originalThreadId}/${postId}`] = true;
      }
    }

    await update(ref(database), writes);
    state.selectedWorldId = worldId;
    state.selectedThreadId = threadId;
    state.storyWorldId = worldId;
    state.editingPost = null;
    state.editingAttachments = [];
    hideBootstrapModal("chroniclesPostModal");
    showView("dashboard");
    queueAutoSummaryRefresh(worldId);
    if (isMovingPost && originalWorldId && originalWorldId !== worldId) {
      queueAutoSummaryRefresh(originalWorldId);
    }
  } catch (error) {
    setText(elements.postStatus, error.message || "Post failed.");
  }
}

async function handleCodexSubmit(event) {
  event.preventDefault();
  if (!state.user) return;
  const character = getCharacter(readValue("chroniclesCodexCharacter"));
  const title = readValue("chroniclesCodexTitle");
  const body = readValue("chroniclesCodexBody");
  if (!character || !title || !body) {
    setText(elements.codexStatus, "Character, title, and codex text are required.");
    return;
  }
  if (!canEditCharacter(character) || (state.editingCodex && !canEditChronicleRecord(state.editingCodex))) {
    setText(elements.codexStatus, "You do not have clearance to edit this codex record.");
    return;
  }

  const recordId = state.editingCodex?.id || push(ref(database, "chronicles/codex")).key;
  const ownerUid = state.editingCodex?.characterId === character.id
    ? state.editingCodex.uid || (character.uid && character.uid !== "seed" ? character.uid : state.user.uid)
    : (character.uid && character.uid !== "seed" ? character.uid : state.user.uid);
  const payload = {
    ...(state.editingCodex || {}),
    id: recordId,
    characterId: character.id,
    worldId: character.worldId || state.selectedWorldId,
    uid: ownerUid,
    ownerDisplayName: character.ownerDisplayName || getDisplayName(),
    title,
    category: readValue("chroniclesCodexCategory") || "Field Note",
    summary: readValue("chroniclesCodexSummary"),
    tags: parseTags(readValue("chroniclesCodexTags")),
    body,
    visibility: "public",
    createdAt: state.editingCodex?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  setText(elements.codexStatus, "Saving codex record...");
  try {
    await set(ref(database, `chronicles/codex/${recordId}`), payload);
    state.selectedCharacterId = character.id;
    state.dossierTab = "codex";
    state.editingCodex = null;
    hideBootstrapModal("chroniclesCodexModal");
    renderAll();
  } catch (error) {
    setText(elements.codexStatus, error.message || "Codex save failed.");
  }
}

async function handleEchoSubmit(event) {
  event.preventDefault();
  if (!state.user) return;
  const character = getCharacter(readValue("chroniclesEchoCharacter"));
  const title = readValue("chroniclesEchoTitle");
  const body = readValue("chroniclesEchoBody");
  if (!character || !title || !body) {
    setText(elements.echoStatus, "Character, title, and Echo text are required.");
    return;
  }
  if (!canEditCharacter(character) || (state.editingEcho && !canEditChronicleRecord(state.editingEcho))) {
    setText(elements.echoStatus, "You do not have clearance to edit this Echo.");
    return;
  }

  const recordId = state.editingEcho?.id || push(ref(database, "chronicles/echoes")).key;
  const ownerUid = state.editingEcho?.characterId === character.id
    ? state.editingEcho.uid || (character.uid && character.uid !== "seed" ? character.uid : state.user.uid)
    : (character.uid && character.uid !== "seed" ? character.uid : state.user.uid);
  const payload = {
    ...(state.editingEcho || {}),
    id: recordId,
    characterId: character.id,
    worldId: character.worldId || state.selectedWorldId,
    uid: ownerUid,
    ownerDisplayName: character.ownerDisplayName || getDisplayName(),
    title,
    status: readValue("chroniclesEchoStatusInput") || "public",
    canonStatus: readValue("chroniclesEchoCanonStatus") || "canon",
    timeline: readValue("chroniclesEchoTimeline"),
    location: readValue("chroniclesEchoLocation"),
    coverImage: normalizeDossierUrl(readValue("chroniclesEchoCover")),
    summary: readValue("chroniclesEchoSummary"),
    body,
    createdAt: state.editingEcho?.createdAt || Date.now(),
    updatedAt: Date.now()
  };

  setText(elements.echoStatus, "Saving Echo...");
  try {
    await set(ref(database, `chronicles/echoes/${recordId}`), payload);
    state.selectedCharacterId = character.id;
    state.dossierTab = "echoes";
    state.editingEcho = null;
    hideBootstrapModal("chroniclesEchoModal");
    renderAll();
  } catch (error) {
    setText(elements.echoStatus, error.message || "Echo save failed.");
  }
}

async function handleCharacterSubmit(event) {
  event.preventDefault();
  if (!state.user) return;
  const name = readValue("chroniclesCharacterName");
  const worldId = readValue("chroniclesCharacterWorld");
  if (!name || !worldId) {
    setText(elements.characterStatus, "World and character name are required.");
    return;
  }

  const ownerDisplayName = state.isAdmin ? readValue("chroniclesCharacterOwner") || getDisplayName() : getDisplayName();
  const ownerUid = state.isAdmin ? readValue("chroniclesCharacterOwnerUid") || state.user.uid : state.user.uid;
  const location = readValue("chroniclesCharacterLocation");
  const arcTitle = readValue("chroniclesCharacterArc");
  const objective = readValue("chroniclesCharacterObjective");
  const condition = readValue("chroniclesCharacterStatusInput") || "Active";
  const affiliation = readValue("chroniclesCharacterAffiliation");
  const characterRef = push(ref(database, "chronicles/characters"));
  setText(elements.characterStatus, "Saving character...");
  try {
    const portrait = await readPortraitUpload("chroniclesCharacterImage");
    const gallery = parseDossierUrlItems(readValue("chroniclesCharacterGalleryUrls"), "image");
    const audio = parseDossierUrlItems(readValue("chroniclesCharacterAudioUrls"), "audio");
    const relationships = parseDossierConnections(readValue("chroniclesCharacterConnections"));
    const archiveFiles = parseDossierUrlItems(readValue("chroniclesCharacterArchiveUrls"), "archive");
    await set(characterRef, {
      id: characterRef.key,
      uid: ownerUid,
      ownerDisplayName,
      worldId,
      name,
      species: readValue("chroniclesCharacterSpecies"),
      age: readValue("chroniclesCharacterAge"),
      role: readValue("chroniclesCharacterRole"),
      alignment: readValue("chroniclesCharacterAlignment"),
      affiliation,
      location,
      arcTitle,
      objective,
      image: portrait,
      gallery,
      audio,
      relationships,
      archiveFiles,
      files: archiveFiles,
      origin: readValue("chroniclesCharacterOrigin"),
      equipment: readValue("chroniclesCharacterEquipment"),
      skills: readValue("chroniclesCharacterSkills"),
      personality: readValue("chroniclesCharacterPersonality"),
      hooks: readValue("chroniclesCharacterHooks"),
      writingPreference: readValue("chroniclesCharacterWritingPreference"),
      consentBoundary: readValue("chroniclesCharacterConsentBoundary"),
      postingPace: readValue("chroniclesCharacterPostingPace"),
      oocNotes: readValue("chroniclesCharacterOocNotes"),
      status: condition,
      currentState: {
        location,
        arcTitle,
        objective,
        condition,
        affiliation
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.selectedWorldId = worldId;
    hideBootstrapModal("chroniclesCharacterModal");
  } catch (error) {
    setText(elements.characterStatus, error.message || "Character save failed.");
  }
}

async function handleLoreSave() {
  const world = getWorld(state.selectedLoreWorldId);
  if (!world || !state.isAdmin) return;
  setText(elements.loreStatus, "Saving lore...");

  try {
    await set(ref(database, `chronicles/worlds/${world.id}`), {
      ...world,
      title: readValue("chroniclesLoreTitleInput"),
      genre: readValue("chroniclesLoreGenreInput"),
      status: readValue("chroniclesLoreStatusInput") || "Active",
      image: readValue("chroniclesLoreImageInput"),
      description: readValue("chroniclesLoreDescriptionInput"),
      lore: readValue("chroniclesLoreBodyInput"),
      createdBy: world.createdBy || state.user.uid,
      createdAt: world.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    state.loreEditing = false;
    setText(elements.loreStatus, "Lore saved.");
    renderLoreModal();
  } catch (error) {
    setText(elements.loreStatus, error.message || "Lore save failed.");
  }
}

async function handleCharacterDetailSave() {
  const character = getCharacter(state.selectedCharacterId);
  if (!character || !canEditCharacter(character)) return;
  setText(elements.characterDetailStatus, "Saving character...");

  try {
    const current = getCharacterCurrentState(character);
    const location = current.location;
    const locationThreadId = current.thread?.id || "";
    const arcTitle = readValue("chroniclesCharacterEditArc");
    const objective = readValue("chroniclesCharacterEditObjective");
    const condition = readValue("chroniclesCharacterEditStatusInput") || character.status || "Active";
    const affiliation = readValue("chroniclesCharacterEditAffiliation");
    const portrait = await readPortraitUpload("chroniclesCharacterEditImage", character.image || "");
    const gallery = parseDossierUrlItems(readValue("chroniclesCharacterEditGalleryUrls"), "image");
    const audio = parseDossierUrlItems(readValue("chroniclesCharacterEditAudioUrls"), "audio");
    const relationships = parseDossierConnections(readValue("chroniclesCharacterEditConnections"));
    const archiveFiles = parseDossierUrlItems(readValue("chroniclesCharacterEditArchiveUrls"), "archive");
    await set(ref(database, `chronicles/characters/${character.id}`), {
      ...character,
      uid: state.isAdmin ? readValue("chroniclesCharacterEditOwnerUid") || (character.uid === "seed" ? state.user.uid : character.uid) : character.uid,
      ownerDisplayName: state.isAdmin ? readValue("chroniclesCharacterEditOwner") || character.ownerDisplayName || getDisplayName() : character.ownerDisplayName || getDisplayName(),
      worldId: readValue("chroniclesCharacterEditWorld"),
      name: readValue("chroniclesCharacterEditName"),
      species: readValue("chroniclesCharacterEditSpecies"),
      age: readValue("chroniclesCharacterEditAge"),
      role: readValue("chroniclesCharacterEditRole"),
      alignment: readValue("chroniclesCharacterEditAlignment"),
      affiliation,
      location,
      arcTitle,
      objective,
      image: portrait,
      gallery,
      audio,
      relationships,
      archiveFiles,
      files: archiveFiles,
      origin: readValue("chroniclesCharacterEditOrigin"),
      equipment: readValue("chroniclesCharacterEditEquipment"),
      skills: readValue("chroniclesCharacterEditSkills"),
      personality: readValue("chroniclesCharacterEditPersonality"),
      hooks: readValue("chroniclesCharacterEditHooks"),
      writingPreference: readValue("chroniclesCharacterEditWritingPreference"),
      consentBoundary: readValue("chroniclesCharacterEditConsentBoundary"),
      postingPace: readValue("chroniclesCharacterEditPostingPace"),
      oocNotes: readValue("chroniclesCharacterEditOocNotes"),
      status: condition,
      currentState: {
        ...(character.currentState || {}),
        location,
        locationThreadId,
        arcTitle,
        objective,
        condition,
        affiliation
      },
      createdAt: character.createdAt || Date.now(),
      updatedAt: Date.now()
    });
    state.characterEditing = false;
    setText(elements.characterDetailStatus, "Character saved.");
    renderCharacterDetailModal();
  } catch (error) {
    setText(elements.characterDetailStatus, error.message || "Character save failed.");
  }
}

async function collectPostAttachments(worldId, threadId) {
  const attachments = [...state.editingAttachments];
  const url = readValue("chroniclesPostImageUrl");
  if (url) {
    attachments.push({
      title: "Linked image",
      url,
      storagePath: "",
      type: "image"
    });
  }

  const fileInput = document.getElementById("chroniclesPostImageFile");
  const files = [...(fileInput?.files || [])].slice(0, 6);
  for (const file of files) {
    attachments.push(await uploadPostImageAsset({ file, worldId, threadId }));
  }
  return attachments;
}

async function uploadPostImageAsset({ file, worldId, threadId }) {
  if (!file.type.startsWith("image/")) throw new Error("Only image attachments are supported.");
  if (file.size > 1024 * 1024) {
    throw new Error("Chronicle image attachments must be 1 MB or smaller when stored in Realtime Database.");
  }
  const url = await readFileAsDataUrl(file);
  return {
    title: file.name || "Attached image",
    url,
    storagePath: "",
    contentType: file.type || "image/jpeg",
    worldId,
    threadId,
    type: "image"
  };
}

function normalizeDossierMediaItems(value, mediaType = "") {
  const items = Array.isArray(value) ? value : toArray(value);
  return items
    .map((item) => {
      const url = normalizeDossierUrl(item?.url || item?.image || item?.downloadURL);
      return item && url ? { ...item, url } : item;
    })
    .filter((item) => item && item.url)
    .filter((item) => !mediaType || item.type === mediaType || !item.type)
    .sort((a, b) => Number(a.order ?? a.sortOrder ?? 0) - Number(b.order ?? b.sortOrder ?? 0));
}

function normalizeDossierConnections(value) {
  const items = Array.isArray(value) ? value : toArray(value);
  return items
    .filter((item) => item && (item.targetCharacterId || item.externalName || item.name))
    .sort((a, b) => Number(a.order ?? a.sortOrder ?? 0) - Number(b.order ?? b.sortOrder ?? 0));
}

function parseDossierConnections(value) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const [rawName, rawType, rawStatus, ...noteParts] = line.split("|").map((part) => part.trim());
    if (!rawName) throw new Error("Connection entries need a character or external name.");
    const target = findCharacterByReference(rawName);
    const label = target?.name || rawName;
    return {
      id: `connection-${slugify(label) || "signal"}-${index + 1}`,
      targetCharacterId: target?.id || "",
      externalName: target ? "" : rawName,
      type: rawType || "Connection",
      status: rawStatus || "Status not recorded",
      note: noteParts.join(" | ").trim(),
      order: (index + 1) * 10,
      visibility: "public"
    };
  });
}

function serializeDossierConnections(value) {
  return normalizeDossierConnections(value).map((connection) => {
    const target = getCharacter(connection.targetCharacterId);
    const parts = [
      target?.name || connection.externalName || connection.name || connection.targetCharacterId || "",
      connection.type || "",
      connection.status || "",
      connection.note || ""
    ];
    while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
    return parts.join(" | ").trim();
  }).join("\n");
}

function findCharacterByReference(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  const normalized = normalizeLookup(raw);
  return getCharacters().find((character) => (
    character.id === raw
    || normalizeLookup(character.id) === normalized
    || characterAliases(character).includes(normalized)
  )) || null;
}

function parseDossierUrlItems(value, mediaType) {
  const lines = String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.map((line, index) => {
    const [rawUrl, rawTitle, rawCaption, rawAudioType, rawPlayUrl, rawPinned] = line.split("|").map((part) => part.trim());
    const url = normalizeDossierUrl(rawUrl);
    if (!isHttpUrl(url)) {
      const label = mediaType === "audio" ? "Audio" : mediaType === "archive" ? "Archive" : "Gallery";
      throw new Error(`${label} entries must be full http or https URLs.`);
    }
    const title = rawTitle || titleFromUrl(url) || (mediaType === "audio" ? "Audio Signal" : "Gallery Image");
    const item = {
      id: `${mediaType}-${slugify(title) || "signal"}-${index + 1}`,
      url,
      title,
      caption: rawCaption || "",
      type: mediaType,
      order: (index + 1) * 10
    };
    if (mediaType === "audio") {
      item.audioType = normalizeAudioType(rawAudioType);
      const playUrl = normalizeDossierUrl(rawPlayUrl);
      if (playUrl) {
        if (!isHttpUrl(playUrl) && !playUrl.startsWith("data:audio/")) {
          throw new Error("Audio playback URLs must be full http, https, or data audio URLs.");
        }
        item.playUrl = playUrl;
      }
      item.pinned = /^(true|yes|1|pin|pinned|header)$/i.test(rawPinned || "");
    } else if (mediaType === "archive") {
      item.fileType = normalizeArchiveType(rawAudioType);
    }
    return item;
  });
}

function serializeDossierUrlItems(value, mediaType) {
  return normalizeDossierMediaItems(value, mediaType).map((item) => {
    const parts = [
      item.url || item.image || item.downloadURL || "",
      item.title || "",
      item.caption || ""
    ];
    if (mediaType === "audio") {
      parts.push(item.audioType || "other");
      const playUrl = item.playUrl || item.streamUrl || item.audioUrl || "";
      const pinned = item.pinned === true;
      if (playUrl || pinned) parts.push(playUrl);
      if (pinned) parts.push("pinned");
    }
    if (mediaType === "archive") parts.push(item.fileType || item.mimeType || "reference");
    while (parts.length > 1 && !parts[parts.length - 1]) parts.pop();
    return parts.join(" | ").trim();
  }).join("\n");
}

function normalizeAudioType(value) {
  const next = String(value || "other").trim().toLowerCase();
  return CHRONICLES_AUDIO_TYPES.has(next) ? next : "other";
}

function isPlayableAudioUrl(value) {
  const url = normalizeDossierUrl(value);
  if (url.startsWith("data:audio/")) return true;
  try {
    const parsed = new URL(url);
    return /\.(mp3|m4a|aac|wav|ogg|oga|webm)$/i.test(parsed.pathname);
  } catch {
    return /\.(mp3|m4a|aac|wav|ogg|oga|webm)(\?.*)?$/i.test(url);
  }
}

function getPlayableDossierAudioUrl(item) {
  const explicit = normalizeDossierUrl(item?.playUrl || item?.streamUrl || item?.audioUrl);
  if (explicit && isPlayableAudioUrl(explicit)) return explicit;
  const source = normalizeDossierUrl(item?.url || item?.image || item?.downloadURL);
  return isPlayableAudioUrl(source) ? source : "";
}

function getDossierAudioResolverRequestUrl(sourceUrl) {
  const base = normalizeDossierUrl(CHRONICLES_AUDIO_RESOLVER_URL);
  if (!base || !isHttpUrl(base)) return "";
  try {
    const requestUrl = new URL(base);
    requestUrl.searchParams.set("url", sourceUrl);
    return requestUrl.toString();
  } catch {
    return "";
  }
}

async function resolveDossierAudioUrl(sourceUrl) {
  const source = normalizeDossierUrl(sourceUrl);
  if (!source) throw new Error("Missing dossier audio source URL.");
  if (isPlayableAudioUrl(source)) {
    return { playUrl: source, title: "", source: "direct" };
  }
  if (state.audioResolveCache.has(source)) return state.audioResolveCache.get(source);
  if (state.audioResolvePending.has(source)) return state.audioResolvePending.get(source);

  const requestUrl = getDossierAudioResolverRequestUrl(source);
  if (!requestUrl) throw new Error("Dossier audio resolver is not configured.");

  const pending = fetch(requestUrl, { headers: { Accept: "application/json" } })
    .then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload.ok || !payload.playUrl) {
        throw new Error(payload.error || "Audio resolver could not find a playable file.");
      }
      const playUrl = normalizeDossierUrl(payload.playUrl);
      if (!isPlayableAudioUrl(playUrl)) throw new Error("Resolved audio URL is not a playable audio file.");
      const resolved = {
        playUrl,
        title: payload.title || "",
        candidates: Array.isArray(payload.candidates) ? payload.candidates : [],
        source: payload.source || ""
      };
      state.audioResolveCache.set(source, resolved);
      return resolved;
    })
    .finally(() => state.audioResolvePending.delete(source));

  state.audioResolvePending.set(source, pending);
  return pending;
}

function findDossierAudioItem(character, audioId, sourceUrl) {
  const source = normalizeDossierUrl(sourceUrl);
  return normalizeDossierMediaItems(character?.audio || character?.audioFiles, "audio")
    .find((item) => item.id === audioId || normalizeDossierUrl(item.url || item.image || item.downloadURL) === source) || null;
}

function applyResolvedDossierAudioElement(container, resolved) {
  const playUrl = normalizeDossierUrl(resolved?.playUrl);
  if (!container || !playUrl) return;

  container.dataset.chroniclesAudioResolved = "true";
  container.classList.remove("is-external");

  const hiddenButton = container.querySelector("[data-chronicles-dossier-audio]");
  if (hiddenButton) {
    hiddenButton.dataset.chroniclesDossierAudio = playUrl;
    hiddenButton.disabled = false;
    hiddenButton.removeAttribute("title");
  }

  let player = container.querySelector("audio");
  if (!player) {
    player = document.createElement("audio");
    player.preload = "none";
    container.appendChild(player);
  }
  player.src = playUrl;
  if (container.classList.contains("chronicles-dossier-audio-card")) player.controls = true;

  const note = container.querySelector(".chronicles-audio-note");
  if (note) note.replaceWith(player);

  const seek = container.closest(".chronicles-dossier-audio-card")?.querySelector("[data-chronicles-audio-seek]");
  if (seek) seek.disabled = false;

  const caption = container.querySelector("[data-chronicles-audio-caption]");
  if (caption) caption.textContent = caption.dataset.chroniclesAudioCaption || "Dossier audio";
  syncDossierAudioControls();
}

function applyFailedDossierAudioResolution(container, error) {
  const caption = container?.querySelector("[data-chronicles-audio-caption]");
  if (caption) caption.textContent = error?.message || "Audio source needs a direct file link.";
  const note = container?.querySelector(".chronicles-audio-note");
  if (note) note.textContent = "Audio source could not be resolved. Use Open Audio or add a direct MP3 URL.";
}

function applyResolvedDossierAudioForSource(characterId, sourceUrl, resolved) {
  const source = normalizeDossierUrl(sourceUrl);
  elements.dossierShell?.querySelectorAll("[data-chronicles-audio-source]").forEach((container) => {
    if (container.dataset.chroniclesCharacterId !== characterId) return;
    if (normalizeDossierUrl(container.dataset.chroniclesAudioSource) !== source) return;
    applyResolvedDossierAudioElement(container, resolved);
  });
}

async function writeDossierAudioItems(characterId, items) {
  const next = normalizeDossierMediaItems(items, "audio");
  await update(ref(database), {
    [`chronicles/characters/${characterId}/audio`]: next,
    [`chronicles/characters/${characterId}/audioFiles`]: next,
    [`chronicles/characters/${characterId}/updatedAt`]: Date.now()
  });
}

async function persistDossierAudioPlayUrl(character, audioId, sourceUrl, resolved) {
  const playUrl = normalizeDossierUrl(resolved?.playUrl);
  if (!character || !canEditCharacter(character) || !playUrl) return;
  const source = normalizeDossierUrl(sourceUrl);
  const items = normalizeDossierMediaItems(character.audio || character.audioFiles, "audio");
  let changed = false;
  const next = items.map((item) => {
    const itemSource = normalizeDossierUrl(item.url || item.image || item.downloadURL);
    if (item.id !== audioId && itemSource !== source) return item;
    const nextItem = { ...item, playUrl };
    if ((!nextItem.title || /^audio signal$/i.test(nextItem.title)) && resolved.title) {
      nextItem.title = resolved.title.replace(/\s*\|\s*Suno\s*$/i, "").trim() || resolved.title;
    }
    changed = changed || nextItem.playUrl !== item.playUrl || nextItem.title !== item.title;
    return nextItem;
  });
  if (changed) await writeDossierAudioItems(character.id, next);
}

async function resolveDossierAudioSignal(container, character) {
  const sourceUrl = normalizeDossierUrl(container?.dataset?.chroniclesAudioSource);
  const audioId = container?.dataset?.chroniclesAudioId || "";
  if (!sourceUrl || !character) return;
  const item = findDossierAudioItem(character, audioId, sourceUrl);
  if (!item || getPlayableDossierAudioUrl(item)) return;

  const caption = container.querySelector("[data-chronicles-audio-caption]");
  if (caption) caption.textContent = "Resolving source audio...";

  try {
    const resolved = await resolveDossierAudioUrl(sourceUrl);
    applyResolvedDossierAudioForSource(character.id, sourceUrl, resolved);
    await persistDossierAudioPlayUrl(character, audioId, sourceUrl, resolved);
  } catch (error) {
    applyFailedDossierAudioResolution(container, error);
  }
}

function resolveDossierAudioSignals(character) {
  if (!character || !elements.dossierShell) return;
  const targets = [...elements.dossierShell.querySelectorAll("[data-chronicles-audio-source]")]
    .filter((container) => container.dataset.chroniclesCharacterId === character.id)
    .filter((container) => !container.dataset.chroniclesAudioResolved);
  targets.forEach((container) => {
    resolveDossierAudioSignal(container, character);
  });
}

async function toggleDossierAudioPin(route, button) {
  const [characterId, audioId] = String(route || "").split(":");
  const character = getCharacter(characterId);
  if (!character || !audioId || !canEditCharacter(character)) return;

  const items = normalizeDossierMediaItems(character.audio || character.audioFiles, "audio");
  const target = items.find((item) => item.id === audioId);
  if (!target) return;

  const shouldPin = target.pinned !== true;
  let carriedPinned = 0;
  const next = items.map((item) => {
    if (item.id === audioId) return { ...item, pinned: shouldPin };
    if (!shouldPin) return item;
    if (item.pinned === true && carriedPinned < 1) {
      carriedPinned += 1;
      return { ...item, pinned: true };
    }
    return { ...item, pinned: false };
  });

  const originalLabel = button?.textContent || "";
  if (button) {
    button.disabled = true;
    button.textContent = "Saving...";
  }
  try {
    await writeDossierAudioItems(character.id, next);
    setText(elements.characterDetailStatus, shouldPin ? "Audio pinned to dossier header." : "Audio unpinned from dossier header.");
  } catch (error) {
    setText(elements.characterDetailStatus, error.message || "Audio pin update failed.");
    if (button) {
      button.disabled = false;
      button.textContent = originalLabel;
    }
  }
}

function normalizeArchiveType(value) {
  const next = String(value || "reference").trim().toLowerCase();
  return next || "reference";
}

function normalizeDossierUrl(value) {
  let url = String(value || "").trim();
  if (!url) return "";
  const markdownLink = url.match(/^!?\[[^\]]*]\((https?:\/\/[^)\s]+)\)$/i);
  if (markdownLink) url = markdownLink[1].trim();
  const angleLink = url.match(/^<((?:https?:\/\/|data:(?:image|audio)\/)[^>]+)>$/i);
  if (angleLink) url = angleLink[1].trim();
  return url;
}

function isImageUrl(value) {
  const url = normalizeDossierUrl(value);
  if (url.startsWith("data:image/")) return true;
  try {
    const parsed = new URL(url);
    return /\.(jpe?g|png|webp|gif|avif|svg)$/i.test(parsed.pathname);
  } catch {
    return /\.(jpe?g|png|webp|gif|avif|svg)(\?.*)?$/i.test(url);
  }
}

function openMediaViewer(trigger) {
  const url = trigger?.dataset?.chroniclesMediaUrl || "";
  if (!url) return;
  const title = trigger.dataset.chroniclesMediaTitle || "Archive Image";
  const caption = trigger.dataset.chroniclesMediaCaption || "No caption recorded.";
  const image = document.getElementById("chroniclesMediaViewerImage");
  const heading = document.getElementById("chroniclesMediaViewerTitle");
  const captionTitle = document.getElementById("chroniclesMediaViewerCaptionTitle");
  const captionText = document.getElementById("chroniclesMediaViewerCaption");
  const link = document.getElementById("chroniclesMediaViewerLink");
  if (image) {
    image.referrerPolicy = "no-referrer";
    image.src = url;
    image.alt = title;
  }
  setText(heading, title);
  setText(captionTitle, title);
  setText(captionText, caption);
  if (link) link.href = url;
  showBootstrapModal("chroniclesMediaViewerModal");
}

function setDossierAudioButtonState(button, isPlaying) {
  if (!button) return;
  const signal = button.closest(".chronicles-dossier-audio-signal");
  button.setAttribute("aria-pressed", isPlaying ? "true" : "false");
  signal?.classList.toggle("is-playing", isPlaying);
}

function setDossierAudioStatus(button, message = "") {
  const signal = button?.closest(".chronicles-dossier-audio-signal");
  const caption = signal?.querySelector("[data-chronicles-audio-caption]");
  if (!caption) return;
  caption.textContent = message || caption.dataset.chroniclesAudioCaption || "Dossier audio";
}

function makeDossierAudioKey(characterId, audioId, playUrl) {
  return [characterId || "", audioId || "", normalizeDossierUrl(playUrl)].join("|");
}

function getDossierAudioSignalForControl(control) {
  return control?.closest(".chronicles-dossier-audio-signal")
    || control?.closest(".chronicles-dossier-audio-card")?.querySelector(".chronicles-dossier-audio-signal")
    || null;
}

function getDossierAudioTrackFromSignal(signal) {
  const button = signal?.querySelector("[data-chronicles-dossier-audio]");
  const playUrl = normalizeDossierUrl(button?.dataset.chroniclesDossierAudio || signal?.querySelector("audio")?.getAttribute("src") || "");
  if (!signal || !button || !playUrl) return null;
  return {
    characterId: signal.dataset.chroniclesCharacterId || "",
    audioId: signal.dataset.chroniclesAudioId || "",
    playUrl,
    key: makeDossierAudioKey(signal.dataset.chroniclesCharacterId, signal.dataset.chroniclesAudioId, playUrl)
  };
}

function ensureDossierAudioPlayer() {
  if (state.dossierAudioPlayer) return state.dossierAudioPlayer;
  const player = new Audio();
  player.preload = "metadata";
  player.addEventListener("timeupdate", syncDossierAudioControls);
  player.addEventListener("loadedmetadata", syncDossierAudioControls);
  player.addEventListener("durationchange", syncDossierAudioControls);
  player.addEventListener("play", syncDossierAudioControls);
  player.addEventListener("pause", syncDossierAudioControls);
  player.addEventListener("ended", syncDossierAudioControls);
  state.dossierAudioPlayer = player;
  return player;
}

function formatDossierAudioTime(seconds) {
  const safeSeconds = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = safeSeconds % 60;
  return `${minutes}:${String(remainder).padStart(2, "0")}`;
}

function syncDossierAudioControls() {
  const player = state.dossierAudioPlayer;
  const track = state.dossierAudioTrack;
  const isPlaying = Boolean(player && track && !player.paused && !player.ended);
  const duration = player && Number.isFinite(player.duration) ? player.duration : 0;
  const currentTime = player && Number.isFinite(player.currentTime) ? player.currentTime : 0;

  document.querySelectorAll("[data-chronicles-dossier-audio]").forEach((button) => {
    const buttonTrack = getDossierAudioTrackFromSignal(button.closest(".chronicles-dossier-audio-signal"));
    setDossierAudioButtonState(button, Boolean(buttonTrack && track && buttonTrack.key === track.key && isPlaying));
  });

  document.querySelectorAll("[data-chronicles-audio-seek]").forEach((input) => {
    const signal = getDossierAudioSignalForControl(input);
    const inputTrack = getDossierAudioTrackFromSignal(signal);
    const isCurrent = Boolean(inputTrack && track && inputTrack.key === track.key);
    const currentLabel = input.closest("[data-chronicles-audio-seek-panel]")?.querySelector("[data-chronicles-audio-current]");
    const durationLabel = input.closest("[data-chronicles-audio-seek-panel]")?.querySelector("[data-chronicles-audio-duration]");

    input.disabled = !inputTrack?.playUrl;
    input.max = duration ? String(Math.round(duration * 1000)) : "1000";
    input.value = isCurrent && duration ? String(Math.round(currentTime * 1000)) : "0";
    if (currentLabel) currentLabel.textContent = isCurrent ? formatDossierAudioTime(currentTime) : "0:00";
    if (durationLabel) durationLabel.textContent = isCurrent ? formatDossierAudioTime(duration) : "0:00";
  });
}

function stopDossierAudio() {
  const player = state.dossierAudioPlayer;
  if (player) {
    player.pause();
    player.removeAttribute("src");
    player.load();
  }
  state.dossierAudioTrack = null;
  syncDossierAudioControls();
}

function seekDossierAudio(input) {
  const signal = getDossierAudioSignalForControl(input);
  const track = getDossierAudioTrackFromSignal(signal);
  if (!track) return;
  const player = ensureDossierAudioPlayer();
  const wasPlaying = state.dossierAudioTrack?.key === track.key && !player.paused && !player.ended;
  if (state.dossierAudioTrack?.key !== track.key) {
    player.pause();
    player.src = track.playUrl;
    state.dossierAudioTrack = track;
    player.load();
  }
  const nextTime = Math.max(0, Number(input.value || 0) / 1000);
  const applySeek = () => {
    const duration = Number.isFinite(player.duration) ? player.duration : nextTime;
    player.currentTime = Math.min(nextTime, duration || nextTime);
    syncDossierAudioControls();
    if (wasPlaying) player.play().catch(() => syncDossierAudioControls());
  };
  if (player.readyState >= 1) {
    applySeek();
  } else {
    player.addEventListener("loadedmetadata", applySeek, { once: true });
  }
}

function toggleDossierAudio(button) {
  const signal = button.closest(".chronicles-dossier-audio-signal");
  const track = getDossierAudioTrackFromSignal(signal);
  if (!track) return;
  const player = ensureDossierAudioPlayer();
  const isCurrentTrack = state.dossierAudioTrack?.key === track.key;
  const wasPlaying = isCurrentTrack && !player.paused && !player.ended;

  if (wasPlaying) {
    player.pause();
    setDossierAudioStatus(button);
    syncDossierAudioControls();
    return;
  }

  if (!isCurrentTrack) {
    player.pause();
    player.src = track.playUrl;
    state.dossierAudioTrack = track;
  }

  setDossierAudioStatus(button, "Routing audio signal...");
  player.play()
    .then(() => {
      setDossierAudioStatus(button);
      syncDossierAudioControls();
    })
    .catch(() => {
      setDossierAudioStatus(button, "Playback blocked / use Open for source");
      syncDossierAudioControls();
    });
}

function titleFromUrl(value) {
  try {
    const url = new URL(value);
    const fileName = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() || "");
    return fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  } catch {
    return "";
  }
}

function isHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function clearFileInput(id) {
  const input = document.getElementById(id);
  if (input) input.value = "";
}

function getFileInputFile(id) {
  return document.getElementById(id)?.files?.[0] || null;
}

function isSupportedPortraitFile(file) {
  return CHRONICLES_PORTRAIT_TYPES.has(file.type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name || "");
}

async function readPortraitUpload(inputId, existingValue = "") {
  const file = getFileInputFile(inputId);
  if (!file) return existingValue;
  if (!isSupportedPortraitFile(file)) {
    throw new Error("Portrait uploads must be JPEG, PNG, WebP, or GIF.");
  }
  if (file.size > CHRONICLES_PORTRAIT_MAX_BYTES) {
    throw new Error("Portrait uploads must be 1 MB or smaller for Realtime Database storage.");
  }
  return readFileAsDataUrl(file);
}

function renderPortraitUploadPreview(inputId, previewId, fallbackUrl = "") {
  const preview = document.getElementById(previewId);
  if (!preview) return;
  const file = getFileInputFile(inputId);
  if (file && !isSupportedPortraitFile(file)) {
    preview.innerHTML = "<span>Unsupported portrait type. Use JPEG, PNG, WebP, or GIF.</span>";
    return;
  }
  if (file && file.size > CHRONICLES_PORTRAIT_MAX_BYTES) {
    preview.innerHTML = "<span>Portrait is over 1 MB. Compress it before saving to RTDB.</span>";
    return;
  }

  let source = fallbackUrl;
  let caption = fallbackUrl ? "Current portrait retained." : "No portrait selected.";
  let objectUrl = "";
  if (file) {
    objectUrl = URL.createObjectURL(file);
    source = objectUrl;
    caption = `Queued portrait: ${file.name}`;
  }

  preview.innerHTML = source
    ? `<img src="${escapeAttr(source)}" alt=""><span>${escapeHtml(caption)}</span>`
    : `<span>${escapeHtml(caption)}</span>`;
  if (objectUrl) {
    preview.querySelector("img")?.addEventListener("load", () => URL.revokeObjectURL(objectUrl), { once: true });
  }
}

function confirmChroniclesAction(message, title = "Confirm Action", confirmLabel = "Confirm") {
  return new Promise((resolve) => {
    let dialog = document.getElementById("chroniclesConfirmDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "chroniclesConfirmDialog";
      dialog.className = "relay-confirm-dialog";
      document.body.appendChild(dialog);
    }

    if (dialog.open) {
      dialog.close("cancel");
    }
    dialog.returnValue = "";
    dialog.innerHTML = `
      <form method="dialog">
        <div>
          <p class="banri-modal-kicker">Chronicle Confirmation</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
        <footer>
          <button class="relay-confirm-button relay-confirm-button--ghost" type="submit" value="cancel">Cancel</button>
          <button class="relay-confirm-button relay-confirm-button--danger" type="submit" value="confirm">${escapeHtml(confirmLabel)}</button>
        </footer>
      </form>
    `;

    const closeHandler = () => {
      dialog.removeEventListener("close", closeHandler);
      resolve(dialog.returnValue === "confirm");
    };

    dialog.addEventListener("close", closeHandler, { once: true });
    dialog.showModal();
  });
}

function hidePostLocally(post) {
  if (!post?.worldId || !post?.threadId || !post?.id) return;
  const threadPosts = state.remotePosts?.[post.worldId]?.[post.threadId];
  if (threadPosts && typeof threadPosts === "object") {
    delete threadPosts[post.id];
  }
  state.deletedPosts[post.worldId] ||= {};
  state.deletedPosts[post.worldId][post.threadId] ||= {};
  state.deletedPosts[post.worldId][post.threadId][post.id] = true;
}

async function deletePost(post) {
  if (!post || !canEditPost(post)) return;
  const label = post.title || trimForQuote(post.body) || "this post";
  if (!await confirmChroniclesAction(`Delete "${label}" from ${post.threadTitle || "this thread"}?`, "Delete Post", "Delete")) return;

  hidePostLocally(post);
  renderAll();

  try {
    const writes = [remove(ref(database, `chronicles/posts/${post.worldId}/${post.threadId}/${post.id}`))];
    if (state.isAdmin) {
      writes.push(set(ref(database, `chronicles/deletedPosts/${post.worldId}/${post.threadId}/${post.id}`), true));
    }
    await Promise.all(writes);
    renderAll();
  } catch (error) {
    console.error(error);
  }
}

async function deleteThread(route) {
  if (!state.isAdmin) return;
  const { worldId, threadId } = parseThreadRoute(route);
  const world = getWorld(worldId);
  const thread = world ? getThread(world.id, threadId) : null;
  if (!world || !thread) return;
  const posts = getPostsForThread(world.id, thread.id);
  if (!await confirmChroniclesAction(`Delete "${thread.title}" and ${posts.length} post${posts.length === 1 ? "" : "s"}?`, "Delete Thread", "Delete")) return;

  try {
    await Promise.all([
      remove(ref(database, `chronicles/threads/${world.id}/${thread.id}`)),
      remove(ref(database, `chronicles/posts/${world.id}/${thread.id}`)),
      set(ref(database, `chronicles/deletedThreads/${world.id}/${thread.id}`), true)
    ]);
    state.worldListMode = "selected";
    state.selectedThreadId = getThreadsForWorld(world.id).find((item) => item.id !== thread.id)?.id || "";
    showView("worlds");
    renderAll();
  } catch (error) {
    console.error(error);
  }
}

async function deleteCodexEntry(entryId) {
  const entry = getCodexEntry(entryId);
  if (!entry || !canEditChronicleRecord(entry)) return;
  if (!await confirmChroniclesAction(`Delete codex record "${entry.title || "Untitled"}"?`, "Delete Codex", "Delete")) return;

  try {
    await remove(ref(database, `chronicles/codex/${entry.id}`));
    if (state.editingCodex?.id === entry.id) state.editingCodex = null;
    renderAll();
  } catch (error) {
    setText(elements.codexStatus, error.message || "Codex delete failed.");
  }
}

async function deleteEcho(entryId) {
  const entry = getEcho(entryId);
  if (!entry || !canEditChronicleRecord(entry)) return;
  if (!await confirmChroniclesAction(`Delete Echo "${entry.title || "Untitled"}"?`, "Delete Echo", "Delete")) return;

  try {
    await remove(ref(database, `chronicles/echoes/${entry.id}`));
    if (state.editingEcho?.id === entry.id) state.editingEcho = null;
    renderAll();
  } catch (error) {
    setText(elements.echoStatus, error.message || "Echo delete failed.");
  }
}

function bindEvents() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-chronicles-open]");
    const viewButton = event.target.closest("[data-chronicles-view-button], [data-chronicles-view-jump]");
    const worldOpen = event.target.closest("[data-chronicles-open-world]");
    const storyOpen = event.target.closest("[data-chronicles-open-story]");
    const loreOpen = event.target.closest("[data-chronicles-open-lore]");
    const threadOpen = event.target.closest("[data-chronicles-open-thread]");
    const threadPostButton = event.target.closest("[data-chronicles-thread-post]");
    const threadFromPost = event.target.closest("[data-chronicles-open-thread-from-post]");
    const characterOpen = event.target.closest("[data-chronicles-open-character]");
    const characterEditButton = event.target.closest("[data-chronicles-edit-character]");
    const characterContinueButton = event.target.closest("[data-chronicles-continue-character]");
    const dossierTabButton = event.target.closest("[data-chronicles-dossier-tab]");
    const editCodexButton = event.target.closest("[data-chronicles-edit-codex]");
    const deleteCodexButton = event.target.closest("[data-chronicles-delete-codex]");
    const editEchoButton = event.target.closest("[data-chronicles-edit-echo]");
    const deleteEchoButton = event.target.closest("[data-chronicles-delete-echo]");
    const mediaOpenButton = event.target.closest("[data-chronicles-open-media]");
    const dossierAudioButton = event.target.closest("[data-chronicles-dossier-audio]");
    const pinAudioButton = event.target.closest("[data-chronicles-pin-audio]");
    const replyButton = event.target.closest("[data-chronicles-reply-post]");
    const followButton = event.target.closest("[data-chronicles-follow-post]");
    const editPostButton = event.target.closest("[data-chronicles-edit-post]");
    const deletePostButton = event.target.closest("[data-chronicles-delete-post]");
    const editThreadButton = event.target.closest("[data-chronicles-edit-thread]");
    const deleteThreadButton = event.target.closest("[data-chronicles-delete-thread]");
    const viewAllWorldsButton = event.target.closest("[data-chronicles-view-all-worlds]");
    const notifyButton = event.target.closest("[data-chronicles-notifications]");
    const storyModeButton = event.target.closest("[data-chronicles-story-mode]");
    const storyPageButton = event.target.closest("[data-chronicles-story-page]");
    const narratorButton = event.target.closest("[data-chronicles-narrator]");
    const aiOpenButton = event.target.closest("[data-chronicles-ai-open]");
    const aiSummaryButton = event.target.closest("[data-chronicles-ai-summary]");
    const aiGenerateButton = event.target.closest("[data-chronicles-ai-generate]");
    const aiInsertButton = event.target.closest("[data-chronicles-ai-insert]");
    const aiReplaceButton = event.target.closest("[data-chronicles-ai-replace]");
    const markdownButton = event.target.closest("[data-chronicles-markdown]");
    const previewToggle = event.target.closest("[data-chronicles-preview-toggle]");
    const chronicleRouteLink = event.target.closest("a[href]");

    if (openButton) {
      openModal(openButton.dataset.chroniclesOpen);
    } else if (viewAllWorldsButton) {
      state.worldListMode = "all";
      state.threadSearch = "";
      if (elements.threadSearch) elements.threadSearch.value = "";
      showView("worlds");
      renderAll();
    } else if (viewButton) {
      if ((viewButton.dataset.chroniclesViewButton || viewButton.dataset.chroniclesViewJump) === "worlds") state.worldListMode = "selected";
      showView(viewButton.dataset.chroniclesViewButton || viewButton.dataset.chroniclesViewJump);
    } else if (worldOpen) {
      openWorld(worldOpen.dataset.chroniclesOpenWorld);
    } else if (storyOpen) {
      openStory(storyOpen.dataset.chroniclesOpenStory);
    } else if (loreOpen) {
      openLoreModal(loreOpen.dataset.chroniclesOpenLore);
    } else if (threadOpen) {
      openThread(threadOpen.dataset.chroniclesOpenThread);
    } else if (threadPostButton) {
      const { worldId, threadId } = parseThreadRoute(threadPostButton.dataset.chroniclesThreadPost);
      openPostModal({
        worldId,
        threadId
      });
    } else if (threadFromPost) {
      const [worldId, threadId, postId] = threadFromPost.dataset.chroniclesOpenThreadFromPost.split(":");
      state.selectedWorldId = worldId;
      state.selectedThreadId = threadId;
      state.pendingPostAnchor = postId ? `chronicle-post-${postId}` : "";
      const nextUrl = `${window.location.pathname}?world=${encodeURIComponent(worldId)}&thread=${encodeURIComponent(threadId)}${postId ? `#${encodeURIComponent(`chronicle-post-${postId}`)}` : ""}`;
      window.history.pushState(null, "", nextUrl);
      showView("thread");
      renderAll();
    } else if (characterOpen) {
      openCharacterDossier(characterOpen.dataset.chroniclesOpenCharacter);
    } else if (characterEditButton) {
      openCharacterEditor(characterEditButton.dataset.chroniclesEditCharacter);
    } else if (characterContinueButton) {
      continueAsCharacter(characterContinueButton.dataset.chroniclesContinueCharacter);
    } else if (dossierTabButton) {
      state.dossierTab = dossierTabButton.dataset.chroniclesDossierTab || "profile";
      renderCharacterDossier();
    } else if (editCodexButton) {
      const entry = getCodexEntry(editCodexButton.dataset.chroniclesEditCodex);
      if (entry && canEditChronicleRecord(entry)) openCodexModal(entry);
    } else if (deleteCodexButton) {
      deleteCodexEntry(deleteCodexButton.dataset.chroniclesDeleteCodex);
    } else if (editEchoButton) {
      const entry = getEcho(editEchoButton.dataset.chroniclesEditEcho);
      if (entry && canEditChronicleRecord(entry)) openEchoModal(entry);
    } else if (deleteEchoButton) {
      deleteEcho(deleteEchoButton.dataset.chroniclesDeleteEcho);
    } else if (mediaOpenButton) {
      event.preventDefault();
      openMediaViewer(mediaOpenButton);
    } else if (pinAudioButton) {
      event.preventDefault();
      toggleDossierAudioPin(pinAudioButton.dataset.chroniclesPinAudio, pinAudioButton);
    } else if (dossierAudioButton) {
      event.preventDefault();
      toggleDossierAudio(dossierAudioButton);
    } else if (replyButton) {
      const post = findPostById(replyButton.dataset.chroniclesReplyPost);
      openPostModal({
        worldId: post?.worldId || state.selectedWorldId,
        prefill: post ? `> ${post.authorName} wrote:\n> ${trimForQuote(post.body)}\n\n` : ""
      });
    } else if (followButton) {
      const post = findPostById(followButton.dataset.chroniclesFollowPost);
      openPostModal({
        worldId: post?.worldId || state.selectedWorldId,
        prefill: buildFollowUpPrefill(post)
      });
    } else if (editPostButton) {
      const post = findPostById(editPostButton.dataset.chroniclesEditPost);
      if (post && canEditPost(post)) openPostModal({ post });
    } else if (deletePostButton) {
      const post = findPostById(deletePostButton.dataset.chroniclesDeletePost);
      if (post && canEditPost(post)) deletePost(post);
    } else if (editThreadButton) {
      openThreadEditor(editThreadButton.dataset.chroniclesEditThread);
    } else if (deleteThreadButton) {
      deleteThread(deleteThreadButton.dataset.chroniclesDeleteThread);
    } else if (notifyButton) {
      toggleNotifications();
    } else if (storyPageButton) {
      state.storyPage = Number(storyPageButton.dataset.chroniclesStoryPage) || 1;
      renderStorySoFar();
      elements.storyContent?.scrollIntoView({ behavior: "smooth", block: "start" });
    } else if (storyModeButton) {
      state.storyMode = storyModeButton.dataset.chroniclesStoryMode || "full";
      state.storyPage = 1;
      renderStorySoFar();
    } else if (narratorButton) {
      applyNarratorMode();
    } else if (aiOpenButton) {
      openAiAssistModal();
    } else if (aiSummaryButton) {
      const button = aiSummaryButton;
      button.disabled = true;
      button.textContent = "Refreshing...";
      setText(elements.storyStatus, "Refreshing AI summary...");
      refreshChroniclesSummary(state.storyWorldId, { force: true })
        .then(() => setText(elements.storyStatus, "Story So Far summary refreshed."))
        .catch((error) => setText(elements.storyStatus, error.message || "Summary refresh failed."))
        .finally(() => {
          button.disabled = false;
          button.textContent = "Refresh Summary";
        });
    } else if (aiGenerateButton) {
      generateAiAssist();
    } else if (aiInsertButton) {
      useAiAssistResult("insert");
    } else if (aiReplaceButton) {
      useAiAssistResult("replace");
    } else if (markdownButton) {
      applyMarkdown(markdownButton.dataset.chroniclesMarkdown, markdownButton.dataset.chroniclesMarkdownTarget);
    } else if (previewToggle) {
      renderPostPreview(!elements.postPreview || elements.postPreview.classList.contains("d-none"));
    } else if (chronicleRouteLink && isChronicleRouteLink(chronicleRouteLink)) {
      event.preventDefault();
      navigateChronicleRoute(new URL(chronicleRouteLink.href, window.location.href));
    }
  });

  document.addEventListener("input", (event) => {
    const audioSeek = event.target.closest("[data-chronicles-audio-seek]");
    if (audioSeek) seekDossierAudio(audioSeek);
  });

  document.getElementById("chroniclesPostWorld")?.addEventListener("change", () => {
    populateThreadSelect();
    populatePostCharacterSelect();
    updatePostSubmitState();
  });
  document.getElementById("chroniclesPostThread")?.addEventListener("change", updatePostSubmitState);
  document.getElementById("chroniclesPostCharacter")?.addEventListener("change", () => applySelectedPostCharacterVoice(true));
  document.getElementById("chroniclesThreadWorld")?.addEventListener("change", () => populateCategorySelects());
  document.getElementById("chroniclesPostType")?.addEventListener("change", (event) => {
    if (!state.isAdmin) return;
    if (event.target.value === "narrator") {
      applyNarratorMode();
    } else if (event.target.value === "location-description") {
      setInputValue("chroniclesPostAuthor", "Location Archive");
      setInputValue("chroniclesPostOwner", "Chronicle Custodian");
      setText(elements.postStatus, "Location description will be hidden from Story So Far.");
    }
  });
  elements.storyWorld?.addEventListener("change", (event) => {
    state.storyWorldId = event.target.value || state.selectedWorldId;
    state.storyPage = 1;
    renderStorySoFar();
  });
  elements.threadSearch?.addEventListener("input", (event) => {
    state.threadSearch = event.target.value || "";
    renderThreads();
  });
  elements.characterSearch?.addEventListener("input", (event) => {
    state.characterSearch = event.target.value || "";
    renderCharacters();
  });
  elements.echoSearch?.addEventListener("input", (event) => {
    state.echoSearch = event.target.value || "";
    renderEchoes();
  });
  document.getElementById("chroniclesPostImageFile")?.addEventListener("change", renderPostAttachmentPreview);
  document.getElementById("chroniclesPostImageUrl")?.addEventListener("input", renderPostAttachmentPreview);
  document.getElementById("chroniclesCharacterImage")?.addEventListener("change", () => {
    renderPortraitUploadPreview("chroniclesCharacterImage", "chroniclesCharacterPortraitPreview");
  });
  document.getElementById("chroniclesCharacterEditImage")?.addEventListener("change", () => {
    const character = getCharacter(state.selectedCharacterId);
    renderPortraitUploadPreview("chroniclesCharacterEditImage", "chroniclesCharacterEditPortraitPreview", character?.image || "");
  });
  document.getElementById("chroniclesPostBody")?.addEventListener("input", () => {
    if (elements.postPreview && !elements.postPreview.classList.contains("d-none")) renderPostPreview(true);
    updatePostSubmitState();
  });

  elements.worldForm?.addEventListener("submit", handleWorldSubmit);
  elements.threadForm?.addEventListener("submit", handleThreadSubmit);
  elements.categoryForm?.addEventListener("submit", handleCategorySubmit);
  elements.postForm?.addEventListener("submit", handlePostSubmit);
  elements.characterForm?.addEventListener("submit", handleCharacterSubmit);
  elements.codexForm?.addEventListener("submit", handleCodexSubmit);
  elements.echoForm?.addEventListener("submit", handleEchoSubmit);
  elements.loreToggle?.addEventListener("click", () => {
    state.loreEditing = !state.loreEditing;
    renderLoreModal();
  });
  elements.loreSave?.addEventListener("click", handleLoreSave);
  elements.characterEditToggle?.addEventListener("click", () => {
    state.characterEditing = !state.characterEditing;
    renderCharacterDetailModal();
  });
  elements.characterSave?.addEventListener("click", handleCharacterDetailSave);
}

function subscribeChronicles() {
  cleanupSubscriptions();
  const watchedPaths = [
    ["worlds", "chronicles/worlds", (value) => { state.remoteWorlds = toArray(value); }],
    ["categories", "chronicles/categories", (value) => { state.remoteCategories = value || {}; }],
    ["threads", "chronicles/threads", (value) => { state.remoteThreads = value || {}; }],
    ["posts", "chronicles/posts", (value) => {
      state.remotePosts = value || {};
      detectNewPosts();
    }],
    ["deletedThreads", "chronicles/deletedThreads", (value) => { state.deletedThreads = value || {}; }],
    ["deletedPosts", "chronicles/deletedPosts", (value) => { state.deletedPosts = value || {}; }],
    ["characters", "chronicles/characters", (value) => { state.remoteCharacters = toArray(value); }],
    ["codex", "chronicles/codex", (value) => { state.remoteCodex = toArray(value); }],
    ["echoes", "chronicles/echoes", (value) => { state.remoteEchoes = toArray(value); }],
    ["summaries", "chronicles/summaries", (value) => { state.aiSummaries = value || {}; }],
    ["aiConfig", "siteConfig/chroniclesAi", (value) => { state.chroniclesAiConfig = normalizeChroniclesAiConfig(value); }]
  ];

  watchedPaths.forEach(([, path, setter]) => {
    const unsubscribe = onValue(ref(database, path), (snapshot) => {
      setter(snapshot.val());
      renderAll();
    }, (error) => {
      console.warn(`Chronicles Firebase read failed at ${path}:`, error);
      renderAll();
    });
    state.unsubscribers.push(unsubscribe);
  });
}

function cleanupSubscriptions() {
  state.unsubscribers.forEach((unsubscribe) => unsubscribe());
  state.unsubscribers = [];
}

function detectNewPosts() {
  const remotePosts = flattenRemotePosts();
  const incoming = remotePosts.filter((post) => !state.postIdsKnown.has(post.id));
  remotePosts.forEach((post) => state.postIdsKnown.add(post.id));

  if (!state.postNotificationsReady) {
    state.postNotificationsReady = true;
    return;
  }

  if (!state.notificationsEnabled || !("Notification" in window) || Notification.permission !== "granted") return;
  incoming
    .filter((post) => post.uid !== state.user?.uid)
    .slice(-3)
    .forEach((post) => {
      new Notification(`New Chronicle post: ${post.title || post.threadTitle || "Thread update"}`, {
        body: `${post.authorName || "Someone"} posted in ${post.worldTitle || "Chronicles"}.`,
        tag: `chronicles-${post.id}`
      });
    });
}

function flattenRemotePosts() {
  const posts = [];
  Object.entries(state.remotePosts || {}).forEach(([worldId, threads]) => {
    Object.entries(threads || {}).forEach(([threadId, threadPosts]) => {
      toArray(threadPosts).forEach((post) => {
        posts.push({
          ...post,
          worldId,
          worldTitle: getWorld(worldId)?.title || "World",
          threadId,
          threadTitle: getThread(worldId, threadId)?.title || "Thread"
        });
      });
    });
  });
  return posts;
}

async function toggleNotifications() {
  if (!("Notification" in window)) return;
  if (Notification.permission === "default") {
    await Notification.requestPermission();
  }
  state.notificationsEnabled = Notification.permission === "granted" ? !state.notificationsEnabled : false;
  localStorage.setItem("banriChroniclesNotifications", String(state.notificationsEnabled));
  renderNotificationButton();
}

function renderSignedOut() {
  stopDossierAudio();
  cleanupSubscriptions();
  state.user = null;
  state.isAdmin = false;
  state.postIdsKnown = new Set();
  state.postNotificationsReady = false;
  elements.locked?.classList.remove("d-none");
  elements.app?.classList.add("d-none");
}

async function renderSignedIn(user) {
  state.user = user;
  state.isAdmin = await isAdminUid(user.uid);
  elements.locked?.classList.add("d-none");
  elements.app?.classList.remove("d-none");
  subscribeChronicles();
  renderAll();
}

function canEditPost(post) {
  return state.isAdmin || post.uid === state.user?.uid;
}

function isCharacterAssignedToCurrentUser(character) {
  const uid = state.user?.uid;
  if (!uid || !character) return false;
  return [
    character.uid,
    character.ownerUid,
    character.assignedUid,
    character.createdForUid
  ].filter(Boolean).includes(uid);
}

function canEditCharacter(character) {
  return state.isAdmin || isCharacterAssignedToCurrentUser(character);
}

function canUseCharacterVoice(character) {
  return state.isAdmin || isCharacterAssignedToCurrentUser(character);
}

function isRecordVisible(record) {
  if (!record) return false;
  if (state.isAdmin || record.uid === state.user?.uid) return true;
  const status = String(record.status || record.visibility || "public").toLowerCase();
  return status !== "draft" && status !== "private";
}

function canEditChronicleRecord(record) {
  if (!record) return false;
  if (state.isAdmin || record.uid === state.user?.uid) return true;
  return canEditCharacter(getCharacter(record.characterId));
}

function findPostById(postId) {
  return getPosts().find((post) => post.id === postId) || null;
}

function isChronicleRouteLink(link) {
  try {
    const url = new URL(link.href, window.location.href);
    return url.pathname.endsWith("/chronicles.html") || url.hash.startsWith("#chronicle-post-");
  } catch {
    return false;
  }
}

function applyRouteFromUrl() {
  if (state.routeApplied) return;
  const params = new URLSearchParams(window.location.search);
  const hasRoute = params.has("character") || params.has("world") || params.has("thread") || window.location.hash.startsWith("#chronicle-post-");
  if (!hasRoute) {
    state.routeApplied = true;
    return;
  }
  navigateChronicleRoute(new URL(window.location.href), { replace: true, render: false });
}

function navigateChronicleRoute(url, options = {}) {
  const characterId = url.searchParams.get("character");
  if (characterId) {
    const character = getCharacter(characterId);
    if (!character) return;
    if (state.selectedCharacterId && state.selectedCharacterId !== character.id) stopDossierAudio();
    state.selectedCharacterId = character.id;
    state.selectedWorldId = character.worldId || state.selectedWorldId;
    state.view = "dossier";
    state.routeApplied = true;
    const nextUrl = `${window.location.pathname}?character=${encodeURIComponent(character.id)}`;
    if (options.replace) {
      window.history.replaceState(null, "", nextUrl);
    } else {
      window.history.pushState(null, "", nextUrl);
    }
    if (options.render !== false) renderAll();
    return;
  }

  const anchor = decodeURIComponent((url.hash || "").replace(/^#/, ""));
  const postId = anchor.startsWith("chronicle-post-") ? anchor.replace("chronicle-post-", "") : "";
  const linkedPost = postId ? findPostById(postId) : null;
  const worldId = url.searchParams.get("world") || linkedPost?.worldId || state.selectedWorldId;
  const threadId = url.searchParams.get("thread") || linkedPost?.threadId || state.selectedThreadId;
  const world = getWorld(worldId);
  const thread = world ? getThread(world.id, threadId) : null;

  if (!world || !thread) return;

  stopDossierAudio();
  state.selectedWorldId = world.id;
  state.selectedThreadId = thread.id;
  state.view = "thread";
  state.pendingPostAnchor = anchor;
  state.routeApplied = true;

  const nextUrl = `${window.location.pathname}?world=${encodeURIComponent(world.id)}&thread=${encodeURIComponent(thread.id)}${anchor ? `#${encodeURIComponent(anchor)}` : ""}`;
  if (options.replace) {
    window.history.replaceState(null, "", nextUrl);
  } else {
    window.history.pushState(null, "", nextUrl);
  }

  if (options.render !== false) renderAll();
}

function scrollToPendingPost() {
  if (!state.pendingPostAnchor) return;
  const anchor = state.pendingPostAnchor;
  window.requestAnimationFrame(() => {
    const target = document.getElementById(anchor);
    if (!target) return;
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    target.classList.add("chronicles-post-highlight");
    window.setTimeout(() => target.classList.remove("chronicles-post-highlight"), 2200);
    state.pendingPostAnchor = "";
  });
}

function normalizeAttachments(value) {
  if (Array.isArray(value)) return value.filter((item) => item?.url);
  if (!value || typeof value !== "object") return [];
  return Object.values(value).filter((item) => item?.url);
}

function renderAttachments(attachments = []) {
  if (!attachments.length) return "";
  return `
    <div class="chronicles-attachments">
      ${attachments.map((attachment) => `
        <a class="chronicles-attachment" href="${escapeAttr(attachment.url)}" target="_blank" rel="noopener">
          <img src="${escapeAttr(attachment.url)}" alt="${escapeAttr(attachment.title || "Attached image")}" loading="lazy" />
          <span>${escapeHtml(attachment.title || "Attached image")}</span>
        </a>
      `).join("")}
    </div>
  `;
}

function renderPostAttachmentPreview() {
  if (!elements.postAttachments) return;
  const linkedUrl = readValue("chroniclesPostImageUrl");
  const fileInput = document.getElementById("chroniclesPostImageFile");
  const fileFigures = [...(fileInput?.files || [])].slice(0, 6).map((file) => `
    <figure>
      <img src="${escapeAttr(URL.createObjectURL(file))}" alt="">
      <figcaption>${escapeHtml(file.name)}</figcaption>
    </figure>
  `);
  const existingFigures = state.editingAttachments.map((attachment) => `
    <figure>
      <img src="${escapeAttr(attachment.url)}" alt="">
      <figcaption>${escapeHtml(attachment.title || "Attached image")}</figcaption>
    </figure>
  `);
  const linkedFigure = linkedUrl ? [`
    <figure>
      <img src="${escapeAttr(linkedUrl)}" alt="">
      <figcaption>Linked image</figcaption>
    </figure>
  `] : [];

  elements.postAttachments.innerHTML = [...existingFigures, ...linkedFigure, ...fileFigures].join("");
}

function renderPostPreview(show) {
  if (!elements.postPreview) return;
  elements.postPreview.classList.toggle("d-none", !show);
  if (show) {
    elements.postPreview.innerHTML = `<div class="chronicles-markdown">${renderMarkdown(readValue("chroniclesPostBody") || "Preview waiting for text.")}</div>`;
  }
}

function renderMarkdown(value) {
  const raw = transformOocMarkup(transformStrictBlockquotes(String(value || "")));
  if (window.marked && window.DOMPurify) {
    window.marked.setOptions({
      breaks: true,
      gfm: true
    });
    return window.DOMPurify.sanitize(window.marked.parse(raw), {
      ADD_ATTR: ["target", "rel", "class"]
    });
  }
  return renderParagraphs(raw);
}

function transformStrictBlockquotes(value) {
  const output = [];
  const quoteLines = [];
  let inFence = false;

  const flushQuote = () => {
    if (!quoteLines.length) return;
    output.push("");
    output.push('<blockquote class="chronicles-voice-quote">');
    output.push(quoteLines.map((line) => escapeHtml(line)).join("<br>"));
    output.push("</blockquote>");
    output.push("");
    quoteLines.length = 0;
  };

  String(value || "").split(/\r?\n/).forEach((line) => {
    if (/^\s*```/.test(line)) {
      flushQuote();
      inFence = !inFence;
      output.push(line);
      return;
    }

    const quoteMatch = !inFence ? line.match(/^\s*>\s?(.*)$/) : null;
    if (quoteMatch) {
      quoteLines.push(quoteMatch[1]);
      return;
    }

    flushQuote();
    output.push(line);
  });

  flushQuote();
  return output.join("\n").replace(/\n{3,}/g, "\n\n");
}

function transformOocMarkup(value) {
  return String(value || "").replace(/\[OOC:\s*([\s\S]*?)\]/gi, (_, message) => `

<blockquote class="chronicles-ooc-note">
  <strong>OOC</strong>
  <span>${escapeHtml(String(message || "").trim() || "Out-of-character note.")}</span>
</blockquote>

`);
}

function applyMarkdown(type, targetId = "chroniclesPostBody") {
  const textarea = document.getElementById(targetId || "chroniclesPostBody");
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const selected = textarea.value.slice(start, end);
  const fallback = selected || "text";
  const oocFallback = selected || "1";
  const wrappers = {
    bold: [`**${fallback}**`, 2, 2],
    italic: [`*${fallback}*`, 1, 1],
    heading: [`## ${fallback}`, 3, 0],
    quote: [`> ${fallback}`, 2, 0],
    list: [`- ${fallback}`, 2, 0],
    code: selected.includes("\n") ? [`\`\`\`\n${fallback}\n\`\`\``, 4, 4] : [`\`${fallback}\``, 1, 1],
    link: [`[${fallback}](https://example.com)`, 1, 22],
    image: [`![${fallback}](https://example.com/image.jpg)`, 2, 31],
    ooc: [`[OOC: ${oocFallback}]`, 6, 1]
  };
  const [replacement, cursorStartOffset, cursorEndOffset] = wrappers[type] || [fallback, 0, 0];
  textarea.setRangeText(replacement, start, end, "select");
  textarea.selectionStart = start + cursorStartOffset;
  textarea.selectionEnd = start + replacement.length - cursorEndOffset;
  textarea.focus();
  if (textarea.id === "chroniclesPostBody" && elements.postPreview && !elements.postPreview.classList.contains("d-none")) renderPostPreview(true);
}

function detailRow(label, value) {
  return `<dt>${escapeHtml(label)}</dt><dd>${escapeHtml(value || "Not set")}</dd>`;
}

function readSection(title, value) {
  if (!value) return "";
  return `
    <section>
      <h3>${escapeHtml(title)}</h3>
      <div class="chronicles-markdown">${renderMarkdown(value)}</div>
    </section>
  `;
}

function readValue(id) {
  return String(document.getElementById(id)?.value || "").trim();
}

function readCheckbox(id) {
  return document.getElementById(id)?.checked === true;
}

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value ?? "";
}

function setCheckboxValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.checked = value === true;
}

function setText(element, value) {
  if (element) element.textContent = value || "";
}

function getDisplayName() {
  return state.user?.displayName || state.user?.email?.split("@")[0] || "Nexus User";
}

function renderParagraphs(value) {
  return String(value || "")
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function trimForQuote(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function buildFollowUpPrefill(post) {
  if (!post) return "";
  const label = post.title || post.threadTitle || "previous post";
  const href = `/chronicles.html?world=${encodeURIComponent(post.worldId)}&thread=${encodeURIComponent(post.threadId)}#chronicle-post-${encodeURIComponent(post.id)}`;
  return `[Post follow-up: ${label}](${href})\n\n`;
}

function toTitle(value) {
  return String(value || "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase()) || "Unsorted";
}

function toTime(value) {
  if (typeof value === "number") return value;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value) {
  const time = toTime(value);
  if (!time) return "Pending";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(time));
}

function toDateTime(value) {
  const time = toTime(value);
  return time ? new Date(time).toISOString() : "";
}

function showBootstrapModal(id) {
  const modal = document.getElementById(id);
  if (!modal || typeof bootstrap === "undefined") return;
  bootstrap.Modal.getOrCreateInstance(modal).show();
}

function hideBootstrapModal(id) {
  const modal = document.getElementById(id);
  if (!modal || typeof bootstrap === "undefined") return;
  bootstrap.Modal.getOrCreateInstance(modal).hide();
}

function openLoginModal() {
  showBootstrapModal("banriLoginModal");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/`/g, "&#096;");
}

bindEvents();
onAuthStateChanged(auth, (user) => {
  if (user) {
    renderSignedIn(user).catch((error) => {
      console.warn("Chronicles sign-in render failed:", error);
      renderSignedOut();
    });
  } else {
    renderSignedOut();
  }
});
