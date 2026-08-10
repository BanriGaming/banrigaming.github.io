import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const DATA_DIR = path.join(ROOT, 'data');
const RAW_DIR = path.join(DATA_DIR, 'raw', 'palpedia');
const BASE = process.env.PALPEDIA_BASE || 'https://www.palpedia.net';
const USER_AGENT = process.env.PALWORLD_USER_AGENT || 'PalLoadoutVault/7.7 (+local personal data sync)';
const DELAY = Math.max(750, Number(process.env.PALPEDIA_DELAY_MS || 1800));
const CONCURRENCY = Math.max(1, Math.min(2, Number(process.env.PALPEDIA_CONCURRENCY || 1)));
const FORCE_REFRESH = /^(1|true|yes)$/i.test(process.env.PALPEDIA_REFRESH || '');
const INCLUDE_ALPHA_PAGES = /^(1|true|yes)$/i.test(process.env.PALPEDIA_INCLUDE_ALPHA || '');
let globalNextRequestAt = 0;
const SUITABILITIES = ['Kindling','Watering','Planting','Generating Electricity','Handiwork','Gathering','Lumbering','Mining','Medicine Production','Cooling','Transporting','Farming'];

const sleep = ms => new Promise(r => setTimeout(r, ms));
const clean = v => String(v ?? '').replace(/\u00a0/g, ' ').replace(/\s+/g, ' ').trim();
const key = v => clean(v).toLowerCase().replace(/[^a-z0-9]/g, '');
const num = v => { const m = clean(v).replace(/,/g,'').match(/-?\d+(?:\.\d+)?/); return m ? Number(m[0]) : null; };
const uniq = xs => [...new Set(xs.filter(Boolean))];
const absolute = value => { try { return new URL(value, BASE).href; } catch { return ''; } };

async function fetchText(url, attempts=8) {
  let last;
  for (let i=0;i<attempts;i++) {
    try {
      const waitForSlot = Math.max(0, globalNextRequestAt - Date.now());
      if (waitForSlot) await sleep(waitForSlot);
      globalNextRequestAt = Date.now() + DELAY;

      const res = await fetch(url, {
        headers:{
          'User-Agent':USER_AGENT,
          Accept:'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language':'en-US,en;q=0.9',
          Referer:`${BASE}/`
        }
      });

      if (res.status === 429) {
        const retryHeader = res.headers.get('retry-after');
        const retrySeconds = retryHeader && /^\d+$/.test(retryHeader) ? Number(retryHeader) : 15 * (i + 1);
        const waitMs = Math.min(120000, Math.max(15000, retrySeconds * 1000));
        console.warn(`Rate limited by Palpedia. Waiting ${Math.ceil(waitMs/1000)}s before retry ${i+1}/${attempts}...`);
        globalNextRequestAt = Date.now() + waitMs;
        await sleep(waitMs);
        last = new Error('429 Too Many Requests');
        continue;
      }

      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      return await res.text();
    } catch (e) {
      last=e;
      const waitMs = Math.min(30000, 1000 * (2 ** i));
      await sleep(waitMs);
    }
  }
  throw new Error(`${url}: ${last?.message || last}`);
}
async function readJson(file, fallback=[]) { try{return JSON.parse(await fs.readFile(path.join(DATA_DIR,file),'utf8'));}catch{return fallback;} }
async function writeJson(file, value) { await fs.writeFile(path.join(DATA_DIR,file), JSON.stringify(value,null,2)+'\n'); }

async function sitemapUrls() {
  const seeds = [`${BASE}/sitemap.xml`,`${BASE}/sitemap_index.xml`];
  const seen = new Set(), pages = new Set();
  async function visit(url, depth=0) {
    if (seen.has(url)||depth>3) return; seen.add(url);
    let xml; try { xml=await fetchText(url); } catch { return; }
    const $=cheerio.load(xml,{xmlMode:true});
    const locs=$('loc').map((_,x)=>clean($(x).text())).get();
    for(const loc of locs){ if(/sitemap.*\.xml/i.test(loc)) await visit(loc,depth+1); else pages.add(loc); }
  }
  for(const s of seeds) await visit(s);
  return [...pages];
}

