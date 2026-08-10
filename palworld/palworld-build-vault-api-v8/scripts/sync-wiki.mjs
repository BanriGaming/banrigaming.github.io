import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as cheerio from "cheerio";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data");
const RAW_DIR = path.join(DATA_DIR, "raw");
const API = process.env.PALWORLD_WIKI_API || "https://palworld.wiki.gg/api.php";
const USER_AGENT = process.env.PALWORLD_USER_AGENT || "PalLoadoutVault/3.0 (personal build planner; contact: set PALWORLD_USER_AGENT)";
const REQUEST_DELAY = Number(process.env.PALWORLD_REQUEST_DELAY || 175);

const TABLE_CANDIDATES = {
  pals: ["Pal", "Pals"],
  work: ["PalWorkSuitability", "WorkSuitability", "Pal_Work_Suitability"],
  activeSkills: ["ActiveSkill", "ActiveSkills"],
  palActiveSkills: ["PalActiveSkill", "PalActiveSkills", "PalSkills"],
  passiveSkills: ["PassiveSkill", "PassiveSkills"],
  fixedPassives: ["PalPassiveSkill", "PalPassiveSkills", "FixedPassiveSkill"],
  drops: ["PalDrop", "PalDrops", "Drops"],
  partnerSkills: ["PartnerSkill", "PartnerSkills"]
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (value) => String(value ?? "").replace(/<[^>]*>/g, " ").replace(/\[\[[^\]|]*\|([^\]]+)\]\]/g, "$1").replace(/\[\[|\]\]/g, "").replace(/\s+/g, " ").trim();
const key = (value) => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
const split = (value) => clean(value).split(/\s*(?:,|;|\/|\||•|<br\s*\/?>)\s*/i).filter(Boolean);

