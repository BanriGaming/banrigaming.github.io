import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { onValue, ref, remove, set } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getFirebaseServices } from "../../assets/js/site-store.js";
import { PalworldAPI } from "./palworld-api.js?v=20260810a";

(async () => {
  "use strict";
  const { auth, database } = getFirebaseServices();
  const STATIC_DATA = window.PALWORLD_DATA || {elements:[""],pals:[],palDetails:[],activeSkills:[""],passiveSkills:[""]};
  const DATA = {
    ...STATIC_DATA,
    elements: [...(STATIC_DATA.elements || [""])],
    pals: [...(STATIC_DATA.pals || [])],
    palDetails: [...(STATIC_DATA.palDetails || [])],
    activeSkills: [...(STATIC_DATA.activeSkills || [""])],
    passiveSkills: [...(STATIC_DATA.passiveSkills || [""])]
  };
  const STORAGE_KEY = "palLoadoutVault.v7";
  const SUITABILITIES = ["Kindling","Watering","Planting","Generating Electricity","Handiwork","Gathering","Lumbering","Mining","Medicine Production","Cooling","Transporting","Farming"];
  const $ = (s, root=document) => root.querySelector(s);
  const $$ = (s, root=document) => [...root.querySelectorAll(s)];
  const byName = new Map((DATA.palDetails||[]).map(p=>[String(p.name).toLowerCase(),p]));
  const palIndexByName = new Map();
  let referenceApiStatus = null;
  let referenceApiIndex = null;
  let referenceApiError = "";
  let state = loadState();
  let draftBuild = newBuild();
  let activeBuildId = state.activeBuildId || state.builds[0]?.id || draftBuild.id;
  let selectedSlot = 0;
  let editingLibraryId = null;
  let editingPartySlot = 0;
  let currentView = "builder";
  let currentUser = null;
  let cloudPublicBuilds = {};
  let cloudPrivateBuilds = {};
  let cloudUnsubscribers = [];

  const els = {libraryList:$("#libraryList"),partySlots:$("#partySlots"),details:$("#detailsContent"),toast:$("#toast"),libraryDialog:$("#libraryDialog"),partyDialog:$("#partyDialog"),buildDialog:$("#buildDialog"),viewerDialog:$("#loadoutViewerDialog"),confirmDialog:$("#confirmDialog"),importFile:$("#importFile")};
  await initializeReferenceData();
  buildForms(); enhanceSearchPickers(); bind(); initCloudSync(); render(); updateReferenceStatusUi();

  function uid(){return crypto.randomUUID()}
  function emptyPal(){return {id:"",libraryId:"",species:"",nickname:"",role:"",elements:["",""],level:"",condensation:"0",activeSkills:["",""],passives:["","","",""],ivs:{hp:"",attack:"",defense:""},workSuitability:Object.fromEntries(SUITABILITIES.map(x=>[x,0])),storageType:"Base Palbox",storageName:"",storagePage:"",notes:"",favorite:false,createdAt:Date.now(),updatedAt:Date.now()}}
  function newBuild(){return {id:uid(),name:"Untitled Loadout",purpose:"",notes:"",visibility:"private",ownerUid:"",ownerDisplayName:"",pals:Array.from({length:5},emptyPal),createdAt:Date.now(),updatedAt:Date.now()}}
  function normalizePal(p={}){const base=emptyPal(); return {...base,...p,id:p.id||base.id,elements:[...(p.elements||base.elements),""].slice(0,2),activeSkills:[...(p.activeSkills||base.activeSkills),"",""] .slice(0,3),passives:[...(p.passives||base.passives),"","",""].slice(0,4),ivs:{...base.ivs,...(p.ivs||{})},workSuitability:{...base.workSuitability,...normalizeSuitability(p.workSuitability||{})},condensation:String(Math.min(4,Number(p.condensation)||0))}}
  function normalizeSuitability(obj){const out={}; for(const [k,v] of Object.entries(obj||{})){const match=SUITABILITIES.find(x=>key(x)===key(k)||key(x).includes(key(k))||key(k).includes(key(x))); if(match)out[match]=Number(v)||0} return out}
  function normalizeBuild(b={}){const base=newBuild();return {...base,...b,id:b.id||uid(),visibility:b.visibility==="public"?"public":"private",pals:Array.from({length:5},(_,i)=>normalizePal(b.pals?.[i]||{}))}}
  function loadState(){try{for(const k of [STORAGE_KEY,"palLoadoutVault.v6","palLoadoutVault.v5","palLoadoutVault.v4","palLoadoutVault.v3","palLoadoutVault.v2","palLoadoutVault.v1"]){const raw=localStorage.getItem(k);if(!raw)continue;const p=JSON.parse(raw);return {builds:(p.builds||[]).map(normalizeBuild),library:(p.library||[]).map(x=>({...normalizePal(x),id:x.id||uid()})),activeBuildId:p.activeBuildId||null}}}catch(e){console.warn(e)}return {builds:[],library:[],activeBuildId:null}}
  function persist(){state.activeBuildId=activeBuildId;localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  function build(){const saved=state.builds.find(b=>b.id===activeBuildId);if(saved)return saved;if(draftBuild.id!==activeBuildId)activeBuildId=draftBuild.id;return draftBuild}
  function refFor(species){return byName.get(String(species||"").trim().toLowerCase())}

  async function initializeReferenceData(){
    if(!PalworldAPI.configured){
      referenceApiError="Worker URL not configured; using pal-data.js fallback for Pal reference data.";
      return;
    }
    try{
      const [index,status]=await Promise.all([
        PalworldAPI.getPalIndex(),
        PalworldAPI.getStatus().catch(()=>null)
      ]);
      referenceApiIndex=index;
      referenceApiStatus=status;
      const indexPals=Array.isArray(index?.pals)?index.pals:[];
      if(!indexPals.length)throw new Error("The Pal API returned an empty roster.");
      palIndexByName.clear();
      const merged=[];
      indexPals.forEach(item=>{
        const normalizedName=String(item.name||"").trim();
        if(!normalizedName)return;
        palIndexByName.set(normalizedName.toLowerCase(),item);
        const fallback=byName.get(normalizedName.toLowerCase())||{};
        const record={...fallback,...item,name:normalizedName,__apiLoaded:false};
        byName.set(normalizedName.toLowerCase(),record);
        merged.push(record);
      });
      DATA.pals=indexPals.map(x=>x.name).filter(Boolean);
      DATA.palDetails=merged;
      referenceApiError="";
    }catch(error){
      referenceApiError=error?.message||String(error);
      console.warn("Palworld API roster unavailable; using local fallback.",error);
    }
  }

  async function ensurePalReference(species,{force=false}={}){
    const name=String(species||"").trim();
    if(!name||!PalworldAPI.configured)return refFor(name)||null;
    const current=refFor(name);
    if(!force&&current?.__apiLoaded)return current;
    if(!force&&current?.__apiLoading)return current.__apiLoading;
    const indexEntry=palIndexByName.get(name.toLowerCase());
    const lookup=indexEntry?.slug||name;
    const task=PalworldAPI.getPal(lookup,{force})
      .then(detail=>{
        const merged={...(current||{}),...detail,name:detail?.name||name,__apiLoaded:true,__apiError:""};
        delete merged.__apiLoading;
        byName.set(name.toLowerCase(),merged);
        if(detail?.name)byName.set(String(detail.name).toLowerCase(),merged);
        const i=DATA.palDetails.findIndex(x=>String(x.name||"").toLowerCase()===name.toLowerCase());
        if(i>=0)DATA.palDetails[i]=merged;
        return merged;
      })
      .catch(error=>{
        const failed={...(current||{name}),__apiLoaded:false,__apiError:error?.message||String(error)};
        delete failed.__apiLoading;
        byName.set(name.toLowerCase(),failed);
        console.warn(`Palworld API detail failed for ${name}.`,error);
        return failed;
      });
    if(current){current.__apiLoading=task;}
    return task;
  }

  function referenceStatusText(){
    const apiCount=referenceApiIndex?.count||referenceApiIndex?.pals?.length||0;
    const activeCount=(DATA.activeSkills||[]).filter(Boolean).length;
    const passiveCount=(DATA.passiveSkills||[]).filter(Boolean).length;
    if(apiCount){
      const refreshed=referenceApiIndex?.cache?.refreshedAt?` Last roster refresh: ${new Date(referenceApiIndex.cache.refreshedAt).toLocaleString()}.`:"";
      return `${apiCount} Pals loaded from the BANRI Palworld API (PalDB). Active (${activeCount}) and passive (${passiveCount}) skill master lists are temporarily using the local pal-data.js fallback.${refreshed}`;
    }
    if(referenceApiError){
      return `Palworld API unavailable: ${referenceApiError} Local fallback loaded with ${(DATA.pals||[]).length} Pals, ${activeCount} active skills, and ${passiveCount} passive skills.`;
    }
    return `Local reference fallback loaded with ${(DATA.pals||[]).length} Pals, ${activeCount} active skills, and ${passiveCount} passive skills.`;
  }

  function updateReferenceStatusUi(){
    const dataText=$("#dataStatusText");
    if(dataText)dataText.textContent=referenceStatusText();
    const footer=$("#referenceSyncStatus");
    if(footer)footer.textContent=referenceApiIndex?.count?`PalDB API · ${referenceApiIndex.count} Pals`:referenceApiError?"Local fallback":"Reference ready";
  }

  function imageCandidatesFor(p){
    const ref=refFor(p?.species||p?.name)||{};
    return [...new Set([...(p?.imageCandidates||[]),p?.thumbnail,p?.imageUrl,p?.image,...(ref.imageCandidates||[]),ref.thumbnail,ref.imageUrl,ref.image].filter(Boolean))];
  }
  function key(v){return String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"")}
  function esc(v){return String(v??"").replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]))}
  function img(p,cls="pal-thumb"){
    const sources=imageCandidatesFor(p);
    if(!sources.length)return `<div class="${cls} image-fallback" aria-hidden="true">◈</div>`;
    const encoded=encodeURIComponent(JSON.stringify(sources));
    return `<img class="${cls}" src="${esc(sources[0])}" data-image-sources="${encoded}" data-image-index="0" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="window.PalVaultNextImage(this)">`;
  }
  window.PalVaultNextImage=function(node){
    try{
      const sources=JSON.parse(decodeURIComponent(node.dataset.imageSources||"%5B%5D"));
      const next=Number(node.dataset.imageIndex||0)+1;
      if(next<sources.length){node.dataset.imageIndex=String(next);node.src=sources[next];return;}
      node.outerHTML=`<div class="${node.className} image-fallback" aria-hidden="true">◈</div>`;
    }catch{node.style.visibility="hidden";}
  };
  function color(element){return ({fire:"#e9624f",water:"#42a8e8",grass:"#65c86c",ground:"#b98a4e",electric:"#f0c13e",ice:"#69d4ef",dark:"#9c63c7",dragon:"#8c75ef",neutral:"#9daab4"})[String(element||"").toLowerCase()]||"#25cfe9"}

  function buildForms(){
    const elementOptions=(DATA.elements||[]).map(x=>`<option value="${esc(x)}">${esc(x||"None")}</option>`).join("");
    $("#elementFilter").innerHTML=`<option value="">All Elements</option>${(DATA.elements||[]).filter(Boolean).map(x=>`<option>${esc(x)}</option>`).join("")}`;
    $("#workFilter").innerHTML=`<option value="">All Work Types</option>${SUITABILITIES.map(x=>`<option>${x}</option>`).join("")}`;
    const species=(DATA.pals||[]).map(x=>`<option value="${esc(x)}"></option>`).join("");
    const active=(DATA.activeSkills||[]).filter(Boolean).map(x=>`<option value="${esc(x)}"></option>`).join("");
    const passive=(DATA.passiveSkills||[]).filter(Boolean).map(x=>`<option value="${esc(x)}"></option>`).join("");
    $("#libraryFormFields").innerHTML=`
      <div id="libraryReference" class="reference-strip" hidden></div>
      <div class="form-grid">
        <label><span>Pal species</span><div class="smart-picker" data-picker="species"><input id="libSpecies" autocomplete="off" required placeholder="Search Pals…"><button type="button" aria-label="Open Pal list">▾</button><div class="smart-picker__menu" hidden></div></div></label>
        <label><span>Nickname / identifier</span><input id="libNickname" placeholder="Example: Dupin #1A"></label>
        <label><span>Assigned role</span><input id="libRole" placeholder="Attack, support, worker…"></label>
        <label><span>Primary element</span><select id="libElement1">${elementOptions}</select></label>
        <label><span>Secondary element</span><select id="libElement2">${elementOptions}</select></label>
        <label><span>Level</span><input id="libLevel" type="number" min="1" max="999"></label>
        <label><span>Condensation</span><select id="libCondensation"><option value="0">0★</option><option value="1">1★</option><option value="2">2★</option><option value="3">3★</option><option value="4">4★ / Max</option></select></label>
        <label><span>Storage type</span><select id="libStorageType"><option value="Base Palbox">Base Palbox</option><option value="Dimensional Storage">Dimensional (Dim.) Storage</option></select></label>
        <label><span>Base / storage name</span><input id="libStorageName" placeholder="Main Base, Raid Base, Dim. Storage…"></label>
        <label><span>Storage page</span><input id="libStoragePage" type="number" min="1" max="999" placeholder="Page #"></label>
      </div>
      <fieldset><legend>Active skills</legend><div class="skills-grid">${[0,1,2].map(i=>`<label><span>Skill ${i+1}</span><div class="smart-picker" data-picker="active"><input id="libActive${i}" autocomplete="off" placeholder="Search active skills…"><button type="button" aria-label="Open skill list">▾</button><div class="smart-picker__menu" hidden></div></div></label>`).join("")}</div></fieldset>
      <fieldset><legend>Passive skills</legend><div class="skills-grid">${[0,1,2,3].map(i=>`<label><span>Passive ${i+1}</span><div class="smart-picker" data-picker="passive"><input id="libPassive${i}" autocomplete="off" placeholder="Search passive skills…"><button type="button" aria-label="Open passive list">▾</button><div class="smart-picker__menu" hidden></div></div></label>`).join("")}</div></fieldset>
      <fieldset><legend>Individual Values</legend><div class="form-grid"><label><span>Health IV</span><input id="libHp" type="number" min="0" max="100"></label><label><span>Attack IV</span><input id="libAttack" type="number" min="0" max="100"></label><label><span>Defense IV</span><input id="libDefense" type="number" min="0" max="100"></label></div></fieldset>
      <fieldset><legend>Work Suitability</legend><div class="suitability-editor">${SUITABILITIES.map((x,i)=>`<label><span>${x}</span><select id="suit${i}"><option value="0">—</option>${[1,2,3,4,5,6,7,8,9,10].map(n=>`<option value="${n}">Lv. ${n}</option>`).join("")}</select></label>`).join("")}</div></fieldset>
      <label class="full-width-field"><span>Notes</span><textarea id="libNotes" rows="3" placeholder="Implants, alternate skills, breeding line, base assignment…"></textarea></label>`;
  }

  function enhanceSearchPickers(){
    $$('.smart-picker').forEach(w=>{
      const input=$('input',w),menu=$('.smart-picker__menu',w),button=$('button',w),type=w.dataset.picker;
      const source=type==='species'?(DATA.palDetails||[]):type==='active'?(DATA.activeSkillDetails||[]).map(x=>({...x,imageCandidates:[]})):(DATA.passiveSkillDetails||[]).map(x=>({...x,imageCandidates:[]}));
      const draw=()=>{const q=input.value.trim().toLowerCase();const items=source.filter(x=>!q||String(x.name||'').toLowerCase().includes(q)).slice(0,80);menu.innerHTML=items.map(x=>`<button type="button" class="smart-option" data-value="${esc(x.name)}">${type==='species'?img({species:x.name},'smart-option__image'):''}<span><strong>${esc(x.name)}</strong>${type==='species'?`<small>${esc((x.elements||[]).join(' / '))}</small>`:''}</span></button>`).join('')||'<div class="smart-empty">No matches</div>';menu.hidden=false;$$('.smart-option',menu).forEach(o=>o.onclick=()=>{input.value=o.dataset.value;menu.hidden=true;input.dispatchEvent(new Event('change',{bubbles:true}));});};
      input.addEventListener('click',draw);input.addEventListener('input',draw);button.onclick=draw;
      input.addEventListener('keydown',e=>{if(e.key==='Escape')menu.hidden=true;});
    });
    document.addEventListener('pointerdown',e=>$$('.smart-picker__menu').forEach(m=>{if(!m.parentElement.contains(e.target))m.hidden=true;}));
  }

  function bind(){
    $("#addLibraryPalButton").onclick=()=>openLibrary();
    $("#saveLibraryPalButton").onclick=saveLibrary;
    $("#deleteLibraryPalButton").onclick=deleteLibrary;
    $("#libSpecies").addEventListener("change",()=>{void applyReferenceToForm(true)});
    $("#librarySearch").oninput=renderLibrary; $("#elementFilter").onchange=renderLibrary; $("#roleFilter").onchange=renderLibrary; $("#workFilter").onchange=renderLibrary; $("#storageFilter").onchange=renderLibrary; $("#librarySort").onchange=renderLibrary;
    $("#globalSearch").oninput=e=>{$("#librarySearch").value=e.target.value;renderLibrary()};
    $("#clearPartyButton").onclick=async()=>{if(await confirmPalVault("Clear all five party slots?","Clear Party")){build().pals=Array.from({length:5},emptyPal);build().updatedAt=Date.now();selectedSlot=0;persist();render()}};
    $("#applyPartyPalButton").onclick=applyPartyPal; $("#clearSlotButton").onclick=clearSlot;
    $("#saveBuildButton").onclick=openBuildDialog; $("#confirmSaveBuildButton").onclick=()=>saveBuild();
    $("#newBuildButton").onclick=()=>{draftBuild=newBuild();activeBuildId=draftBuild.id;selectedSlot=0;persist();render();openBuildDialog()};
    $("#duplicateBuildButton").onclick=()=>{const b=normalizeBuild(JSON.parse(JSON.stringify(build())));b.id=uid();b.name=`${b.name} Copy`;b.visibility="private";b.ownerUid=currentUser?.uid||"";b.ownerDisplayName=currentUser?.displayName||"";b.createdAt=b.updatedAt=Date.now();draftBuild=b;activeBuildId=b.id;selectedSlot=0;persist();render();openBuildDialog();toast("Loadout duplicated as a draft. Save Loadout to publish it to Firebase.")};
    $("#deleteBuildButton").onclick=async()=>{const current=build();if(!await confirmPalVault(`Clear "${current.name}" from the active builder? Firebase copies are managed in My Loadouts.`,"Clear Active Loadout"))return;state.builds=state.builds.filter(x=>x.id!==activeBuildId);if(current.id===draftBuild.id)draftBuild=newBuild();activeBuildId=state.builds[0]?.id||draftBuild.id;selectedSlot=0;persist();render()};
    $("#exportButton").onclick=exportData; $("#importButton").onclick=()=>els.importFile.click(); els.importFile.onchange=importData;
    $("#buildNotes").oninput=e=>{build().notes=e.target.value;build().updatedAt=Date.now();persist()};
    $("#editNotesButton").onclick=()=>$("#buildNotes").focus();
    $("#closeDetailsButton").onclick=()=>{selectedSlot=-1;renderDetails()};
    $$(".topnav__item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
    $$('[data-go]').forEach(b=>b.onclick=()=>showView(b.dataset.go));
    $$("[data-close-dialog]").forEach(button=>button.onclick=()=>button.closest("dialog")?.close("cancel"));
  }

  function storageLabel(p){const type=p.storageType||"Base Palbox";const name=p.storageName?` · ${p.storageName}`:"";const page=p.storagePage?` · Page ${p.storagePage}`:"";return `${type}${name}${page}`}
  function showView(view="builder"){currentView=view;$$('.app-view').forEach(v=>{const active=v.dataset.page===view;v.hidden=!active;v.classList.toggle('is-active',active)});$$('.topnav__item').forEach(b=>b.classList.toggle('is-active',b.dataset.view===view));$$('[data-go]').forEach(b=>b.classList.toggle('is-active',b.dataset.go===view));if(view==='library')renderLibrary();if(view==='loadouts')renderLoadouts();if(view==='public')renderPublicLoadouts();if(view==='data')updateReferenceStatusUi()}
  function render(){renderLibrary();renderParty();renderDetails();renderSummary();renderLoadouts();renderPublicLoadouts();$("#buildNotes").value=build().notes||""}
  function renderLibrary(){
    const q=$("#librarySearch").value.trim().toLowerCase(), el=$("#elementFilter").value, role=$("#roleFilter").value, work=$("#workFilter").value, storage=$("#storageFilter").value, sort=$("#librarySort").value;
    const roles=[...new Set(state.library.map(p=>p.role).filter(Boolean))].sort();$("#roleFilter").innerHTML=`<option value="">All Roles</option>${roles.map(x=>`<option ${x===role?"selected":""}>${esc(x)}</option>`).join("")}`;
    let pals=state.library.filter(p=>{const hay=[p.nickname,p.species,p.role,p.storageType,p.storageName,p.storagePage,...p.activeSkills,...p.passives].join(" ").toLowerCase();return(!q||hay.includes(q))&&(!el||p.elements.includes(el))&&(!role||p.role===role)&&(!work||Number(p.workSuitability?.[work])>0)&&(!storage||p.storageType===storage)});
    if(sort==="name")pals.sort((a,b)=>(a.nickname||a.species).localeCompare(b.nickname||b.species));else if(sort==="level")pals.sort((a,b)=>(Number(b.level)||0)-(Number(a.level)||0));else if(sort==="storage")pals.sort((a,b)=>storageLabel(a).localeCompare(storageLabel(b)));else pals.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    $("#libraryCount").textContent=state.library.length;$("#visibleLibraryCount").textContent=pals.length;
    els.libraryList.innerHTML=pals.length?pals.map(libraryCard).join(""):`<div class="detail-section"><p>No saved Pals yet. Add one to build your permanent library.</p></div>`;
    $$('[data-edit-library]',els.libraryList).forEach(b=>b.onclick=e=>{e.stopPropagation();openLibrary(b.dataset.editLibrary)});
    $$('[data-add-party]',els.libraryList).forEach(b=>b.onclick=e=>{e.stopPropagation();addToFirstOpen(b.dataset.addParty)});
    $$('[data-library-card]',els.libraryList).forEach(card=>card.ondblclick=()=>addToFirstOpen(card.dataset.libraryCard));
    $$('[data-favorite]',els.libraryList).forEach(b=>b.onclick=e=>{e.preventDefault();e.stopPropagation();toggleFavorite(b.dataset.favorite)});
  }
  function libraryCard(p){return `<article class="library-card${p.favorite?" is-favorite":""}" style="--element:${color(p.elements[0])}" data-library-card="${esc(p.id)}">${img(p,"library-card__image")}<div class="library-card__content"><div class="library-card__top"><div><div class="library-row__title">${esc(p.nickname||p.species)} ${p.elements[0]?`<span class="element-badge">${esc(p.elements[0])}</span>`:""}</div><div class="library-card__species">${esc(p.species)} · Lv. ${esc(p.level||"—")} · ${esc(p.condensation||0)}★</div></div><button class="favorite-button${p.favorite?" is-favorite":""}" data-favorite="${esc(p.id)}" type="button" aria-pressed="${p.favorite?"true":"false"}" aria-label="${p.favorite?"Remove favorite":"Favorite"}">${p.favorite?"★":"☆"}</button></div><div class="storage-chip">▣ ${esc(storageLabel(p))}</div><div class="library-card__skills">${p.activeSkills.filter(Boolean).slice(0,3).map(x=>`<span class="skill-chip">${esc(x)}</span>`).join("")||`<span class="skill-chip">No active skills</span>`}</div><div class="library-card__actions"><button class="button button--small" data-edit-library="${esc(p.id)}" type="button">Edit</button><button class="button button--small button--cyan" data-add-party="${esc(p.id)}" type="button">Add to Party</button></div></div></article>`}
  function toggleFavorite(id){const pal=state.library.find(p=>p.id===id);if(!pal)return;pal.favorite=!pal.favorite;pal.updatedAt=Date.now();state.builds.forEach(b=>b.pals=b.pals.map(slot=>slot.libraryId===pal.id?{...slot,favorite:pal.favorite,updatedAt:pal.updatedAt}:slot));persist();renderLibrary();renderParty();renderDetails();toast(pal.favorite?"Pal favorited.":"Favorite removed.")}

  function renderParty(){const b=build();$("#partyCount").textContent=`${b.pals.filter(p=>p.species).length} / 5`;els.partySlots.innerHTML=b.pals.map((p,i)=>p.species?partyCard(p,i):`<article class="party-slot empty-slot"><div class="slot-number">${i+1}</div><button type="button" data-slot="${i}">＋ Choose a saved Pal for slot ${i+1}</button></article>`).join("");$$('[data-slot]',els.partySlots).forEach(x=>x.onclick=()=>openParty(Number(x.dataset.slot)));$$('[data-select-slot]',els.partySlots).forEach(x=>x.onclick=()=>{selectedSlot=Number(x.dataset.selectSlot);renderParty();renderDetails()})}
  function partyCard(p,i){const starCount=Math.min(4,Number(p.condensation)||0);return `<article class="party-slot ${i===selectedSlot?"is-selected":""}" style="--element:${color(p.elements[0])}" data-select-slot="${i}"><div class="slot-number">${i+1}</div>${img(p)}<div class="slot-main"><div class="slot-name">${esc(p.nickname||p.species)}</div><div class="slot-sub">Lv. ${esc(p.level||"—")} ${p.elements[0]?`<span class="element-badge">${esc(p.elements[0])}</span>`:""} ${p.role?`<span class="role-badge">⚒ ${esc(p.role)}</span>`:""}</div><div class="slot-skills">${p.activeSkills.filter(Boolean).map(x=>`<span class="skill-chip">${esc(x)}</span>`).join("")||`<span class="skill-chip">No active skills</span>`}</div></div><div class="slot-condense"><div class="slot-label">Condensation Rank</div><div class="stars">${[1,2,3,4].map(n=>`<span class="${n<=starCount?"on":""}">◆</span>`).join("")}</div></div><div class="slot-passives"><div class="slot-label">Passives</div><div class="passive-grid">${p.passives.filter(Boolean).map(x=>`<span class="passive-chip">${esc(x)}</span>`).join("")||`<span class="passive-chip">None</span>`}</div></div></article>`}
  function renderDetails(){const p=selectedSlot>=0?build().pals[selectedSlot]:null;if(!p?.species){els.details.innerHTML=`<div class="detail-section"><h3>No Pal selected</h3><p>Select a party slot to inspect its complete loadout.</p></div>`;return}const existingRef=refFor(p.species)||{};if(PalworldAPI.configured&&!existingRef.__apiLoaded&&!existingRef.__apiLoading){ensurePalReference(p.species).then(()=>{const selected=selectedSlot>=0?build().pals[selectedSlot]:null;if(selected?.species===p.species)renderDetails()})}const ref=refFor(p.species)||{};const suit={...normalizeSuitability(ref.workSuitability||{}),...p.workSuitability};els.details.innerHTML=`<div class="details-hero">${img(p,"details-image")}<div><div class="details-name">${esc(p.nickname||p.species)}</div><div class="details-partner">${esc(p.species)}${ref.partnerSkill?.name?` · ${esc(ref.partnerSkill.name)}`:""}</div><div class="level-line"><strong>Lv. ${esc(p.level||"—")}</strong><div class="xp-track"><i style="width:68%"></i></div></div></div></div><section class="detail-section"><div class="detail-grid"><div><h3>Basic Info</h3><div class="detail-item"><span>Type</span><b>${esc(p.elements.filter(Boolean).join(" / ")||"—")}</b></div><div class="detail-item"><span>Role</span><b>${esc(p.role||"—")}</b></div><div class="detail-item"><span>Condensation</span><b>${esc(p.condensation)}★ / 4★</b></div><div class="detail-item"><span>Stored</span><b>${esc(storageLabel(p))}</b></div></div><div><h3>Partner Skill</h3><strong>${esc(ref.partnerSkill?.name||"Unavailable")}</strong><p>${esc(ref.partnerSkill?.description||"")}</p></div></div></section><section class="detail-section"><div class="detail-grid"><div><h3>Active Skills</h3>${p.activeSkills.filter(Boolean).map(x=>skillRow(x)).join("")||"None selected"}</div><div><h3>Passive Skills</h3>${p.passives.filter(Boolean).map(x=>`<div class="skill-row"><span>${esc(x)}</span><span></span><span></span></div>`).join("")||"None selected"}</div></div></section><section class="detail-section"><h3>Work Suitability</h3><div class="suitability-grid">${SUITABILITIES.map(x=>`<div class="suitability-item"><span>${esc(x)}</span><b>${Number(suit[x])?`Lv. ${Number(suit[x])}`:"—"}</b></div>`).join("")}</div></section><section class="detail-section"><div class="detail-grid"><div><h3>Base Stats</h3>${statRows(ref.stats||{})}</div><div><h3>IVs</h3>${ivRow("Health",p.ivs.hp)}${ivRow("Attack",p.ivs.attack)}${ivRow("Defense",p.ivs.defense)}</div></div></section>${p.notes?`<section class="detail-section"><h3>Notes</h3><p class="pal-notes">${esc(p.notes)}</p></section>`:""}<button class="button button--outline-cyan" id="editSelectedPal" type="button">Edit Library Pal</button>`;$("#editSelectedPal").onclick=()=>p.libraryId?openLibrary(p.libraryId):toast("This party Pal is not linked to your Library.")}
  function skillRow(name){const d=(DATA.activeSkillDetails||[]).find(x=>x.name===name)||{};return `<div class="skill-row"><span>${esc(name)}</span><span>${d.power??"—"}</span><span>${d.cooldown!=null?`${d.cooldown}s`:"—"}</span></div>`}
  function statRows(stats){const labels={hp:"HP",shotAttack:"Attack",defense:"Defense",support:"Support"};return Object.entries(labels).map(([k,l])=>`<div class="stat-row"><span>${l}</span><div class="stat-track"><i style="width:${Math.min(100,(Number(stats[k])||0)/2)}%"></i></div><b>${stats[k]??"—"}</b></div>`).join("")}
  function ivRow(n,v){const val=Math.max(0,Math.min(100,Number(v)||0));return `<div class="iv-row"><span>${n}</span><div class="stat-track"><i style="width:${val}%"></i></div><b class="iv-value">${v||"—"}</b></div>`}
  function renderSummary(){const pals=build().pals.filter(p=>p.species);const counts={Attack:0,Support:0,Worker:0,Tank:0};pals.forEach(p=>{const r=String(p.role||"").toLowerCase();if(r.includes("support"))counts.Support++;else if(r.includes("work")||Object.values(p.workSuitability||{}).some(Number))counts.Worker++;else if(r.includes("tank"))counts.Tank++;else counts.Attack++});$("#roleSummary").innerHTML=Object.entries(counts).map(([x,n])=>`<div class="role-node"><strong>${x==="Attack"?"⚔":x==="Support"?"♥":x==="Worker"?"⚒":"⬡"}</strong>${x}<div>${n}</div></div>`).join("");const elements=[...new Set(pals.flatMap(p=>p.elements).filter(Boolean))];$("#elementSummary").innerHTML=`<div class="element-wheel"></div><div><div class="element-count">${elements.length} / ${(DATA.elements||[]).filter(Boolean).length}</div><small>Elements covered</small></div>`}

  function openLibrary(id=null){editingLibraryId=id;const p=id?state.library.find(x=>x.id===id):emptyPal();$("#libraryDialogTitle").textContent=id?"Edit Library Pal":"Add Pal to Library";$("#deleteLibraryPalButton").hidden=!id;setForm(p);$$(".smart-picker__menu").forEach(menu=>menu.hidden=true);els.libraryDialog.showModal();if(p.species&&PalworldAPI.configured){ensurePalReference(p.species).then(()=>showReference(p.species))}}
  function setForm(p){$("#libSpecies").value=p.species||"";$("#libNickname").value=p.nickname||"";$("#libRole").value=p.role||"";$("#libElement1").value=p.elements?.[0]||"";$("#libElement2").value=p.elements?.[1]||"";$("#libLevel").value=p.level||"";$("#libCondensation").value=Math.min(4,Number(p.condensation)||0);$("#libStorageType").value=p.storageType||"Base Palbox";$("#libStorageName").value=p.storageName||"";$("#libStoragePage").value=p.storagePage||"";[0,1,2].forEach(i=>$("#libActive"+i).value=p.activeSkills?.[i]||"");[0,1,2,3].forEach(i=>$("#libPassive"+i).value=p.passives?.[i]||"");$("#libHp").value=p.ivs?.hp||"";$("#libAttack").value=p.ivs?.attack||"";$("#libDefense").value=p.ivs?.defense||"";SUITABILITIES.forEach((x,i)=>$("#suit"+i).value=Number(p.workSuitability?.[x])||0);$("#libNotes").value=p.notes||"";showReference(p.species)}
  async function applyReferenceToForm(fill){const species=$("#libSpecies").value.trim();showReference(species);let ref=refFor(species);if(species&&PalworldAPI.configured){ref=await ensurePalReference(species);showReference(species)}if(!ref||!fill)return;if(!$("#libElement1").value)$("#libElement1").value=ref.elements?.[0]||"";if(!$("#libElement2").value)$("#libElement2").value=ref.elements?.[1]||"";const suit=normalizeSuitability(ref.workSuitability||{});SUITABILITIES.forEach((x,i)=>{if(suit[x])$("#suit"+i).value=suit[x]})}
  function showReference(species){const box=$("#libraryReference"),ref=refFor(species);if(!ref){box.hidden=true;return}box.hidden=false;const source=ref.__apiLoaded||ref.source==="PalDB"?"Live PalDB reference loaded through the BANRI API.":PalworldAPI.configured?"Local fallback shown; PalDB detail loads on demand.":"Local reference fallback loaded.";box.innerHTML=`${img({species},"pal-thumb")}<div><strong>${esc(ref.name)}</strong><p>${esc((ref.elements||[]).join(" / "))}${ref.partnerSkill?.name?` · ${esc(ref.partnerSkill.name)}`:""}</p><small>${esc(source)} You can override any suitability level below.</small></div>`}
  function readForm(){const existing=editingLibraryId?state.library.find(x=>x.id===editingLibraryId):null;return normalizePal({id:editingLibraryId||uid(),species:$("#libSpecies").value.trim(),nickname:$("#libNickname").value.trim(),role:$("#libRole").value.trim(),elements:[$("#libElement1").value,$("#libElement2").value],level:$("#libLevel").value,condensation:$("#libCondensation").value,storageType:$("#libStorageType").value,storageName:$("#libStorageName").value.trim(),storagePage:$("#libStoragePage").value,activeSkills:[0,1,2].map(i=>$("#libActive"+i).value.trim()),passives:[0,1,2,3].map(i=>$("#libPassive"+i).value.trim()),ivs:{hp:$("#libHp").value,attack:$("#libAttack").value,defense:$("#libDefense").value},workSuitability:Object.fromEntries(SUITABILITIES.map((x,i)=>[x,Number($("#suit"+i).value)||0])),notes:$("#libNotes").value.trim(),favorite:existing?.favorite||false,createdAt:existing?.createdAt||Date.now(),updatedAt:Date.now()})}
  function saveLibrary(){const p=readForm();if(!p.species){toast("Enter a Pal species first.");return}const old=state.library.findIndex(x=>x.id===p.id);if(old>=0)state.library[old]=p;else state.library.unshift(p);state.builds.forEach(b=>b.pals=b.pals.map(slot=>slot.libraryId===p.id?{...JSON.parse(JSON.stringify(p)),libraryId:p.id}:slot));persist();els.libraryDialog.close();render();toast(old>=0?"Library Pal updated everywhere.":"Pal added to your library.")}
  async function deleteLibrary(){const p=state.library.find(x=>x.id===editingLibraryId);if(!p||!await confirmPalVault(`Delete "${p.nickname||p.species}" from the Library? Any party slot using this Pal will be cleared.`,"Delete Pal"))return;state.library=state.library.filter(x=>x.id!==p.id);state.builds.forEach(b=>b.pals.forEach((s,i)=>{if(s.libraryId===p.id)b.pals[i]=emptyPal()}));persist();els.libraryDialog.close();render()}
  function addToFirstOpen(id){const i=build().pals.findIndex(p=>!p.species);if(i<0)return toast("The current party is full.");const p=state.library.find(x=>x.id===id);build().pals[i]={...JSON.parse(JSON.stringify(p)),libraryId:p.id};selectedSlot=i;persist();render();toast(`${p.nickname||p.species} added to slot ${i+1}.`)}

  function openParty(i){editingPartySlot=i;$("#dialogSlotNumber").textContent=i+1;$("#savedPalPicker").innerHTML=`<option value="">Choose saved Pal…</option>${state.library.map(p=>`<option value="${p.id}" ${build().pals[i].libraryId===p.id?"selected":""}>${esc(p.nickname||p.species)} — ${esc(p.species)}</option>`).join("")}`;previewParty();$("#savedPalPicker").onchange=previewParty;els.partyDialog.showModal()}
  function previewParty(){const p=state.library.find(x=>x.id===$("#savedPalPicker").value);$("#partyPalPreview").innerHTML=p?`<div class="reference-strip">${img(p,"pal-thumb")}<div><strong>${esc(p.nickname||p.species)}</strong><p>${esc(p.role||"")} · Lv. ${esc(p.level||"—")} · ${esc(p.condensation)}★</p></div></div>`:""}
  function applyPartyPal(){const p=state.library.find(x=>x.id===$("#savedPalPicker").value);if(!p)return toast("Choose a saved Pal first.");build().pals[editingPartySlot]={...JSON.parse(JSON.stringify(p)),libraryId:p.id};build().updatedAt=Date.now();selectedSlot=editingPartySlot;persist();els.partyDialog.close();render()}
  async function clearSlot(){if(!await confirmPalVault(`Clear party slot ${editingPartySlot+1}?`,"Clear Slot"))return;build().pals[editingPartySlot]=emptyPal();build().updatedAt=Date.now();persist();els.partyDialog.close();render()}

  function openBuildDialog(){$("#buildName").value=build().name;$("#buildPurpose").value=build().purpose;$("#buildVisibility").value=build().visibility==="public"?"public":"private";setCloudStatus(currentUser?"Firebase sync ready.":"Sign in to sync this loadout to Firebase.");els.buildDialog.showModal()}
  async function saveBuild(){const current=build();if(!currentUser){setCloudStatus("Sign in through Nexus before saving this loadout to Firebase.");toast("Sign in through Nexus before saving loadouts to Firebase.");return;}current.name=$("#buildName").value.trim()||"Untitled Loadout";current.purpose=$("#buildPurpose").value.trim();current.visibility=$("#buildVisibility").value==="public"?"public":"private";current.ownerUid=currentUser.uid;current.ownerDisplayName=currentUser.displayName||currentUser.email||"Nexus User";current.updatedAt=Date.now();try{const savedBuild=await saveBuildToCloud(current);const localBuild=upsertLocalBuild(savedBuild);activeBuildId=localBuild.id;if(draftBuild.id===current.id)draftBuild=newBuild();persist();els.buildDialog.close();render();toast(localBuild.visibility==="public"?"Public loadout saved to Firebase.":"Private loadout saved to Firebase.");}catch(error){setCloudStatus(`Firebase save failed: ${error.message}`);toast(`Firebase save failed: ${error.message}`)}}
  function exportData(){const blob=new Blob([JSON.stringify({app:"Pal Loadout Vault",version:4,exportedAt:new Date().toISOString(),...state},null,2)],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`pal-loadout-vault-${new Date().toISOString().slice(0,10)}.json`;a.click();URL.revokeObjectURL(a.href)}
  async function importData(e){const f=e.target.files[0];if(!f)return;try{const p=JSON.parse(await f.text());state={builds:(p.builds||[]).map(normalizeBuild),library:(p.library||[]).map(x=>({...normalizePal(x),id:x.id||uid()})),activeBuildId:p.activeBuildId||p.builds?.[0]?.id};activeBuildId=state.activeBuildId||state.builds[0]?.id||draftBuild.id;if(!state.builds.length){draftBuild=newBuild();activeBuildId=draftBuild.id;}persist();render();toast("Archive imported.")}catch(err){toast(`Import failed: ${err.message}`)}e.target.value=""}

  function initCloudSync(){
    onAuthStateChanged(auth,(user)=>{
      currentUser=user;
      subscribeCloudBuilds();
      setCloudStatus(user?"Firebase sync ready.":"Sign in through Nexus to publish or load private teams.");
      renderLoadouts();
    });
  }

  function subscribeCloudBuilds(){
    cloudUnsubscribers.forEach(unsubscribe=>unsubscribe());
    cloudUnsubscribers=[];
    cloudPrivateBuilds={};
    const publicUnsubscribe=onValue(ref(database,"palworldLoadouts/public"),snapshot=>{
      cloudPublicBuilds=snapshot.val()||{};
      mergeCloudBuilds();
      renderLoadouts();
    },()=>renderLoadouts());
    cloudUnsubscribers.push(publicUnsubscribe);
    if(currentUser){
      const privateUnsubscribe=onValue(ref(database,`palworldLoadouts/private/${currentUser.uid}`),snapshot=>{
        cloudPrivateBuilds=snapshot.val()||{};
        mergeCloudBuilds();
        renderLoadouts();
      },()=>renderLoadouts());
      cloudUnsubscribers.push(privateUnsubscribe);
    }
  }

  function mergeCloudBuilds(){
    const ownedPublic=Object.values(cloudPublicBuilds||{}).filter(record=>currentUser&&record?.uid===currentUser.uid);
    const cloudRecords=[...ownedPublic,...Object.values(cloudPrivateBuilds||{})];
    let changed=false;
    cloudRecords.forEach(record=>{
      const cloudBuild=normalizeBuild(record.build||record);
      const before=JSON.stringify(state.builds.find(item=>item.id===cloudBuild.id)||null);
      upsertLocalBuild(cloudBuild);
      if(before!==JSON.stringify(cloudBuild))changed=true;
    });
    if(changed)persist();
  }

  function upsertLocalBuild(item){
    const normalized=normalizeBuild(item);
    const index=state.builds.findIndex(build=>build.id===normalized.id);
    if(index>=0)state.builds[index]=normalized;
    else state.builds.unshift(normalized);
    return normalized;
  }

  function renderLoadouts(){
    const target=$("#cloudLoadoutList");
    if(!target)return;
    const loadouts=[...state.builds].filter(item=>cloudLocationsFor(item.id).length>0).filter(item=>!item.ownerUid||item.ownerUid===currentUser?.uid).sort((a,b)=>(Number(b.updatedAt)||0)-(Number(a.updatedAt)||0));
    target.innerHTML=loadouts.length?loadouts.map(item=>{
      const pals=item.pals.filter(p=>p.species);
      const isActive=item.id===activeBuildId;
      const owned=!item.ownerUid||item.ownerUid===currentUser?.uid;
      const cloudCopies=cloudLocationsFor(item.id);
      const hasCloudCopy=cloudCopies.length>0;
      const displayVisibility=hasCloudCopy?item.visibility:"private";
      const displayOwner=hasCloudCopy?(item.ownerDisplayName||"Nexus User"):"Local";
      return `<article class="vault-loadout-card${isActive?" is-active":""}"><div><p>${esc(displayVisibility==="public"?"Public":"Private")} / ${esc(displayOwner)}</p><h2>${esc(item.name||"Untitled Loadout")}</h2><span>${esc(item.purpose||"No purpose set.")}</span><small>${pals.length} / 5 Pals ${item.updatedAt?`/ Updated ${new Date(item.updatedAt).toLocaleDateString()}`:""}</small></div><div>${pals.map(p=>`<b>${esc(p.nickname||p.species)}</b>`).join("")||"<b>Empty party</b>"}</div><footer><button class="button button--cyan" type="button" data-open-loadout="${esc(item.id)}">Open</button>${owned?`<button class="button" type="button" data-save-cloud="${esc(item.id)}">Sync</button><button class="button button--danger" type="button" data-delete-cloud="${esc(item.id)}">Delete Cloud</button>`:""}</footer></article>`;
    }).join(""):`<div class="detail-section"><p>No Firebase loadouts yet. Build a team and hit Save Loadout.</p></div>`;
    $$("[data-open-loadout]",target).forEach(button=>button.onclick=()=>openLoadout(button.dataset.openLoadout));
    $$("[data-save-cloud]",target).forEach(button=>button.onclick=()=>{const item=state.builds.find(build=>build.id===button.dataset.saveCloud);if(item)saveBuildToCloud(item).then(saved=>{upsertLocalBuild(saved);persist();renderLoadouts();renderPublicLoadouts();toast("Loadout synced to Firebase.");}).catch(error=>toast(error.message));});
    $$("[data-delete-cloud]",target).forEach(button=>button.onclick=async()=>{const item=state.builds.find(build=>build.id===button.dataset.deleteCloud);if(!item||!await confirmPalVault(`Delete "${item.name}" from Firebase?`,"Delete Firebase Loadout"))return;try{await deleteCloudBuild(item);removeCachedBuild(item.id);toast("Firebase loadout deleted.");}catch(error){toast(`Cloud delete failed: ${error.message}`);}});
  }

  function renderPublicLoadouts(){
    const target=$("#publicLoadoutList");
    if(!target)return;
    const records=Object.values(cloudPublicBuilds||{}).map(record=>({record,build:normalizeBuild(record.build||record)})).sort((a,b)=>(Number(b.record.updatedAt)||0)-(Number(a.record.updatedAt)||0));
    target.innerHTML=records.length?records.map(({record,build:item})=>{
      const pals=item.pals.filter(p=>p.species);
      const owned=currentUser&&record.uid===currentUser.uid;
      return `<article class="vault-loadout-card"><div><p>Public / ${esc(record.ownerDisplayName||item.ownerDisplayName||"Nexus User")}</p><h2>${esc(item.name||"Untitled Loadout")}</h2><span>${esc(item.purpose||"No purpose set.")}</span><small>${pals.length} / 5 Pals ${record.updatedAt?`/ Updated ${new Date(record.updatedAt).toLocaleDateString()}`:""}</small></div><div>${pals.map(p=>`<b>${esc(p.nickname||p.species)}</b>`).join("")||"<b>Empty party</b>"}</div><footer><button class="button button--cyan" type="button" data-view-public-loadout="${esc(item.id)}">View</button>${owned?`<button class="button" type="button" data-open-loadout="${esc(item.id)}">Edit Mine</button>`:""}</footer></article>`;
    }).join(""):`<div class="detail-section"><p>No public loadouts have been published yet.</p></div>`;
    $$("[data-view-public-loadout]",target).forEach(button=>button.onclick=()=>openPublicLoadout(button.dataset.viewPublicLoadout));
    $$("[data-open-loadout]",target).forEach(button=>button.onclick=()=>openLoadout(button.dataset.openLoadout));
  }

  function openPublicLoadout(id){
    const record=cloudPublicBuilds?.[id];
    if(!record)return;
    const item=normalizeBuild(record.build||record);
    const title=$("#loadoutViewerTitle");
    const body=$("#loadoutViewerBody");
    if(title)title.textContent=item.name||"Shared Team";
    if(body)body.innerHTML=`
      <div class="loadout-viewer-meta"><span>${esc(record.ownerDisplayName||item.ownerDisplayName||"Nexus User")}</span><p>${esc(item.purpose||"No purpose set.")}</p></div>
      <div class="loadout-viewer-pals">
        ${item.pals.map((pal,index)=>pal.species?`<article>${img(pal,"pal-thumb")}<div><strong>${esc(pal.nickname||pal.species)}</strong><span>Slot ${index+1} / Lv. ${esc(pal.level||"—")} / ${esc(pal.role||"Role pending")}</span><small>${pal.activeSkills.filter(Boolean).map(esc).join(" / ")||"No active skills listed"}</small></div></article>`:`<article class="empty"><div class="pal-thumb image-fallback">${index+1}</div><div><strong>Empty Slot</strong><span>No Pal assigned.</span></div></article>`).join("")}
      </div>
    `;
    els.viewerDialog?.showModal();
  }

  function openLoadout(id){
    const item=state.builds.find(build=>build.id===id);
    if(!item)return;
    activeBuildId=item.id;
    selectedSlot=0;
    persist();
    showView("builder");
    render();
  }

  function cloudPayload(item){
    if(item.ownerUid&&currentUser&&item.ownerUid!==currentUser.uid)throw new Error("Only the loadout owner can sync this record.");
    return {
      id:item.id,
      uid:currentUser?.uid||item.ownerUid||"",
      ownerDisplayName:currentUser?.displayName||currentUser?.email||item.ownerDisplayName||"Nexus User",
      visibility:item.visibility==="public"?"public":"private",
      updatedAt:Date.now(),
      build:{...item,ownerUid:currentUser?.uid||item.ownerUid||"",ownerDisplayName:currentUser?.displayName||currentUser?.email||item.ownerDisplayName||"Nexus User",updatedAt:Date.now()}
    };
  }

  async function saveBuildToCloud(item){
    if(!currentUser)throw new Error("Sign in through Nexus before saving loadouts to Firebase.");
    const payload=cloudPayload(item);
    if(payload.visibility==="public"){
      await set(ref(database,`palworldLoadouts/public/${item.id}`),payload);
      await remove(ref(database,`palworldLoadouts/private/${currentUser.uid}/${item.id}`)).catch(()=>{});
      cloudPublicBuilds[payload.id]=payload;
      delete cloudPrivateBuilds[payload.id];
    }else{
      await set(ref(database,`palworldLoadouts/private/${currentUser.uid}/${item.id}`),payload);
      await remove(ref(database,`palworldLoadouts/public/${item.id}`)).catch(()=>{});
      cloudPrivateBuilds[payload.id]=payload;
      delete cloudPublicBuilds[payload.id];
    }
    return normalizeBuild(payload.build);
  }

  function cloudLocationsFor(id){
    const locations=[];
    const publicRecord=cloudPublicBuilds?.[id];
    if(publicRecord)locations.push({path:`palworldLoadouts/public/${id}`,record:publicRecord,kind:"public"});
    const privateRecord=cloudPrivateBuilds?.[id];
    if(currentUser&&privateRecord)locations.push({path:`palworldLoadouts/private/${currentUser.uid}/${id}`,record:privateRecord,kind:"private"});
    return locations;
  }

  async function deleteCloudBuild(item){
    if(!currentUser)return;
    const locations=cloudLocationsFor(item.id);
    if(!locations.length)throw new Error("No Firebase copy exists for this loadout.");
    await Promise.all(locations.map(({path,record})=>{
      if(record?.uid&&record.uid!==currentUser.uid)throw new Error("Only the loadout owner can delete this record.");
      return remove(ref(database,path));
    }));
  }

  function removeCachedBuild(id){
    delete cloudPublicBuilds[id];
    delete cloudPrivateBuilds[id];
    state.builds=state.builds.filter(build=>build.id!==id);
    if(activeBuildId===id){
      draftBuild=newBuild();
      activeBuildId=state.builds[0]?.id||draftBuild.id;
      selectedSlot=0;
    }
    persist();
    render();
    renderLoadouts();
    renderPublicLoadouts();
  }

  function deleteLocalBuild(id){
    state.builds=state.builds.filter(build=>build.id!==id);
    if(activeBuildId===id){draftBuild=newBuild();activeBuildId=state.builds[0]?.id||draftBuild.id;}
    persist();
    render();
    toast("Local loadout deleted.");
  }

  function setCloudStatus(message){
    const status=$("#palVaultCloudStatus");
    if(status)status.textContent=message;
  }

  function confirmPalVault(message,title="Confirm Action"){
    return new Promise(resolve=>{
      const dialog=els.confirmDialog;
      const titleNode=$("#confirmDialogTitle");
      const messageNode=$("#confirmDialogMessage");
      const accept=$("#confirmDialogAccept");
      if(!dialog||!accept){resolve(false);return;}
      if(titleNode)titleNode.textContent=title;
      if(messageNode)messageNode.textContent=message;
      const cleanup=()=>{
        accept.removeEventListener("click", acceptHandler);
        dialog.removeEventListener("close", closeHandler);
      };
      const acceptHandler=()=>{
        cleanup();
        dialog.close("confirm");
        resolve(true);
      };
      const closeHandler=()=>{
        cleanup();
        resolve(dialog.returnValue==="confirm");
      };
      accept.addEventListener("click", acceptHandler);
      dialog.addEventListener("close", closeHandler,{once:true});
      dialog.showModal();
    });
  }

  function toast(m){els.toast.textContent=m;els.toast.classList.add("visible");clearTimeout(toast.t);toast.t=setTimeout(()=>els.toast.classList.remove("visible"),2200)}
})();