function headingSection($, matcher) {
  const heading = $('h1,h2,h3,h4').filter((_,el)=>matcher.test(clean($(el).text()))).first();
  if(!heading.length) return $();
  const level=Number(heading[0].name.slice(1)); const nodes=[];
  let n=heading.next();
  while(n.length){ if(/^h[1-4]$/.test(n[0]?.name||'') && Number(n[0].name.slice(1))<=level) break; nodes.push(n[0]); n=n.next(); }
  return $(nodes);
}
function parseLabelValuePairs($, root=$.root()) {
  const out={};
  root.find('table tr').each((_,tr)=>{const cells=$(tr).find('th,td');if(cells.length>=2){const k=clean($(cells[0]).text());const v=clean($(cells.slice(1)).text());if(k&&v)out[k]=v;}});
  root.find('dl').each((_,dl)=>{$(dl).find('dt').each((_,dt)=>{const k=clean($(dt).text()),v=clean($(dt).next('dd').text());if(k&&v)out[k]=v;});});
  return out;
}
function lookup(obj, aliases){const map=new Map(Object.entries(obj).map(([k,v])=>[key(k),v]));for(const a of aliases){if(map.has(key(a)))return map.get(key(a));}return '';}
function bestImage($, pageName, html='') {
  const candidates=[];
  const push=(src,score=0)=>{
    src=absolute(clean(src).split(/\s+/)[0]);
    if(!src||!/\.(?:png|webp|jpe?g)(?:[?#]|$)/i.test(src)||/logo|banner|advert|favicon/i.test(src))return;
    let bonus=0;
    if(/palpedia\.azrocdn\.com\/pals\//i.test(src)) bonus+=160;
    if(/icon_normal/i.test(src)) bonus+=80;
    if(key(src).includes(key(pageName))) bonus+=40;
    candidates.push({src,score:score+bonus});
  };
  push($('meta[property="og:image"]').attr('content'),120);
  push($('meta[name="twitter:image"]').attr('content'),110);
  $('link[rel="image_src"],link[rel="preload"][as="image"]').each((_,x)=>push($(x).attr('href'),100));
  $('a[href]').each((_,a)=>push($(a).attr('href'),90));
  $('img,source').each((_,img)=>{
    const alt=clean($(img).attr('alt')); let score=20;
    if(key(alt).includes(key(pageName)))score+=80;
    for(const attr of ['src','data-src','data-lazy-src','data-nuxt-img','srcset']){
      const raw=$(img).attr(attr)||'';
      raw.split(',').forEach(part=>push(part.trim().split(/\s+/)[0],score));
    }
  });
  const decoded=html.replace(/\\u002F/gi,'/').replace(/\\\//g,'/');
  for(const m of decoded.matchAll(/https?:\/\/[^"'\s<>]+?\.(?:png|webp|jpe?g)(?:\?[^"'\s<>]*)?/gi)) push(m[0],70);
  candidates.sort((a,b)=>b.score-a.score);
  return uniq(candidates.map(x=>x.src));
}
function parseWork($) {
  const out={}; const section=headingSection($,/work skills?|work suitabilit/i);
  const text=clean(section.text());
  for(const s of SUITABILITIES){const variants=[s,s.replace('Generating Electricity','generatingElectricity').replace('Medicine Production','medicineProduction')];for(const v of variants){const m=text.match(new RegExp(`${v.replace(/ /g,'\\s*')}\\s*(?:Lv\\.?\\s*)?(10|[0-9])`,'i'));if(m){out[s]=Number(m[1]);break;}}}
  section.find('img').each((_,img)=>{const alt=clean($(img).attr('alt')).replace(/^image:\s*/i,'');const parent=clean($(img).parent().parent().text());const suit=SUITABILITIES.find(x=>key(x)===key(alt)||key(parent).includes(key(x)));const n=parent.match(/(?:Lv\.?\s*)?(10|[0-9])\b/i);if(suit&&n)out[suit]=Number(n[1]);});
  return out;
}
function parseActiveSkills($) {
  const section=headingSection($,/^active skills?$/i); const items=[];
  const headings=section.find('h3,h4,strong').toArray();
  for(const h of headings){const name=clean($(h).text());if(!name||/active skills?|PWR|RNG|CLD/i.test(name))continue;const block=clean($(h).parent().text());const level=num(block.match(/Lv\.?\s*\d+/i)?.[0]);const power=num(block.match(/PWR\s*\d+/i)?.[0]);const cooldown=num(block.match(/CLD\s*\d+/i)?.[0]);if(power!==null||cooldown!==null)items.push({name,level,power,cooldown,description:''});}
  if(!items.length){
    const text=clean(section.text()); const re=/Lv\.?\s*(\d+)\s+([A-Z][A-Za-z0-9'’\- ]+?)\s+(?:Exclusive\s+)?(?:Melee|Shot|Support)[\s\S]*?PWR\s*(\d+)[\s\S]*?CLD\s*(\d+)/g;
    let m;while((m=re.exec(text)))items.push({name:clean(m[2]),level:Number(m[1]),power:Number(m[3]),cooldown:Number(m[4]),description:''});
  }
  return [...new Map(items.map(x=>[key(x.name),x])).values()];
}
function parsePassives($) {
  const section=headingSection($,/^passive skills?$/i); const names=[];
  section.find('h3,h4,strong,a').each((_,x)=>{const t=clean($(x).text());if(t&&!/passive skills?|rank|image/i.test(t)&&t.length<90)names.push(t);});
  return uniq(names);
}
function parseDrops($){const section=headingSection($,/^drops?$/i);const drops=[];section.find('tr').each((_,tr)=>{const c=$(tr).find('th,td').map((_,x)=>clean($(x).text())).get();if(c.length)drops.push({item:c[0],quantity:c[1]||'',rate:c[2]||''});});return drops.filter(x=>x.item&&!/^drops?$/i.test(x.item));}
function pageTitle($){return clean($('h1').first().text()).replace(/^\d+\.\s*/,'')||clean($('title').text().split('-')[0]);}
function palNameFromUrl(url) {
  try {
    const slug = decodeURIComponent(new URL(url).pathname.match(/^\/pals\/([^/]+)\/?$/i)?.[1] || '');
    return clean(slug.replace(/[-_]+/g, ' '));
  } catch { return ''; }
}
function looksLikePalPage($, html, expectedName) {
  const body = clean($('body').text());
  if (!expectedName || html.length < 500) return false;
  if (/404|page not found|not found/i.test(clean($('title').text())) && !body.toLowerCase().includes(expectedName.toLowerCase())) return false;
  const signals = [
    /Partner Skill/i.test(body),
    /Work Suitabilit/i.test(body),
    /Active Skills?/i.test(body),
    /Paldeck|Pal No\.?|Classification/i.test(body),
    key(body).includes(key(expectedName))
  ].filter(Boolean).length;
  return signals >= 2;
}

function parsePal(html,url){
  const $=cheerio.load(html);
  const urlName=palNameFromUrl(url);
  const headingName=pageTitle($);
  const name=urlName || headingName;
  if (!looksLikePalPage($, html, name)) return null;
  const all=parseLabelValuePairs($); const text=clean($('main,article,body').first().text());
  const numberMatch=clean($('h3').first().text()).match(/#\s*(\d+[A-Za-z]?)/)||text.match(/#\s*(\d+[A-Za-z]?)/);
  const description=clean(headingSection($,/^description$/i).first().text()) || clean($('meta[name="description"]').attr('content'));
  const elements=uniq($('img[alt]').map((_,x)=>clean($(x).attr('alt')).replace(/^image:\s*/i,'')).get().filter(x=>['Neutral','Fire','Water','Grass','Ground','Electric','Ice','Dark','Dragon'].includes(x)));
  const partnerSec=headingSection($,/partner skill/i); const partnerHeading=$('h1,h2,h3,h4').filter((_,x)=>/partner skill/i.test(clean($(x).text()))).first();
  const partnerName=clean(partnerHeading.text()).replace(/^.*partner skill\s*:?\s*/i,'') || clean(partnerSec.find('h3,h4,strong').first().text());
  const statsSec=headingSection($,/^stats$/i), moveSec=headingSection($,/^movement$/i);
  const stats={...parseLabelValuePairs($,statsSec),...all}; const movement=parseLabelValuePairs($,moveSec);
  const imageCandidates=bestImage($,name,html);
  return {
    id:key(name), name, paldeckNumber:numberMatch?.[1]||'', variant:/^Alpha\s/i.test(name)?'Alpha':'', elements, description,
    imageCandidates, thumbnail:imageCandidates[0]||'', imageUrl:imageCandidates[0]||'',
    size:lookup(stats,['Size']), rarity:num(lookup(stats,['Rarity'])),
    stats:{hp:num(lookup(stats,['Hp','HP','Health'])),shotAttack:num(lookup(stats,['Base attack','Attack'])),defense:num(lookup(stats,['Defense'])),support:num(lookup(stats,['Support'])),craftSpeed:num(lookup(stats,['Craft speed'])),foodAmount:num(lookup(stats,['Food amount'])),maxFullStomach:num(lookup(stats,['Max full stomach'])),combiRank:num(lookup(stats,['Combi rank'])),maleProbability:num(lookup(stats,['Male probability'])),enemyReceiveDamageRate:num(lookup(stats,['Enemy receive damage rate'])),enemyInflictDamageRate:num(lookup(stats,['Enemy inflict damage rate']))},
    movement:{slowWalkSpeed:num(lookup(movement,['Slow walk speed'])),runSpeed:num(lookup(movement,['Run speed'])),rideSprintSpeed:num(lookup(movement,['Ride sprint speed'])),transportSpeed:num(lookup(movement,['Transport speed'])),swimSpeed:num(lookup(movement,['Swim speed'])),swimDashSpeed:num(lookup(movement,['Swim dash speed']))},
    bestWorkSuitability:lookup(stats,['Best work suitability']), workSuitability:parseWork($),
    partnerSkill:{name:partnerName,description:clean(partnerSec.text()).replace(partnerName,'').slice(0,1600)},
    activeSkills:parseActiveSkills($), fixedPassives:parsePassives($), drops:parseDrops($),
    food:num(lookup(stats,['Food','Food amount','Food consumption','Hunger'])),
    breedingPower:num(lookup(stats,['Breeding power','BreedingPower','Breeding rank'])),
    price:num(lookup(stats,['Price','Sale price','Selling price','Vendor price'])),
    source:'Palpedia.net', sourceUrl:url, syncedAt:new Date().toISOString(), raw:{labels:all}
  };
}

function parseEmbeddedObjects(html){
  const found=[];
  const visit=(v,depth=0)=>{if(depth>12||v==null)return;if(Array.isArray(v)){v.forEach(x=>visit(x,depth+1));return;}if(typeof v==='object'){found.push(v);Object.values(v).forEach(x=>visit(x,depth+1));}};
  const $=cheerio.load(html);
  $('script').each((_,el)=>{const raw=$(el).html()?.trim();if(!raw)return;for(const candidate of [raw,raw.replace(/^window\.__NUXT__\s*=\s*/,'').replace(/;$/,'')]){try{visit(JSON.parse(candidate));break}catch{}}});
  return found;
}
function decodeNextFlightText(html) {
  const chunks = [];
  const re = /self\.__next_f\.push\(\[1,"((?:\\.|[^"\\])*)"\]\)/g;
  let match;
  while ((match = re.exec(html))) {
    try {
      chunks.push(JSON.parse(`"${match[1]}"`));
    } catch {}
  }
  return chunks.join('\n');
}
function findMatchingBracket(text, start) {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
function parseNextFlightGames(html, itemType) {
  const text = decodeNextFlightText(html);
  const games = [];
  let cursor = 0;
  while (cursor < text.length) {
    const keyIndex = text.indexOf('"games":[', cursor);
    if (keyIndex === -1) break;
    const start = text.indexOf('[', keyIndex);
    const end = findMatchingBracket(text, start);
    if (end === -1) break;
    const trailer = text.slice(end + 1, end + 180);
    cursor = end + 1;
    if (itemType && !trailer.includes(`"itemType":"${itemType}"`)) continue;
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) games.push(...parsed);
    } catch {}
  }
  return games;
}
function exactNumber(value) {
  return typeof value === 'number' && Number.isFinite(value) ? value : num(value);
}
function normalizeActivePayloadRecord(entry, url) {
  const content = entry?.content || entry || {};
  const name = clean(content.name || entry?.title);
  if (!name) return null;
  return {
    id: key(content.id || entry.id || name),
    name,
    element: clean(content.element),
    category: clean(content.category),
    power: exactNumber(content.displayPower ?? content.power),
    cooldown: exactNumber(content.coolTime ?? content.cooldown),
    minRange: exactNumber(content.minRange),
    maxRange: exactNumber(content.maxRange),
    description: clean(content.description),
    skillFruit: content.skillFruit ?? null,
    exclusiveTo: Array.isArray(content.luckyPals) ? content.luckyPals : [],
    source: 'Palpedia.net',
    sourceUrl: url
  };
}
function normalizePassivePayloadRecord(entry, url) {
  const content = entry?.content || entry || {};
  const name = clean(content.name || entry?.title);
  if (!name) return null;
  return {
    id: key(content.id || entry.id || name),
    name,
    rank: exactNumber(content.rank),
    category: clean(content.category),
    type: clean(content.type),
    description: clean(content.description),
    effects: Array.isArray(content.effects) ? content.effects : [],
    lotteryWeight: exactNumber(content.lotteryWeight),
    obtainable: content.addPal === true ? 'Pal roll' : content.type === 'item' ? 'Item' : '',
    fixedPals: [],
    source: 'Palpedia.net',
    sourceUrl: url
  };
}
function firstValue(obj,names){for(const n of names){for(const [k,v] of Object.entries(obj||{})){if(key(k)===key(n)&&['string','number'].includes(typeof v))return v;}}return '';}
function parseSkillIndex(html,type,url){
  const $=cheerio.load(html); const rows=[];
  const add=(r)=>{if(!r.name||r.name.length>100)return;rows.push({...r,id:key(r.name),source:'Palpedia.net',sourceUrl:url});};
  parseNextFlightGames(html, type === 'active' ? 'ACTIVE_SKILL' : 'PASSIVE_SKILL')
    .map(entry => type === 'active' ? normalizeActivePayloadRecord(entry, url) : normalizePassivePayloadRecord(entry, url))
    .filter(Boolean)
    .forEach(add);
  $('main article, main li, main tr, article, [class*="card"], [class*="skill"]').each((_,node)=>{const t=clean($(node).text());if(!t||t.length>2400)return;const heading=clean($(node).find('h2,h3,h4,strong,a').first().text());if(!heading||/active skills?|passive skills?|filter|browse/i.test(heading))return;
    if(type==='active'){const power=num(t.match(/(?:PWR|Power)\s*[:|]?\s*\d+/i)?.[0]);const cooldown=num(t.match(/(?:CLD|Cooldown)\s*[:|]?\s*\d+/i)?.[0]);if(power!==null||cooldown!==null)add({name:heading,element:'',power,cooldown,description:t.replace(heading,'').slice(0,1000)});}
    else {const rank=num(t.match(/Rank\s*[:|]?\s*\d+/i)?.[0]);if(rank!==null||/[+-]\d+(?:\.\d+)?%/.test(t))add({name:heading,rank,description:t.replace(heading,'').slice(0,1000),category:'',obtainable:'',fixedPals:[]});}
  });
  for(const obj of parseEmbeddedObjects(html)){
    const name=clean(firstValue(obj,['name','skillName','displayName','Name'])); if(!name||/active skills?|passive skills?/i.test(name))continue;
    if(type==='active'){
      const power=num(firstValue(obj,['power','Power','damage','skillPower'])); const cooldown=num(firstValue(obj,['cooldown','CoolTime','coolTime','ct']));
      const desc=clean(firstValue(obj,['description','desc','effect','Description'])); const element=clean(firstValue(obj,['element','type','Element']));
      if(power!==null||cooldown!==null||desc)add({name,element,power,cooldown,description:desc});
    }else{
      const rank=num(firstValue(obj,['rank','Rank','tier'])); const desc=clean(firstValue(obj,['description','desc','effect','Description']));
      if(rank!==null||desc)add({name,rank,description:desc,category:clean(firstValue(obj,['category','type'])),obtainable:'',fixedPals:[]});
    }
  }
  return [...new Map(rows.map(x=>[key(x.name),x])).values()];
}
function mergeRecords(primary,fallback){const map=new Map(fallback.map(x=>[key(x.name),x]));for(const p of primary){const old=map.get(key(p.name))||{};map.set(key(p.name),deepMerge(old,p));}return [...map.values()].filter(x=>x.name);}
function deepMerge(a,b){if(Array.isArray(a)||Array.isArray(b))return (b?.length?b:a)||[];if(a&&b&&typeof a==='object'&&typeof b==='object'){const out={...a};for(const [k,v] of Object.entries(b)){if(v===null||v===''||(Array.isArray(v)&&!v.length))continue;out[k]=deepMerge(a[k],v);}return out;}return b??a;}
async function pool(items,worker){const out=new Array(items.length);let next=0;async function run(){while(true){const i=next++;if(i>=items.length)return;try{out[i]=await worker(items[i],i);}catch(e){console.warn(`Skipped ${items[i]}: ${e.message}`);}}}await Promise.all(Array.from({length:CONCURRENCY},run));return out.filter(Boolean);}

function palCachePath(url) {
  const slug = decodeURIComponent(new URL(url).pathname.split('/').filter(Boolean).pop() || 'unknown');
  return path.join(RAW_DIR, `${key(slug)}.html`);
}
async function readCachedPage(url) {
  if (FORCE_REFRESH) return '';
  try {
    const file = palCachePath(url);
    const html = await fs.readFile(file, 'utf8');
    return html.length > 500 ? html : '';
  } catch { return ''; }
}
function canonicalPalUrl(value) {
  try {
    const url = new URL(value, BASE);
    if (url.origin !== new URL(BASE).origin) return '';
    const match = url.pathname.match(/^\/pals\/([^/]+)\/?$/i);
    if (!match) return '';
    const slug = decodeURIComponent(match[1]).trim();
    if (!slug || /^alpha(?:[-_ ]|$)/i.test(slug) && !INCLUDE_ALPHA_PAGES) return '';
    return `${BASE}/pals/${encodeURIComponent(slug).replace(/%20/g, '%20')}`;
  } catch { return ''; }
}

function palUrlFromName(value) {
  let name = clean(value)
    .replace(/^#\s*\d+[A-Za-z]?\s*/, '')
    .replace(/\s+Details\s*$/i, '')
    .trim();
  if (!name || name.length > 90) return '';
  if (/^(Pal Checklist|Search by name|Details|Reset|Import\/Export|Pals?)$/i.test(name)) return '';
  if (/^Alpha\s+/i.test(name) && !INCLUDE_ALPHA_PAGES) return '';
  return `${BASE}/pals/${encodeURIComponent(name)}`;
}

function plausiblePalName(value) {
  const name = clean(value);
  if (!name || name.length < 2 || name.length > 90) return '';
  if (!/[A-Za-z]/.test(name) || /https?:|\/pals\/|Pal Checklist|Search by name|Paldeck pals only|Hide caught pals|Import\/Export|Reset/i.test(name)) return '';
  if (/^(Details|Image|New|Pals|Items|Base|Breed|Map|Builder|Skills|Expeditions|TCG)$/i.test(name)) return '';
  return name;
}

function extractPalNamesFromChecklist(html) {
  const names = [];
  const add = value => {
    const name = plausiblePalName(value);
    if (name) names.push(name);
  };
  const $ = cheerio.load(html);

  // The checklist's Details controls are buttons rather than links. Read the
  // nearest repeated row/card and take the text between the Paldeck number and
  // the word "Details".
  $('button, a, [role="button"]').filter((_, el) => /^Details$/i.test(clean($(el).text()))).each((_, el) => {
    let row = $(el).closest('tr,li,[class*="row"],[class*="item"],[class*="card"],div');
    for (let depth = 0; depth < 5 && row.length; depth++, row = row.parent()) {
      const text = clean(row.text());
      const match = text.match(/#\s*\d+[A-Za-z]?\s+(.+?)\s+Details\b/i);
      if (match) { add(match[1]); break; }
    }
  });

  // Server-rendered table/list rows.
  $('tr,li').each((_, el) => {
    const text = clean($(el).text());
    const match = text.match(/^#?\s*\d+[A-Za-z]?\s+(.+?)\s+Details\s*$/i);
    if (match) add(match[1]);
  });

  // Plain rendered page text, matching sequences such as
  // "#7 Celaray Details" even when the surrounding component has no semantic
  // row element.
  const bodyText = clean($('body').text());
  const textPattern = /#\s*\d+[A-Za-z]?\s+(.+?)\s+Details\b/gi;
  let match;
  while ((match = textPattern.exec(bodyText))) add(match[1]);

  // Decode serialized framework state and inspect both row-shaped strings and
  // common name properties. This covers client-rendered checklists whose data
  // is embedded in a script but whose rows are created only after JavaScript
  // starts.
  const decoded = html
    .replace(/\\u002F/gi, '/')
    .replace(/\\u0026/gi, '&')
    .replace(/\\u003C/gi, '<')
    .replace(/\\u003E/gi, '>')
    .replace(/\\u0022/gi, '"')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/g, '&');

  const serializedRow = /#\\?"?\s*\d+[A-Za-z]?[^A-Za-z0-9]{1,20}([A-Z][A-Za-z0-9'’ .:\-]+?)[^A-Za-z0-9]{1,20}Details\b/g;
  while ((match = serializedRow.exec(decoded))) add(match[1]);

  const nameProperty = /["'](?:name|palName|displayName)["']\s*:\s*["']([^"']+)["']/gi;
  while ((match = nameProperty.exec(decoded))) add(match[1]);

  return uniq(names);
}

function extractPalUrlsFromListing(html, mode='links') {
  if (mode === 'checklist') {
    return uniq(extractPalNamesFromChecklist(html).map(palUrlFromName).filter(Boolean));
  }

  const found = [];
  const add = value => {
    const canonical = canonicalPalUrl(value);
    if (canonical) found.push(canonical);
  };
  const $ = cheerio.load(html);
  $('a[href]').each((_, a) => add($(a).attr('href')));

  const decoded = html
    .replace(/\\u002F/gi, '/')
    .replace(/\\\//g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#x2F;/gi, '/')
    .replace(/&amp;/g, '&');
  const routePattern = /(?:https?:\\?\/\\?\/www\.palpedia\.net)?\\?\/pals\\?\/([^"'<>?#\\\s]+)/gi;
  let match;
  while ((match = routePattern.exec(decoded))) add(`/pals/${match[1].replace(/\\+$/g, '')}`);
  return uniq(found);
}

async function discoverFromListing(pathname, cacheName, mode='links') {
  const url = `${BASE}${pathname}`;
  const html = await fetchText(url);
  await fs.writeFile(path.join(RAW_DIR, cacheName), html);
  const urls = extractPalUrlsFromListing(html, mode);
  console.log(`${pathname} supplied ${urls.length} canonical Pal links.`);
  return urls;
}

async function discoverPalUrls() {
  // The canonical Pal roster is maintained in data/pal-names.json. Palpedia's
  // checklist is client-rendered, so a plain Node fetch cannot reliably see its
  // rows. Using the explicit roster avoids brittle DOM discovery and prevents
  // sitemap-only pages (Alpha encounters, tools, and unrelated routes) from
  // entering the sync.
  const configuredNames = await readJson('pal-names.json', []);
  const cleanNames = uniq(configuredNames.map(plausiblePalName).filter(Boolean));
  if (cleanNames.length) {
    const urls = cleanNames.map(palUrlFromName).filter(Boolean);
    console.log(`Loaded ${urls.length} Pal names from data/pal-names.json.`);
    return urls;
  }

  // Compatibility fallback for installations that accidentally omit the
  // roster file. This should not normally run in v7.5.
  console.warn('data/pal-names.json is missing or empty; falling back to the existing local Pal database.');
  const previous = await readJson('pals.json', []);
  const previousUrls = uniq(previous.map(p => palUrlFromName(p.name)).filter(Boolean));
  if (previousUrls.length) return previousUrls;
  throw new Error('No Pal names are available. Restore data/pal-names.json and run the sync again.');
}

async function buildBrowserData(note='Generated by Pal Loadout Vault sync.') {
  const [pals, active, passive, elements, manifest] = await Promise.all([
    readJson('pals.json', []),
    readJson('active-skills.json', []),
    readJson('passive-skills.json', []),
    readJson('elements.json', []),
    readJson('manifest.json', {})
  ]);
  const browserData = {
    manifest,
    elements: ['', ...elements],
    pals: pals.map(x => x.name),
    palDetails: pals,
    activeSkills: ['', ...active.map(x => x.name)],
    activeSkillDetails: active,
    passiveSkills: ['', ...passive.map(x => x.name)],
    passiveSkillDetails: passive
  };
  await fs.writeFile(path.join(ROOT,'pal-data.js'), `/* ${note} Do not edit manually. */\nwindow.PALWORLD_DATA = ${JSON.stringify(browserData,null,2)};\n`);
}

async function updateManifest(section, details={}) {
  const old = await readJson('manifest.json', {});
  const pals = await readJson('pals.json', []);
  const active = await readJson('active-skills.json', []);
  const passive = await readJson('passive-skills.json', []);
  const manifest = {
    ...old,
    schemaVersion: 7,
    source: 'Palpedia.net',
    generatedAt: new Date().toISOString(),
    lastSyncSection: section,
    sections: {
      ...(old.sections || {}),
      [section]: { syncedAt: new Date().toISOString(), ...details }
    },
    counts: {
      ...(old.counts || {}),
      pals: pals.length,
      activeSkills: active.length,
      passiveSkills: passive.length,
      linkedPalImages: pals.filter(p => p.imageCandidates?.length || p.imageUrl).length
    },
    primaryBase: BASE,
    skillSourcePages: [`${BASE}/skills/active`, `${BASE}/skills/passive`],
    notes: 'Pal records, Active Skills, and Passive Skills are synchronized independently. npm run sync:all runs all three stages sequentially.'
  };
  await writeJson('manifest.json', manifest);
  return manifest;
}

async function syncPals() {
  await fs.mkdir(RAW_DIR,{recursive:true});
  const oldPals = await readJson('pals.json', []);
  console.log('\n=== PAL DATA SYNC ===');
  console.log('Loading the explicit Pal roster...');
  const palUrls = await discoverPalUrls();
  console.log(`Found ${palUrls.length} canonical Pal page URLs.`);
  console.log(`Sync mode: ${CONCURRENCY} request worker(s), at least ${DELAY}ms between requests, cached pages ${FORCE_REFRESH ? 'disabled' : 'enabled'}.`);

  const pals = await pool(palUrls, async(url,i) => {
    if(i % 10 === 0) console.log(`Pals ${i}/${palUrls.length}`);
    let html = await readCachedPage(url);
    if (!html) {
      html = await fetchText(url);
      await fs.writeFile(palCachePath(url),html);
    }
    const parsed = parsePal(html,url);
    if (!parsed) console.warn(`Rejected non-Pal or incomplete page: ${url}`);
    return parsed;
  });

  const validPals = pals.filter(p => p?.name && p.name !== 'Pals');
  const rosterKeys = new Set(palUrls.map(url => key(palNameFromUrl(url))));
  const mergedPals = mergeRecords(validPals, oldPals).filter(p => rosterKeys.has(key(p.name))).sort((a,b) =>
    String(a.paldeckNumber || '').localeCompare(String(b.paldeckNumber || ''), undefined, {numeric:true}) || a.name.localeCompare(b.name)
  );
  const active = await readJson('active-skills.json', []);
  const elements = uniq([...mergedPals.flatMap(p => p.elements || []), ...active.map(s => s.element)].filter(Boolean)).sort();
  await Promise.all([writeJson('pals.json', mergedPals), writeJson('elements.json', elements)]);
  await updateManifest('pals', {
    requested: palUrls.length,
    accepted: validPals.length,
    missingImages: mergedPals.filter(p => !(p.imageCandidates?.length || p.imageUrl)).map(p => p.name)
  });
  await buildBrowserData('Generated by npm run sync:data.');
  console.log(`Completed Pal data: ${validPals.length}/${palUrls.length} Palpedia pages accepted; ${mergedPals.length} records saved.`);
  if (validPals.length < 200) console.warn('WARNING: Fewer than 200 Palpedia Pal pages were accepted. Inspect data/manifest.json and data/raw/palpedia/.');
}

async function fetchSkillPage(type) {
  await fs.mkdir(RAW_DIR,{recursive:true});
  const url = `${BASE}/skills/${type}`;
  const cachePath = path.join(RAW_DIR, `${type}-skills.html`);
  let html = '';
  if (!FORCE_REFRESH) {
    try { html = await fs.readFile(cachePath, 'utf8'); } catch {}
  }
  if (!html || html.length < 500) {
    html = await fetchText(url);
    await fs.writeFile(cachePath, html);
  }
  return {html, url};
}

async function syncActive() {
  console.log('\n=== ACTIVE SKILL SYNC ===');
  const oldActive = await readJson('active-skills.json', []);
  const pals = await readJson('pals.json', []);
  const {html, url} = await fetchSkillPage('active');
  const indexRecords = parseSkillIndex(html, 'active', url);
  const fromPals = [...new Map(pals.flatMap(p => (p.activeSkills || []).map(s => [key(s.name), {
    id:key(s.name), name:s.name, element:s.element || '', power:s.power ?? null,
    cooldown:s.cooldown ?? null, description:s.description || '', exclusiveTo:[],
    source:'Palpedia.net', sourceUrl:p.sourceUrl
  }])).values())];
  const active = mergeRecords(mergeRecords(indexRecords, fromPals), oldActive).sort((a,b)=>a.name.localeCompare(b.name));
  await writeJson('active-skills.json', active);
  const palsNow = await readJson('pals.json', []);
  const elements = uniq([...palsNow.flatMap(p => p.elements || []), ...active.map(s => s.element)].filter(Boolean)).sort();
  await writeJson('elements.json', elements);
  await updateManifest('active', {indexRecords:indexRecords.length, learnedFromPalPages:fromPals.length, saved:active.length});
  await buildBrowserData('Generated by npm run sync:active.');
  console.log(`Completed Active Skills: ${active.length} records saved.`);
}

async function syncPassive() {
  console.log('\n=== PASSIVE SKILL SYNC ===');
  const oldPassive = await readJson('passive-skills.json', []);
  const {html, url} = await fetchSkillPage('passive');
  const indexRecords = parseSkillIndex(html, 'passive', url);
  const passive = mergeRecords(indexRecords, oldPassive).sort((a,b)=>a.name.localeCompare(b.name));
  await writeJson('passive-skills.json', passive);
  await updateManifest('passive', {indexRecords:indexRecords.length, saved:passive.length});
  await buildBrowserData('Generated by npm run sync:passive.');
  console.log(`Completed Passive Skills: ${passive.length} records saved.`);
}

async function main() {
  const mode = clean(process.argv[2] || 'pals').toLowerCase();
  if (mode === 'pals' || mode === 'data') return syncPals();
  if (mode === 'active') return syncActive();
  if (mode === 'passive') return syncPassive();
  if (mode === 'all') {
    console.log('Running all sync sections sequentially.');
    await syncPals();
    await syncActive();
    await syncPassive();
    await updateManifest('all', {completed:true});
    await buildBrowserData('Generated by npm run sync:all.');
    console.log('\n=== ALL SYNCHRONIZATION COMPLETE ===');
    return;
  }
  throw new Error(`Unknown sync mode "${mode}". Use pals, active, passive, or all.`);
}

main().catch(e=>{console.error(e);process.exitCode=1;});