async function fetchJson(params) {
  const url = new URL(API);
  Object.entries({ format: "json", formatversion: "2", origin: "*", ...params }).forEach(([k, v]) => url.searchParams.set(k, String(v)));
  const response = await fetch(url, { headers: { "User-Agent": USER_AGENT, Accept: "application/json" } });
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${url}`);
  await sleep(REQUEST_DELAY);
  const body = await response.json();
  if (body.error) throw new Error(`${body.error.code}: ${body.error.info}`);
  return body;
}


async function fetchPageImages(pageNames) {
  const result = new Map();
  const unique = [...new Set(pageNames.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const titles = unique.slice(i, i + 50);
    const body = await fetchJson({
      action: "query",
      prop: "pageimages",
      piprop: "thumbnail|original|name",
      pithumbsize: 360,
      redirects: 1,
      titles: titles.join("|")
    });
    for (const page of body.query?.pages || []) {
      if (page.missing) continue;
      const record = {
        imageName: page.pageimage || "",
        thumbnail: page.thumbnail?.source || "",
        imageUrl: page.original?.source || page.thumbnail?.source || ""
      };
      result.set(key(page.title), record);
      for (const redirect of body.query?.redirects || []) {
        if (key(redirect.to) === key(page.title)) result.set(key(redirect.from), record);
      }
    }
  }
  return result;
}


function normalizeFileTitle(value) {
  const raw = clean(value).replace(/^:+/, "").trim();
  if (!raw) return "";
  return /^File:/i.test(raw) ? raw : `File:${raw}`;
}

function absoluteWikiUrl(value) {
  if (!value) return "";
  if (value.startsWith("//")) return `https:${value}`;
  if (value.startsWith("/")) return new URL(value, API).href;
  return value;
}

function fileKey(value) {
  return key(String(value || "").replace(/^File:/i, ""));
}

async function fetchPageImageCandidates(pageNames) {
  const result = new Map();
  const unique = [...new Set(pageNames.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const body = await fetchJson({
      action: "query", prop: "images", imlimit: "max", redirects: 1,
      titles: unique.slice(i, i + 50).join("|")
    });
    for (const page of body.query?.pages || []) {
      const pageKey = key(page.title);
      const names = (page.images || []).map((x) => normalizeFileTitle(x.title)).filter(Boolean);
      const scored = names.map((title) => {
        const normalized = fileKey(title);
        let score = 0;
        if (normalized.includes(pageKey)) score += 100;
        if (/(?:^|[^a-z])(icon|menu|portrait|paldeck)(?:[^a-z]|$)/i.test(title)) score += 45;
        if (/_icon\./i.test(title)) score += 55;
        if (/(render|character|pal)/i.test(title)) score += 10;
        if (/(map|habitat|breeding|skill|partner|saddle|alpha|helm|mutton|effigy|location|logo|element)/i.test(title)) score -= 80;
        return { title, score };
      }).filter((item) => item.score > 0).sort((a, b) => b.score - a.score);
      if (scored.length) result.set(pageKey, scored.map((item) => item.title));
    }
  }
  return result;
}

async function resolveFileUrls(fileTitles) {
  const result = new Map();
  const unique = [...new Set(fileTitles.filter(Boolean).map(normalizeFileTitle))];
  for (let i = 0; i < unique.length; i += 50) {
    const body = await fetchJson({
      action: "query", prop: "imageinfo", iiprop: "url|mime|canonicaltitle", iiurlwidth: 420,
      titles: unique.slice(i, i + 50).join("|")
    });
    for (const page of body.query?.pages || []) {
      if (page.missing) continue;
      const info = page.imageinfo?.[0];
      if (!info) continue;
      const record = {
        title: page.title,
        thumbnail: absoluteWikiUrl(info.thumburl || info.url || ""),
        imageUrl: absoluteWikiUrl(info.url || info.thumburl || ""),
        mime: info.mime || ""
      };
      result.set(fileKey(page.title), record);
    }
  }
  return result;
}

function conventionalImageTitles(pal) {
  const name = pal.name.trim();
  const cargo = normalizeFileTitle(pal.image);
  return [...new Set([
    cargo,
    `File:${name}_icon.png`,
    `File:${name} icon.png`,
    `File:${name}_menu.png`,
    `File:${name} menu.png`,
    `File:${name}.png`
  ].filter(Boolean))];
}

async function fetchParsedPageImage(pageName) {
  try {
    const body = await fetchJson({ action: "parse", page: pageName, prop: "text" });
    const $ = cheerio.load(body.parse?.text || "");
    const pageKey = key(pageName);
    const selectors = [
      ".pal-infobox img", ".portable-infobox img", ".infobox img",
      "figure img", ".mw-parser-output img"
    ];
    const candidates = [];
    for (const selector of selectors) {
      $(selector).each((_, node) => {
        const src = absoluteWikiUrl($(node).attr("data-src") || $(node).attr("src") || "");
        const alt = $(node).attr("alt") || "";
        if (!src || /logo|element|skill|advert|wiki/i.test(`${src} ${alt}`)) return;
        let score = selector.includes("infobox") ? 70 : 10;
        if (key(`${src} ${alt}`).includes(pageKey)) score += 80;
        if (/icon|menu|portrait|render/i.test(`${src} ${alt}`)) score += 25;
        candidates.push({ src, score });
      });
      if (candidates.some((x) => x.score >= 70)) break;
    }
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.src || "";
  } catch (error) {
    console.warn(`image HTML fallback: ${pageName} (${error.message})`);
    return "";
  }
}

async function attachPalImageLinks(pals) {
  const pageImages = await fetchPageImages(pals.map((pal) => pal.name));
  const embedded = await fetchPageImageCandidates(pals.map((pal) => pal.name));

  const allTitles = [];
  for (const pal of pals) {
    allTitles.push(...conventionalImageTitles(pal));
    allTitles.push(...(embedded.get(key(pal.name)) || []));
  }
  const resolved = await resolveFileUrls(allTitles);

  let found = 0;
  for (const pal of pals) {
    const candidates = [];
    const pageImage = pageImages.get(key(pal.name));
    const titleCandidates = [
      ...conventionalImageTitles(pal),
      ...(embedded.get(key(pal.name)) || [])
    ];

    for (const title of titleCandidates) {
      const record = resolved.get(fileKey(title));
      if (!record) continue;
      pal.imageName ||= record.title;
      candidates.push(record.thumbnail, record.imageUrl);
    }
    if (pageImage) {
      pal.imageName ||= pageImage.imageName;
      candidates.push(pageImage.thumbnail, pageImage.imageUrl);
    }

    let unique = [...new Set(candidates.filter(Boolean))];
    if (!unique.length) {
      const parsed = await fetchParsedPageImage(pal.name);
      if (parsed) unique.push(parsed);
    }

    pal.imageCandidates = unique;
    pal.thumbnail = unique[0] || "";
    pal.imageUrl = unique.find((url) => !/\/thumb\//i.test(url)) || unique[0] || "";
    if (unique.length) found += 1;
  }
  console.log(`Resolved linked portraits for ${found}/${pals.length} Pals.`);
}

async function discoverTables() {
  try {
    const body = await fetchJson({ action: "cargotables" });
    const candidates = body.cargotables || body.tables || body;
    if (Array.isArray(candidates)) return candidates.map((x) => typeof x === "string" ? x : x.name || x.table || x._table).filter(Boolean);
    return Object.keys(candidates || {});
  } catch (error) {
    console.warn(`Cargo table discovery was unavailable: ${error.message}`);
    return [];
  }
}

async function discoverFields(table) {
  try {
    const body = await fetchJson({ action: "cargofields", table });
    const source = body.cargofields || body.fields || body;
    if (Array.isArray(source)) return source.map((x) => typeof x === "string" ? x : x.name || x.field).filter(Boolean);
    return Object.keys(source || {}).filter((x) => !["batchcomplete"].includes(x));
  } catch {
    // Cargo installations do not always expose cargofields. The table page is a reliable fallback.
    const body = await fetchJson({ action: "parse", page: `Special:CargoTables/${table}`, prop: "text" });
    const $ = cheerio.load(body.parse?.text || "");
    const fields = [];
    $("table tr").each((_, row) => {
      const first = $(row).find("th,td").first().text().trim();
      if (first && !/field name/i.test(first)) fields.push(first);
    });
    return [...new Set(fields)];
  }
}

async function cargoAll(table, fields) {
  const rows = [];
  let offset = 0;
  const selected = ["_pageName", ...fields.filter((x) => x !== "_pageName")];
  while (true) {
    const body = await fetchJson({ action: "cargoquery", tables: table, fields: selected.join(","), limit: 500, offset });
    const batch = (body.cargoquery || []).map((row) => row.title || row);
    rows.push(...batch);
    if (batch.length < 500) break;
    offset += batch.length;
  }
  return rows;
}

function chooseTable(available, candidates) {
  const map = new Map(available.map((name) => [key(name), name]));
  for (const candidate of candidates) if (map.has(key(candidate))) return map.get(key(candidate));
  return candidates[0];
}

function value(row, aliases) {
  const map = new Map(Object.entries(row || {}).map(([k, v]) => [key(k), v]));
  for (const alias of aliases) if (map.has(key(alias)) && clean(map.get(key(alias)))) return map.get(key(alias));
  return "";
}
function number(row, aliases) { const found = clean(value(row, aliases)).match(/-?\d+(?:\.\d+)?/); return found ? Number(found[0]) : null; }
function palName(row) { return clean(value(row, ["Pal", "Pal Name", "Name", "_pageName", "Page"])); }

function normalizeActive(row) {
  const name = clean(value(row, ["Active Skill", "Skill", "Name", "_pageName"]));
  return { id: key(value(row,["Internal Name","Code Name","ID"]) || name), name, element: clean(value(row,["Element","Type"])), power: number(row,["Power","Damage"]), cooldown: number(row,["Cooldown","CT"]), description: clean(value(row,["Description","Effect"])), skillFruit: /yes|true|1/i.test(clean(value(row,["Skill Fruit","Fruit"]))) || null, exclusiveTo: split(value(row,["Exclusive To","Pal","Pals"])), raw: row };
}
function normalizePassive(row) {
  const name = clean(value(row, ["Passive Skill", "Skill", "Name", "_pageName"]));
  return { id: key(value(row,["Internal Name","Code Name","ID"]) || name), name, rank: number(row,["Rank","Tier"]), description: clean(value(row,["Description","Effect","Effects"])), category: clean(value(row,["Category","Type"])), obtainable: clean(value(row,["Obtainable","Availability"])), fixedPals: split(value(row,["Pal","Pals","Fixed To"])), raw: row };
}

function normalizePals(rawPals, workRows, learnedRows, dropRows, partnerRows, fixedRows) {
  const workByPal = group(workRows, palName);
  const learnedByPal = group(learnedRows, palName);
  const dropsByPal = group(dropRows, palName);
  const partnerByPal = group(partnerRows, palName);
  const fixedByPal = group(fixedRows, palName);
  return rawPals.map((row) => {
    const name = palName(row);
    const work = {};
    for (const item of workByPal.get(key(name)) || []) {
      const type = clean(value(item,["Work Suitability","Suitability","Work","Type","Job"]));
      const level = number(item,["Level","Rank","Value"]);
      if (type) work[type] = level;
    }
    // Some wiki schemas store suitability levels directly on the Pal row.
    for (const [field, rawValue] of Object.entries(row)) {
      const normalized = key(field);
      const known = ["kindling","watering","planting","generatingelectricity","electricity","handiwork","gathering","lumbering","logging","mining","medicineproduction","medicine","cooling","transporting","farming"];
      if (known.includes(normalized)) { const n=String(rawValue).match(/\d+/); if(n) work[field.replace(/_/g," ")] = Number(n[0]); }
    }
    const partnerRow = (partnerByPal.get(key(name)) || [])[0] || row;
    const activeSkills = (learnedByPal.get(key(name)) || []).map((x) => ({ name: clean(value(x,["Active Skill","Skill","Name"])), level: number(x,["Level","Learn Level"]), source: clean(value(x,["Source","Method"])) })).filter(x=>x.name);
    const drops = (dropsByPal.get(key(name)) || []).map((x) => ({ item: clean(value(x,["Item","Drop","Name"])), rate: clean(value(x,["Rate","Chance","Probability"])), quantity: clean(value(x,["Quantity","Amount"])) })).filter(x=>x.item);
    const fixedPassives = (fixedByPal.get(key(name)) || []).map((x)=>clean(value(x,["Passive Skill","Skill","Name"]))).filter(Boolean);
    return {
      id: clean(value(row,["Internal Name","Code Name","ID"])) || key(name), name,
      paldeckNumber: clean(value(row,["Paldeck Number","Paldeck No","Number","No."])), variant: clean(value(row,["Variant","Subspecies"])),
      elements: split(value(row,["Elements","Element","Types","Type"])), description: clean(value(row,["Description","Summary"])),
      image: clean(value(row,["Image","Icon","File"])), size: clean(value(row,["Size"])), rarity: number(row,["Rarity"]),
      stats: { hp: number(row,["HP","Health"]), meleeAttack: number(row,["Melee Attack","Melee"]), shotAttack: number(row,["Shot Attack","Attack","Ranged Attack"]), defense: number(row,["Defense"]), stamina: number(row,["Stamina"]), support: number(row,["Support"]), movementSpeed: number(row,["Movement Speed","Run Speed"]), sprintSpeed: number(row,["Sprint Speed"]) },
      workSuitability: work,
      partnerSkill: { name: clean(value(partnerRow,["Partner Skill","Skill Name","Name"])), description: clean(value(partnerRow,["Partner Skill Description","Description","Effect"])) },
      activeSkills, fixedPassives, drops,
      food: number(row,["Food","Food Consumption"]), breedingPower: number(row,["Breeding Power","Breeding Rank"]), price: number(row,["Price","Sale Price"]),
      wikiUrl: `https://palworld.wiki.gg/wiki/${encodeURIComponent(name.replace(/ /g,"_"))}`, raw: row
    };
  }).filter((pal)=>pal.name).sort((a,b)=>String(a.paldeckNumber).localeCompare(String(b.paldeckNumber),undefined,{numeric:true}) || a.name.localeCompare(b.name));
}
function group(rows, getName) { const map=new Map(); for(const row of rows){const name=key(getName(row)); if(!name)continue; if(!map.has(name))map.set(name,[]); map.get(name).push(row);} return map; }

