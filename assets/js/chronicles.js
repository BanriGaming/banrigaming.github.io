import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  onValue,
  push,
  remove,
  ref,
  set
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getFirebaseServices, isAdminUid, readFileAsDataUrl, slugify } from "./site-store.js";

const { auth, database } = getFirebaseServices();

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

const HOW_IT_WORKS = [
  {
    title: "Play-by-Post Roleplay",
    text: "Players write detailed narrative posts like mini-chapters, describing character actions, dialogue, thoughts, and consequences inside a shared world."
  },
  {
    title: "Forum Threads",
    text: "Each thread is a location: a city, tavern, forest, ship, planet, or battlefield. Characters move between threads by writing departures and arrivals."
  },
  {
    title: "Narrative Format",
    text: "Write in third-person past tense. Each post should add motion, atmosphere, dialogue, or a useful hook for another player to answer."
  },
  {
    title: "Custodians",
    text: "One or two custodians act like narrators. They can move time forward, resolve disputes, add world consequences, and preserve lore consistency."
  },
  {
    title: "Character Sheets",
    text: "A character record should include name, species or origin, age, role, alignment, affiliation, origin tale, current location, equipment, skills, personality, hooks, and status."
  },
  {
    title: "Etiquette",
    text: "No god-modding. Control your own character only. Respect lore, collaborate over competition, and use OOC notes sparingly when coordination is needed."
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
  selectedLoreWorldId: "",
  editingPost: null,
  editingThread: null,
  editingAttachments: [],
  loreEditing: false,
  characterEditing: false,
  threadSearch: "",
  worldListMode: "selected",
  routeApplied: false,
  pendingPostAnchor: "",
  remoteWorlds: [],
  remoteCategories: {},
  remoteThreads: {},
  remotePosts: {},
  remoteCharacters: [],
  deletedThreads: {},
  deletedPosts: {},
  unsubscribers: [],
  postIdsKnown: new Set(),
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
  characterGrid: document.getElementById("chroniclesCharacterGrid"),
  howItWorks: document.getElementById("chroniclesHowItWorks"),
  notifyButton: document.getElementById("chroniclesNotifyButton"),
  worldForm: document.getElementById("chroniclesWorldForm"),
  categoryForm: document.getElementById("chroniclesCategoryForm"),
  categoryStatus: document.getElementById("chroniclesCategoryStatus"),
  threadForm: document.getElementById("chroniclesThreadForm"),
  postForm: document.getElementById("chroniclesPostForm"),
  characterForm: document.getElementById("chroniclesCharacterForm"),
  postStatus: document.getElementById("chroniclesPostStatus"),
  characterStatus: document.getElementById("chroniclesCharacterStatus"),
  postPreview: document.getElementById("chroniclesPostPreview"),
  postAttachments: document.getElementById("chroniclesPostAttachments"),
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

function getPostsForThread(worldId, threadId, sortDirection = "asc") {
  const fallbackPosts = DEFAULT_POSTS[worldId]?.[threadId] || [];
  const remotePosts = toArray(state.remotePosts[worldId]?.[threadId]);
  const deleted = state.deletedPosts[worldId]?.[threadId] || {};
  const posts = mergeById(fallbackPosts, remotePosts)
    .filter((post) => deleted[post.id] !== true)
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

function getPosts() {
  const posts = [];
  getWorlds().forEach((world) => {
    getThreadsForWorld(world.id).forEach((thread) => {
      posts.push(...getPostsForThread(world.id, thread.id, "desc"));
    });
  });
  return posts.sort((a, b) => toTime(b.createdAt) - toTime(a.createdAt));
}

function ensureSelectedWorldAndThread() {
  const world = getWorld(state.selectedWorldId);
  if (!world) return;
  state.selectedWorldId = world.id;

  const thread = getThread(world.id, state.selectedThreadId);
  state.selectedThreadId = thread?.id || "";
}

function renderAll() {
  if (!elements.app || !state.user) return;
  applyRouteFromUrl();
  ensureSelectedWorldAndThread();
  renderAdminVisibility();
  renderProfile();
  renderStats();
  renderHowItWorks();
  renderWorldCards(elements.worldGrid, getWorlds());
  renderThreads();
  renderThreadView();
  renderRecentPosts();
  renderCharacters();
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

function renderHowItWorks() {
  if (!elements.howItWorks) return;
  elements.howItWorks.innerHTML = HOW_IT_WORKS.map((item) => `
    <article class="chronicles-primer-card">
      <strong>${escapeHtml(item.title)}</strong>
      <p>${escapeHtml(item.text)}</p>
    </article>
  `).join("");
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
        <small>${threads.length} threads / ${posts.length} posts</small>
        <div class="chronicles-world-actions">
          <button type="button" data-chronicles-open-world="${escapeAttr(world.id)}">Open World</button>
          <button type="button" data-chronicles-open-lore="${escapeAttr(world.id)}">Lore</button>
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
        <small>${escapeHtml(post.editorMode ? "Editor archived entry" : "Player post")}</small>
      </aside>
      <div class="chronicles-forum-body">
        <header>
          <div>
            <h3>${escapeHtml(post.title || thread.title)}</h3>
            <time datetime="${escapeAttr(toDateTime(post.createdAt))}">${escapeHtml(formatDate(post.createdAt))}${post.updatedAt ? " / edited" : ""}</time>
          </div>
        </header>
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
  const posts = getPosts().slice(0, 8);
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
      </div>
    </article>
  `).join("") : '<div class="relay-empty">No chronicle posts yet.</div>';
}

function renderCharacters() {
  if (!elements.characterGrid) return;
  const worlds = getWorlds();
  const characters = getCharacters();

  elements.characterGrid.innerHTML = characters.length ? characters.map((character) => {
    const world = worlds.find((item) => item.id === character.worldId);
    return `
      <article class="chronicles-character-card">
        <div class="chronicles-character-portrait" style="${character.image ? `--character-image: url('${escapeAttr(character.image)}')` : ""}">
          <span>${escapeHtml((character.name || "?").charAt(0))}</span>
        </div>
        <div>
          <p>${escapeHtml(world?.title || "Unassigned World")} / Created by ${escapeHtml(character.ownerDisplayName || "Unknown")}</p>
          <h3>${escapeHtml(character.name || "Unnamed Character")}</h3>
          <dl>
            <dt>Role</dt><dd>${escapeHtml(character.role || "Unassigned")}</dd>
            <dt>Alignment</dt><dd>${escapeHtml(character.alignment || "Unknown")}</dd>
            <dt>Location</dt><dd>${escapeHtml(character.location || "Not set")}</dd>
          </dl>
          ${character.origin ? `<p>${escapeHtml(character.origin).slice(0, 220)}${character.origin.length > 220 ? "..." : ""}</p>` : ""}
          <div class="chronicles-forum-actions">
            <button type="button" data-chronicles-open-character="${escapeAttr(character.id)}">Open Record</button>
          </div>
        </div>
      </article>
    `;
  }).join("") : '<div class="relay-empty">No characters registered yet.</div>';
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
  populateThreadSelect();
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
  threadSelect.innerHTML = threads
    .map((thread) => `<option value="${escapeAttr(thread.id)}">${escapeHtml(thread.title)}</option>`)
    .join("");
  if (selectedThreadId && threads.some((thread) => thread.id === selectedThreadId)) {
    threadSelect.value = selectedThreadId;
  } else if (threads.length) {
    threadSelect.value = threads[0].id;
  }
}

function showView(view) {
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
  state.worldListMode = "selected";
  showView("worlds");
  renderAll();
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
  } else if (kind === "character") {
    elements.characterForm?.reset();
    setText(elements.characterStatus, "");
    const worldSelect = document.getElementById("chroniclesCharacterWorld");
    const ownerInput = document.getElementById("chroniclesCharacterOwner");
    const ownerUidInput = document.getElementById("chroniclesCharacterOwnerUid");
    if (worldSelect) worldSelect.value = state.selectedWorldId;
    if (ownerInput) ownerInput.value = state.isAdmin ? "" : getDisplayName();
    if (ownerUidInput) ownerUidInput.value = "";
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
  const threadId = options.threadId || options.post?.threadId || state.selectedThreadId;
  const worldSelect = document.getElementById("chroniclesPostWorld");
  const authorInput = document.getElementById("chroniclesPostAuthor");
  const ownerInput = document.getElementById("chroniclesPostOwner");

  if (worldSelect) worldSelect.value = worldId;
  populateThreadSelect(threadId);
  setInputValue("chroniclesPostTitle", options.post?.title || "");
  setInputValue("chroniclesPostBody", options.post?.body || options.prefill || "");
  setInputValue("chroniclesPostImageUrl", "");
  if (authorInput) authorInput.value = options.post?.authorName || "";
  if (ownerInput) ownerInput.value = options.post?.ownerDisplayName || options.post?.authorName || "";
  renderPostAttachmentPreview();
  renderPostPreview(false);
  showBootstrapModal("chroniclesPostModal");
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
      </dl>
      ${readSection("Origin Tale", character.origin)}
      ${readSection("Armament / Equipment", character.equipment)}
      ${readSection("Skills / Aptitudes", character.skills)}
      ${readSection("Personality Notes", character.personality)}
      ${readSection("Hooks / Rumors", character.hooks)}
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
  setInputValue("chroniclesCharacterEditWorld", character.worldId || state.selectedWorldId);
  setInputValue("chroniclesCharacterEditName", character.name || "");
  setInputValue("chroniclesCharacterEditOwner", character.ownerDisplayName || "");
  setInputValue("chroniclesCharacterEditOwnerUid", character.uid === "seed" ? "" : character.uid || "");
  setInputValue("chroniclesCharacterEditSpecies", character.species || "");
  setInputValue("chroniclesCharacterEditAge", character.age || "");
  setInputValue("chroniclesCharacterEditRole", character.role || "");
  setInputValue("chroniclesCharacterEditAlignment", character.alignment || "");
  setInputValue("chroniclesCharacterEditAffiliation", character.affiliation || "");
  setInputValue("chroniclesCharacterEditLocation", character.location || "");
  setInputValue("chroniclesCharacterEditImage", character.image || "");
  setInputValue("chroniclesCharacterEditOrigin", character.origin || "");
  setInputValue("chroniclesCharacterEditEquipment", character.equipment || "");
  setInputValue("chroniclesCharacterEditSkills", character.skills || "");
  setInputValue("chroniclesCharacterEditPersonality", character.personality || "");
  setInputValue("chroniclesCharacterEditHooks", character.hooks || "");
  const ownerInput = document.getElementById("chroniclesCharacterEditOwner");
  const ownerUidInput = document.getElementById("chroniclesCharacterEditOwnerUid");
  if (ownerInput) ownerInput.disabled = !state.isAdmin;
  if (ownerUidInput) ownerUidInput.disabled = !state.isAdmin;
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
      status: "Active",
      order: getWorlds().length + 1,
      createdBy: state.user.uid,
      createdAt: Date.now(),
      updatedAt: Date.now()
    });
    state.selectedWorldId = worldId;
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
    const override = state.isAdmin ? readValue("chroniclesPostAuthor") : "";
    const ownerOverride = state.isAdmin ? readValue("chroniclesPostOwner") : "";
    const authorName = override || state.editingPost?.authorName || getDisplayName();
    const ownerDisplayName = ownerOverride || state.editingPost?.ownerDisplayName || authorName;
    const postId = state.editingPost?.id || push(ref(database, `chronicles/posts/${worldId}/${threadId}`)).key;
    const payload = {
      ...(state.editingPost || {}),
      id: postId,
      uid: state.editingPost?.uid || state.user.uid,
      ownerDisplayName,
      authorName,
      title: readValue("chroniclesPostTitle"),
      body,
      attachments,
      editorMode: Boolean(override || state.editingPost?.editorMode),
      createdAt: state.editingPost?.createdAt || Date.now(),
      updatedAt: Date.now()
    };

    await set(ref(database, `chronicles/posts/${worldId}/${threadId}/${postId}`), payload);
    state.selectedWorldId = worldId;
    state.selectedThreadId = threadId;
    state.editingPost = null;
    state.editingAttachments = [];
    hideBootstrapModal("chroniclesPostModal");
    showView("thread");
  } catch (error) {
    setText(elements.postStatus, error.message || "Post failed.");
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
  const characterRef = push(ref(database, "chronicles/characters"));
  try {
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
      affiliation: readValue("chroniclesCharacterAffiliation"),
      location: readValue("chroniclesCharacterLocation"),
      image: readValue("chroniclesCharacterImage"),
      origin: readValue("chroniclesCharacterOrigin"),
      equipment: readValue("chroniclesCharacterEquipment"),
      skills: readValue("chroniclesCharacterSkills"),
      personality: readValue("chroniclesCharacterPersonality"),
      hooks: readValue("chroniclesCharacterHooks"),
      status: "Active",
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
      affiliation: readValue("chroniclesCharacterEditAffiliation"),
      location: readValue("chroniclesCharacterEditLocation"),
      image: readValue("chroniclesCharacterEditImage"),
      origin: readValue("chroniclesCharacterEditOrigin"),
      equipment: readValue("chroniclesCharacterEditEquipment"),
      skills: readValue("chroniclesCharacterEditSkills"),
      personality: readValue("chroniclesCharacterEditPersonality"),
      hooks: readValue("chroniclesCharacterEditHooks"),
      status: character.status || "Active",
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

function confirmChroniclesAction(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    let dialog = document.getElementById("chroniclesConfirmDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "chroniclesConfirmDialog";
      dialog.className = "relay-confirm-dialog";
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `
      <form method="dialog">
        <div>
          <p class="banri-modal-kicker">Chronicle Confirmation</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
        <footer>
          <button class="button" value="cancel">Cancel</button>
          <button class="button button--danger" type="button" data-chronicles-confirm-accept>Delete</button>
        </footer>
      </form>
    `;

    const accept = dialog.querySelector("[data-chronicles-confirm-accept]");
    const cleanup = () => {
      accept?.removeEventListener("click", acceptHandler);
      dialog.removeEventListener("close", closeHandler);
    };
    const acceptHandler = () => {
      cleanup();
      dialog.close("confirm");
      resolve(true);
    };
    const closeHandler = () => {
      cleanup();
      resolve(dialog.returnValue === "confirm");
    };

    accept?.addEventListener("click", acceptHandler);
    dialog.addEventListener("close", closeHandler, { once: true });
    dialog.showModal();
  });
}

async function deletePost(post) {
  if (!post || !canEditPost(post)) return;
  const label = post.title || trimForQuote(post.body) || "this post";
  if (!await confirmChroniclesAction(`Delete "${label}" from ${post.threadTitle || "this thread"}?`, "Delete Post")) return;

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
  if (!await confirmChroniclesAction(`Delete "${thread.title}" and ${posts.length} post${posts.length === 1 ? "" : "s"}?`, "Delete Thread")) return;

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

function bindEvents() {
  document.addEventListener("click", (event) => {
    const openButton = event.target.closest("[data-chronicles-open]");
    const viewButton = event.target.closest("[data-chronicles-view-button], [data-chronicles-view-jump]");
    const worldOpen = event.target.closest("[data-chronicles-open-world]");
    const loreOpen = event.target.closest("[data-chronicles-open-lore]");
    const threadOpen = event.target.closest("[data-chronicles-open-thread]");
    const threadPostButton = event.target.closest("[data-chronicles-thread-post]");
    const threadFromPost = event.target.closest("[data-chronicles-open-thread-from-post]");
    const characterOpen = event.target.closest("[data-chronicles-open-character]");
    const replyButton = event.target.closest("[data-chronicles-reply-post]");
    const followButton = event.target.closest("[data-chronicles-follow-post]");
    const editPostButton = event.target.closest("[data-chronicles-edit-post]");
    const deletePostButton = event.target.closest("[data-chronicles-delete-post]");
    const editThreadButton = event.target.closest("[data-chronicles-edit-thread]");
    const deleteThreadButton = event.target.closest("[data-chronicles-delete-thread]");
    const viewAllWorldsButton = event.target.closest("[data-chronicles-view-all-worlds]");
    const notifyButton = event.target.closest("[data-chronicles-notifications]");
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
      openCharacterDetail(characterOpen.dataset.chroniclesOpenCharacter);
    } else if (replyButton) {
      const post = findPostById(replyButton.dataset.chroniclesReplyPost);
      openPostModal({
        worldId: state.selectedWorldId,
        threadId: state.selectedThreadId,
        prefill: post ? `> ${post.authorName} wrote:\n> ${trimForQuote(post.body)}\n\n` : ""
      });
    } else if (followButton) {
      const post = findPostById(followButton.dataset.chroniclesFollowPost);
      openPostModal({
        worldId: state.selectedWorldId,
        threadId: state.selectedThreadId,
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
    } else if (markdownButton) {
      applyMarkdown(markdownButton.dataset.chroniclesMarkdown);
    } else if (previewToggle) {
      renderPostPreview(!elements.postPreview || elements.postPreview.classList.contains("d-none"));
    } else if (chronicleRouteLink && isChronicleRouteLink(chronicleRouteLink)) {
      event.preventDefault();
      navigateChronicleRoute(new URL(chronicleRouteLink.href, window.location.href));
    }
  });

  document.getElementById("chroniclesPostWorld")?.addEventListener("change", () => populateThreadSelect());
  document.getElementById("chroniclesThreadWorld")?.addEventListener("change", () => populateCategorySelects());
  elements.threadSearch?.addEventListener("input", (event) => {
    state.threadSearch = event.target.value || "";
    renderThreads();
  });
  document.getElementById("chroniclesPostImageFile")?.addEventListener("change", renderPostAttachmentPreview);
  document.getElementById("chroniclesPostImageUrl")?.addEventListener("input", renderPostAttachmentPreview);
  document.getElementById("chroniclesPostBody")?.addEventListener("input", () => {
    if (elements.postPreview && !elements.postPreview.classList.contains("d-none")) renderPostPreview(true);
  });

  elements.worldForm?.addEventListener("submit", handleWorldSubmit);
  elements.threadForm?.addEventListener("submit", handleThreadSubmit);
  elements.categoryForm?.addEventListener("submit", handleCategorySubmit);
  elements.postForm?.addEventListener("submit", handlePostSubmit);
  elements.characterForm?.addEventListener("submit", handleCharacterSubmit);
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
    ["characters", "chronicles/characters", (value) => { state.remoteCharacters = toArray(value); }]
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

function canEditCharacter(character) {
  return state.isAdmin || character.uid === state.user?.uid;
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
  const hasRoute = params.has("world") || params.has("thread") || window.location.hash.startsWith("#chronicle-post-");
  if (!hasRoute) {
    state.routeApplied = true;
    return;
  }
  navigateChronicleRoute(new URL(window.location.href), { replace: true, render: false });
}

function navigateChronicleRoute(url, options = {}) {
  const anchor = decodeURIComponent((url.hash || "").replace(/^#/, ""));
  const postId = anchor.startsWith("chronicle-post-") ? anchor.replace("chronicle-post-", "") : "";
  const linkedPost = postId ? findPostById(postId) : null;
  const worldId = url.searchParams.get("world") || linkedPost?.worldId || state.selectedWorldId;
  const threadId = url.searchParams.get("thread") || linkedPost?.threadId || state.selectedThreadId;
  const world = getWorld(worldId);
  const thread = world ? getThread(world.id, threadId) : null;

  if (!world || !thread) return;

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
  const raw = String(value || "");
  if (window.marked && window.DOMPurify) {
    window.marked.setOptions({
      breaks: true,
      gfm: true
    });
    return window.DOMPurify.sanitize(window.marked.parse(raw), {
      ADD_ATTR: ["target", "rel"]
    });
  }
  return renderParagraphs(raw);
}

function applyMarkdown(type) {
  const textarea = document.getElementById("chroniclesPostBody");
  if (!textarea) return;
  const start = textarea.selectionStart || 0;
  const end = textarea.selectionEnd || 0;
  const selected = textarea.value.slice(start, end);
  const fallback = selected || "text";
  const wrappers = {
    bold: [`**${fallback}**`, 2, 2],
    italic: [`*${fallback}*`, 1, 1],
    heading: [`## ${fallback}`, 3, 0],
    quote: [`> ${fallback}`, 2, 0],
    list: [`- ${fallback}`, 2, 0],
    code: selected.includes("\n") ? [`\`\`\`\n${fallback}\n\`\`\``, 4, 4] : [`\`${fallback}\``, 1, 1],
    link: [`[${fallback}](https://example.com)`, 1, 22],
    image: [`![${fallback}](https://example.com/image.jpg)`, 2, 31]
  };
  const [replacement, cursorStartOffset, cursorEndOffset] = wrappers[type] || [fallback, 0, 0];
  textarea.setRangeText(replacement, start, end, "select");
  textarea.selectionStart = start + cursorStartOffset;
  textarea.selectionEnd = start + replacement.length - cursorEndOffset;
  textarea.focus();
  if (elements.postPreview && !elements.postPreview.classList.contains("d-none")) renderPostPreview(true);
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

function setInputValue(id, value) {
  const input = document.getElementById(id);
  if (input) input.value = value ?? "";
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