async function writeJson(file, value) { await fs.writeFile(path.join(DATA_DIR,file), JSON.stringify(value,null,2)+"\n"); }

async function main() {
  await fs.mkdir(RAW_DIR,{recursive:true});
  const available = await discoverTables();
  const selected = Object.fromEntries(Object.entries(TABLE_CANDIDATES).map(([kind,candidates])=>[kind,chooseTable(available,candidates)]));
  console.log("Selected Cargo tables:", selected);
  const tables = {};
  for (const [kind, table] of Object.entries(selected)) {
    try {
      const fields = await discoverFields(table);
      if (!fields.length) throw new Error("No fields discovered");
      const rows = await cargoAll(table, fields);
      tables[kind] = rows;
      await fs.writeFile(path.join(RAW_DIR,`${kind}.json`),JSON.stringify({table,fields,rows},null,2)+"\n");
      console.log(`${kind}: ${rows.length} rows from ${table}`);
    } catch (error) {
      console.warn(`${kind}: skipped ${table} (${error.message})`);
      tables[kind] = [];
    }
  }
  if (!tables.pals.length) throw new Error("No Pal records were returned. Set table overrides in TABLE_CANDIDATES after checking Special:CargoTables on the wiki.");
  const activeSkills=tables.activeSkills.map(normalizeActive).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name));
  const passiveSkills=tables.passiveSkills.map(normalizePassive).filter(x=>x.name).sort((a,b)=>a.name.localeCompare(b.name));
  const pals=normalizePals(tables.pals,tables.work,tables.palActiveSkills,tables.drops,tables.partnerSkills,tables.fixedPassives);
  console.log("Resolving Pal image links...");
  await attachPalImageLinks(pals);
  const elements=[...new Set([...pals.flatMap(x=>x.elements),...activeSkills.map(x=>x.element)].filter(Boolean))].sort();
  const missingImagePals=pals.filter((pal)=>!pal.imageCandidates?.length).map((pal)=>pal.name);
  const manifest={schemaVersion:3,source:"The Palworld Wiki (wiki.gg)",api:API,generatedAt:new Date().toISOString(),license:"CC BY-SA 4.0 unless otherwise noted on the source page",counts:{pals:pals.length,activeSkills:activeSkills.length,passiveSkills:passiveSkills.length,linkedPalImages:pals.length-missingImagePals.length},missingImagePals,tables:selected};
  await Promise.all([writeJson("pals.json",pals),writeJson("active-skills.json",activeSkills),writeJson("passive-skills.json",passiveSkills),writeJson("elements.json",elements),writeJson("manifest.json",manifest)]);
  const browserData={manifest,elements:["",...elements],pals:pals.map(x=>x.name),palDetails:pals,activeSkills:["",...activeSkills.map(x=>x.name)],activeSkillDetails:activeSkills,passiveSkills:["",...passiveSkills.map(x=>x.name)],passiveSkillDetails:passiveSkills};
  await fs.writeFile(path.join(ROOT,"pal-data.js"),`/* Generated by npm run sync:data. Do not edit manually. */\nwindow.PALWORLD_DATA = ${JSON.stringify(browserData,null,2)};\n`);
  console.log(`Wrote ${pals.length} Pals, ${activeSkills.length} active skills, and ${passiveSkills.length} passive skills.`);
}
main().catch((error)=>{console.error(error);process.exitCode=1;});
