import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  onValue,
  push,
  ref,
  runTransaction,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import {
  getFirebaseServices,
  isAdminUid
} from "./site-store.js?v=20260910a";

const MATERIAL_STACK = 99;
const CHIT_STACK = 9999;
const BASE_INVENTORY_SLOTS = 24;
const HOTBAR_SLOTS = 8;
const PROCESS_SECONDS = 10;
const IRON_CHEST_SLOTS = 64;
const DEFAULT_BANK_CHESTS = 1;
const MAX_BANK_CHESTS = 100;
const DRAGONWOLF_NET_PROFIT = 15;

const METHODS = {
  dragonwolf: {
    label: "Dragonwolf Hide",
    inputLabel: "Dragonwolf Hides",
    inputUnit: "hides",
    outputLabel: "Draconic Leather",
    unitCost: 45,
    unitOutput: 1,
    sellValue: 60,
    fixedData: [
      ["Hide Cost", "45 Chit"],
      ["Leather Sale", "60 Chit"],
      ["Yield", "1 hide : 1 leather"],
      ["Process", "10 sec / hide"]
    ]
  },
  ash: {
    label: "Ash Log Cycle",
    inputLabel: "Ash Logs",
    inputUnit: "logs",
    outputLabel: "Charcoal",
    unitCost: 3,
    unitOutput: 2,
    sellValue: 3,
    fixedData: [
      ["Ash Log Cost", "3 Chit"],
      ["Charcoal Sale", "3 Chit"],
      ["Yield", "1 log : 2 charcoal"],
      ["Process", "10 sec / stage"]
    ]
  }
};

const MERCHANTS = [
  {
    name: "Iasadair",
    specialty: "Hides, meats, and Kalphite gear",
    stock: [
      ["Dihydrogen Monoxide", 25],
      ["Garou Weave", 150],
      ["Tea Leaves", 20],
      ["Animal Hide", 6],
      ["Fleece", 18],
      ["Raw Rat Meat", 6],
      ["Raw Game Meat", 12],
      ["Egg", 12],
      ["Raw Bird Meat", 12],
      ["Dragonwolf Hide", 45],
      ["Raw Farm Meat", 18],
      ["Raw Bestial Meat", 24],
      ["Twitching Antenna", 2500, "blueprint"],
      ["Chitinous Carapace", 7500, "blueprint"],
      ["Barbed Appendage", 5000, "blueprint"],
      ["Sun-Bleached Leggings", 5000, "blueprint"]
    ]
  },
  {
    name: "Domri",
    specialty: "Plants, herbs, and cloth gear",
    stock: [
      ["Dihydrogen Monoxide", 25],
      ["Garou Weave", 150],
      ["Tea Leaves", 20],
      ["Flax", 12],
      ["Bittercap Mushroom", 12],
      ["Harralander", 6],
      ["Marrentill", 6],
      ["Redberries", 3],
      ["Cabbage", 6],
      ["Potato", 6],
      ["Toadflax", 12],
      ["Snapdragon", 12],
      ["Swamp Weed", 18],
      ["Shocking Plant Bulb", 18],
      ["Anima-Infused Bark", 18],
      ["Swamp Tar", 12],
      ["Wheat", 12],
      ["Dwellberries", 6],
      ["Onion", 12],
      ["Cadavaberries", 9],
      ["Pumpkin", 18],
      ["Watermelon", 18],
      ["Irit", 18],
      ["Corpse Cotton", 24],
      ["Maple Sap", 30],
      ["Selenic Veil", 2500, "blueprint"],
      ["Lunate Shawl", 7500, "blueprint"],
      ["Lunular Wrappings", 5000, "blueprint"],
      ["Sun-Bleached Head Wrap", 2500, "blueprint"]
    ]
  },
  {
    name: "Beartach",
    specialty: "Ore, stone, wood, and obsidian gear",
    stock: [
      ["Dihydrogen Monoxide", 25],
      ["Garou Weave", 150],
      ["Tea Leaves", 20],
      ["Stone", 3],
      ["Clay", 6],
      ["Copper Ore", 16],
      ["Tin Ore", 12],
      ["Ash Logs", 3],
      ["Oak Logs", 6],
      ["Sandstone", 6],
      ["Granite", 9],
      ["Iron Ore", 18],
      ["Silver Ore", 18],
      ["Gold Ore", 18],
      ["Blightwood", 9],
      ["Limestone", 12],
      ["Coal", 24],
      ["Mithril Ore", 30],
      ["Willow Logs", 12],
      ["Maple Logs", 15],
      ["Chipped Obsidian Construct", 2500, "blueprint"],
      ["Fractured Obsidian Construct", 7500, "blueprint"],
      ["Crushed Obsidian Construct", 5000, "blueprint"],
      ["Sun-Bleached Vest", 7500, "blueprint"]
    ]
  }
];

const CATALOG = MERCHANTS.flatMap((merchant) => merchant.stock.map(([name, price, type = "material"]) => ({
  id: `${slug(merchant.name)}-${slug(name)}`,
  merchant: merchant.name,
  specialty: merchant.specialty,
  name,
  price,
  type,
  stack: MATERIAL_STACK
})));

const state = {
  activeTab: "profit",
  method: "dragonwolf",
  profitMode: "quantity",
  profitInput: 0,
  hotbar: false,
  selectedItemId: CATALOG.find((item) => item.name === "Dragonwolf Hide")?.id || CATALOG[0].id,
  order: new Map(),
  user: null,
  isAdmin: false,
  bank: {
    balance: { amount: 0 },
    storage: { chestCount: DEFAULT_BANK_CHESTS },
    requests: {},
    ledger: {}
  },
  bankLoaded: false
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const numberFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 });
const { auth, database } = getFirebaseServices();
let unsubscribeBank = null;
let toastTimer = null;

function slug(value) {
  return String(value || "item")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function integerValue(value, fallback = 0) {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatNumber(value) {
  return numberFormat.format(Math.max(0, Number(value) || 0));
}

function formatSigned(value) {
  const number = Number(value) || 0;
  return `${number > 0 ? "+" : ""}${numberFormat.format(number)}`;
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.ceil(Number(seconds) || 0));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const remainingSeconds = total % 60;
  if (hours) return `${hours}h ${minutes}m`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
}

function formatDate(timestamp) {
  if (!timestamp) return "Pending timestamp";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(new Date(timestamp));
}

function inventorySlots() {
  return BASE_INVENTORY_SLOTS + (state.hotbar ? HOTBAR_SLOTS : 0);
}

function normalizedChestCount(value) {
  return Math.min(MAX_BANK_CHESTS, Math.max(1, integerValue(value, DEFAULT_BANK_CHESTS)));
}

function bankCapacity(chestCount = DEFAULT_BANK_CHESTS) {
  return normalizedChestCount(chestCount) * IRON_CHEST_SLOTS * CHIT_STACK;
}

function refreshIcons() {
  window.lucide?.createIcons({ attrs: { "stroke-width": 1.8 } });
}

function showToast(message) {
  const toast = $("#ledgerToast");
  toast.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function calculateRoute(methodKey, input, mode) {
  const method = METHODS[methodKey];
  const safeInput = Math.max(0, Math.floor(Number(input) || 0));
  const units = mode === "investment" ? Math.floor(safeInput / method.unitCost) : safeInput;
  const spend = units * method.unitCost;
  const output = units * method.unitOutput;
  const gross = output * method.sellValue;
  const profit = gross - spend;
  const roi = spend ? (profit / spend) * 100 : 0;
  const leftover = mode === "investment" ? safeInput - spend : 0;
  const materialSlots = Math.ceil(units / MATERIAL_STACK);
  const outputSlots = Math.ceil(output / MATERIAL_STACK);
  const chitSlots = Math.ceil(spend / CHIT_STACK);

  return {
    method,
    input: safeInput,
    units,
    spend,
    output,
    gross,
    profit,
    roi,
    leftover,
    materialSlots,
    outputSlots,
    chitSlots,
    peakSlots: Math.max(materialSlots, outputSlots, chitSlots)
  };
}

function setActiveTab(tabName) {
  state.activeTab = tabName;
  $$("[data-ledger-tab]").forEach((button) => {
    const active = button.dataset.ledgerTab === tabName;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-selected", String(active));
  });
  $$(".dw-panel[role='tabpanel']").forEach((panel) => {
    const active = panel.id === `panel-${tabName}`;
    panel.hidden = !active;
    panel.classList.toggle("is-active", active);
  });
  refreshIcons();
}

function setMethod(methodKey) {
  if (!METHODS[methodKey]) return;
  state.method = methodKey;
  $$('[data-method]').forEach((button) => button.classList.toggle("is-active", button.dataset.method === methodKey));
  renderProfit();
}

function setProfitMode(mode) {
  state.profitMode = mode === "investment" ? "investment" : "quantity";
  $$('[data-profit-mode]').forEach((button) => button.classList.toggle("is-active", button.dataset.profitMode === state.profitMode));
  $("#profitInput").value = "";
  $("#profitInput").placeholder = state.profitMode === "investment" ? "e.g. 50,000" : "e.g. 500";
  state.profitInput = 0;
  renderProfit();
}

function renderProfit() {
  const method = METHODS[state.method];
  const result = calculateRoute(state.method, state.profitInput, state.profitMode);
  const isInvestment = state.profitMode === "investment";

  $("#profitInputLabel").textContent = isInvestment ? "Garou Chit Investment" : method.inputLabel;
  $("#profitInputSuffix").textContent = isInvestment ? "chit" : method.inputUnit;
  $("#profitInputHelp").textContent = isInvestment
    ? `The ledger purchases the maximum whole ${method.inputUnit} the investment can cover.`
    : `Enter the number of ${method.inputUnit} you plan to buy and process.`;

  $("#fixedDataStrip").innerHTML = method.fixedData.map(([label, value]) => `
    <div><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>
  `).join("");

  $("#profitNet").textContent = formatNumber(result.profit);
  $("#profitUnits").textContent = formatNumber(result.units);
  $("#profitSpend").textContent = `${formatNumber(result.spend)} Chit`;
  $("#profitGross").textContent = `${formatNumber(result.gross)} Chit`;
  $("#profitRoi").textContent = `${percentFormat.format(result.roi)}%`;
  $("#profitOutput").textContent = `${formatNumber(result.output)} ${method.outputLabel}`;
  $("#profitLeftover").textContent = `${formatNumber(result.leftover)} Chit`;
  $("#profitTripFootprint").textContent = `${result.peakSlots} of ${inventorySlots()} slots required`;

  const formula = state.method === "dragonwolf"
    ? `${formatNumber(result.units)} hides x 45 Chit = ${formatNumber(result.spend)} invested. ${formatNumber(result.output)} leather x 60 Chit = ${formatNumber(result.gross)} returned. Net profit: ${formatNumber(result.profit)} Chit.`
    : `${formatNumber(result.units)} logs x 3 Chit = ${formatNumber(result.spend)} invested. ${formatNumber(result.units)} logs produce ${formatNumber(result.output)} charcoal x 3 Chit = ${formatNumber(result.gross)} returned. Net profit: ${formatNumber(result.profit)} Chit.`;
  $("#formulaTrace").innerHTML = `<strong>Formula Trace</strong><span>${escapeHtml(formula)}</span>`;

  const comparisonInvestment = state.profitMode === "investment" ? result.input : result.spend;
  const dragonwolf = calculateRoute("dragonwolf", comparisonInvestment, "investment");
  const ash = calculateRoute("ash", comparisonInvestment, "investment");
  $("#compareDragonwolf").innerHTML = `
    <span>Dragonwolf Hide</span>
    <strong>${formatNumber(dragonwolf.profit)} Chit profit</strong>
    <small>${formatNumber(dragonwolf.units)} hides / ${percentFormat.format(dragonwolf.roi)}% return</small>
  `;
  $("#compareAsh").innerHTML = `
    <span>Ash Log Cycle</span>
    <strong>${formatNumber(ash.profit)} Chit profit</strong>
    <small>${formatNumber(ash.units)} logs / ${percentFormat.format(ash.roi)}% return</small>
  `;

  renderProduction();
}

function renderProduction() {
  const methodKey = $("#productionMethod")?.value || state.method;
  const batch = Math.max(0, integerValue($("#productionBatch")?.value, 0));
  const targetMinutes = Math.max(0, integerValue($("#targetMinutes")?.value, 0));
  const targetSeconds = targetMinutes * 60;
  const tanneries = Math.max(0, integerValue($("#tanneryCount")?.value, 0));
  const sawmills = Math.max(0, integerValue($("#sawmillCount")?.value, 0));
  const kilns = Math.max(0, integerValue($("#kilnCount")?.value, 0));
  const slots = inventorySlots();
  const materialSlots = Math.ceil(batch / MATERIAL_STACK);
  const usagePercent = Math.min(100, slots ? (materialSlots / slots) * 100 : 0);

  $("#headerInventory").textContent = `${slots} Slots`;
  $("#productionBatchLabel").textContent = methodKey === "dragonwolf" ? "Hides to Process" : "Ash Logs to Process";
  $("#inventoryUsageLabel").textContent = `${materialSlots} / ${slots} slots`;
  $("#inventoryUsageBar").style.width = `${usagePercent}%`;
  $("#inventoryUsageBar").style.background = materialSlots > slots ? "var(--dw-red)" : "var(--dw-cyan)";

  $$('[data-station]').forEach((station) => {
    const relevant = methodKey === "dragonwolf" ? station.dataset.station === "tannery" : station.dataset.station !== "tannery";
    station.classList.toggle("is-muted", !relevant);
  });

  const hasRequiredStations = methodKey === "dragonwolf" ? tanneries > 0 : sawmills > 0 && kilns > 0;
  if (!batch || !hasRequiredStations) {
    $("#productionDuration").textContent = "Awaiting inputs";
    $("#productionBalance").textContent = "Not calculated";
    $("#productionBalance").classList.remove("is-warning");
    $("#recommendedStations").textContent = "Enter batch details";
    $("#recommendationCopy").textContent = methodKey === "dragonwolf"
      ? "Add the hide quantity and tannery count. A target time is optional but enables a pace recommendation."
      : "Add the log quantity, sawmill count, and kiln count. A target time is optional but enables a scaled 1:2 line recommendation.";
    $("#productionSummary").textContent = "No station assumptions are applied to blank fields.";
    $("#processTrack").innerHTML = '<p class="dw-empty-state">Processing stages will appear after the required values are entered.</p>';
    return;
  }

  if (methodKey === "dragonwolf") {
    const seconds = Math.ceil(batch / tanneries) * PROCESS_SECONDS;
    const targetStations = targetSeconds ? Math.max(1, Math.ceil((batch * PROCESS_SECONDS) / targetSeconds)) : 0;
    const unattendedStations = Math.max(1, Math.ceil(batch / MATERIAL_STACK));
    const waves = Math.max(1, Math.ceil(batch / (tanneries * MATERIAL_STACK)));
    const withinTarget = targetSeconds ? seconds <= targetSeconds : null;

    $("#productionDuration").textContent = formatDuration(seconds);
    $("#productionBalance").textContent = withinTarget === null ? "Timing ready" : withinTarget ? "Target met" : "Over target";
    $("#productionBalance").classList.toggle("is-warning", withinTarget === false);
    $("#recommendedStations").textContent = `${unattendedStations} tanneries for one load`;
    $("#recommendationCopy").textContent = targetSeconds
      ? `${targetStations} continuously fed tanneries meet the selected time target. ${unattendedStations} stations hold the entire batch without reloading.`
      : `${unattendedStations} stations hold the entire batch without reloading. Enter a target time to calculate the minimum continuously fed station count.`;
    $("#productionSummary").textContent = `${formatNumber(batch)} hides distributed across ${tanneries} tanneries require ${waves} load wave${waves === 1 ? "" : "s"}. Your 30-tannery benchmark holds 2,970 hides per unattended cycle.`;
    $("#processTrack").innerHTML = processStep("Tannery processing", seconds, seconds, `${formatNumber(batch)} leather`);
  } else {
    const plankSeconds = Math.ceil(batch / sawmills) * PROCESS_SECONDS;
    const plankCount = batch * 2;
    const charcoalSeconds = Math.ceil(plankCount / kilns) * PROCESS_SECONDS;
    const totalSeconds = plankSeconds + charcoalSeconds;
    const recommendedSawmills = targetSeconds ? Math.max(1, Math.ceil((batch * PROCESS_SECONDS * 2) / targetSeconds)) : sawmills;
    const recommendedKilns = recommendedSawmills * 2;
    const ratio = kilns / sawmills;
    const balanceLabel = ratio < 2 ? "Kiln bottleneck" : ratio > 2 ? "Extra kiln capacity" : "Balanced 1 : 2";

    $("#productionDuration").textContent = formatDuration(totalSeconds);
    $("#productionBalance").textContent = balanceLabel;
    $("#productionBalance").classList.toggle("is-warning", ratio < 2);
    $("#recommendedStations").textContent = `${recommendedSawmills} sawmill${recommendedSawmills === 1 ? "" : "s"} / ${recommendedKilns} kilns`;
    $("#recommendationCopy").textContent = targetSeconds
      ? `That balanced line targets ${formatDuration(targetSeconds)} for the full two-stage batch. Every sawmill should be paired with two kilns.`
      : "This recommendation balances the entered sawmill count at two kilns per sawmill. Enter a target time to scale the full line automatically.";
    $("#productionSummary").textContent = `${formatNumber(batch)} logs become ${formatNumber(plankCount)} planks and then ${formatNumber(plankCount)} charcoal. Times are sequential machine estimates and exclude manual transfer between stations.`;
    $("#processTrack").innerHTML = [
      processStep("Sawmill / planks", plankSeconds, totalSeconds, `${formatNumber(plankCount)} planks`),
      processStep("Kiln / charcoal", charcoalSeconds, totalSeconds, `${formatNumber(plankCount)} charcoal`)
    ].join("");
  }
}

function processStep(label, seconds, total, output) {
  const width = total ? Math.max(4, Math.round((seconds / total) * 100)) : 0;
  return `
    <div class="dw-process-step">
      <span>${escapeHtml(label)}</span>
      <div class="dw-process-line"><i style="width:${width}%"></i></div>
      <strong>${escapeHtml(formatDuration(seconds))}</strong>
      <small class="visually-hidden">${escapeHtml(output)}</small>
    </div>
  `;
}

function filteredCatalog() {
  const query = $("#catalogSearch").value.trim().toLowerCase();
  const merchant = $("#merchantFilter").value;
  const type = $("#catalogTypeFilter").value;
  return CATALOG.filter((item) => {
    const matchesQuery = !query || `${item.name} ${item.merchant} ${item.specialty}`.toLowerCase().includes(query);
    const matchesMerchant = merchant === "all" || item.merchant === merchant;
    const matchesType = type === "all" || item.type === type;
    return matchesQuery && matchesMerchant && matchesType;
  });
}

function renderCatalog() {
  const items = filteredCatalog();
  $("#catalogCount").textContent = formatNumber(items.length);
  $("#catalogEmpty").hidden = items.length > 0;
  $("#catalogRows").innerHTML = items.map((item) => `
    <tr class="${item.id === state.selectedItemId ? "is-selected" : ""}" data-item-row="${item.id}">
      <td>${escapeHtml(item.merchant)}</td>
      <td><strong>${escapeHtml(item.name)}</strong></td>
      <td><span class="dw-stock-tag ${item.type === "blueprint" ? "blueprint" : ""}">${escapeHtml(item.type)}</span></td>
      <td>${formatNumber(item.price)} Chit</td>
      <td>${formatNumber(item.stack)}</td>
      <td>
        <button class="dw-select-stock" type="button" data-select-item="${item.id}" title="Plan ${escapeHtml(item.name)}" aria-label="Plan ${escapeHtml(item.name)}">
          <i data-lucide="chevron-right" aria-hidden="true"></i>
        </button>
      </td>
    </tr>
  `).join("");
  renderSelectedItem();
  refreshIcons();
}

function selectedItem() {
  return CATALOG.find((item) => item.id === state.selectedItemId) || CATALOG[0];
}

function renderSelectedItem() {
  const item = selectedItem();
  const quantityInput = $("#selectedItemQuantity");
  let quantity = Math.max(0, integerValue(quantityInput.value, 0));
  if (item.type === "blueprint" && quantity > 1) quantity = 1;
  if (quantity) quantityInput.value = quantity;
  quantityInput.max = item.type === "blueprint" ? "1" : "999999";
  $("#selectedItemName").textContent = item.name;
  $("#selectedItemMeta").textContent = `${item.merchant} / ${item.type === "blueprint" ? "One-time blueprint" : item.specialty}`;
  $("#selectedItemCost").textContent = `${formatNumber(item.price * quantity)} Chit`;
  $("#selectedItemSlots").textContent = `${Math.ceil(quantity / item.stack)} slot${Math.ceil(quantity / item.stack) === 1 ? "" : "s"}`;
  $("#addOrderItem").disabled = quantity < 1;
}

function addSelectedItemToOrder() {
  const item = selectedItem();
  const requested = item.type === "blueprint"
    ? Math.min(1, Math.max(0, integerValue($("#selectedItemQuantity").value, 0)))
    : Math.max(0, integerValue($("#selectedItemQuantity").value, 0));
  if (!requested) {
    showToast("Enter a quantity before adding this item.");
    return;
  }
  const current = state.order.get(item.id) || 0;
  state.order.set(item.id, item.type === "blueprint" ? 1 : current + requested);
  renderOrder();
  showToast(`${item.name} added to the requisition.`);
}

function orderSummary() {
  const lines = [...state.order.entries()].map(([id, quantity]) => {
    const item = CATALOG.find((entry) => entry.id === id);
    return item ? { item, quantity } : null;
  }).filter(Boolean);
  const totalCost = lines.reduce((sum, line) => sum + (line.item.price * line.quantity), 0);
  const itemSlots = lines.reduce((sum, line) => sum + Math.ceil(line.quantity / line.item.stack), 0);
  const chitSlots = Math.ceil(totalCost / CHIT_STACK);
  return {
    lines,
    totalCost,
    itemSlots,
    chitSlots,
    peakSlots: Math.max(itemSlots, chitSlots)
  };
}

function replenishmentSummary(totalCost) {
  const cost = Math.max(0, Number(totalCost) || 0);
  const hides = Math.ceil(cost / DRAGONWOLF_NET_PROFIT);
  const workingCapital = hides * METHODS.dragonwolf.unitCost;
  const grossReturn = hides * METHODS.dragonwolf.sellValue;
  const netRecovery = grossReturn - workingCapital;
  const stacks = Math.ceil(hides / MATERIAL_STACK);
  const tanneries = Math.max(0, integerValue($("#tanneryCount")?.value, 0));
  const seconds = hides && tanneries ? Math.ceil(hides / tanneries) * PROCESS_SECONDS : hides * PROCESS_SECONDS;
  const waves = hides && tanneries ? Math.ceil(hides / (tanneries * MATERIAL_STACK)) : stacks;
  return { hides, workingCapital, grossReturn, netRecovery, stacks, tanneries, seconds, waves };
}

function renderOrder() {
  const order = orderSummary();
  const recovery = replenishmentSummary(order.totalCost);
  const slots = inventorySlots();
  $("#orderItemCount").textContent = order.lines.length ? `${order.lines.length} item type${order.lines.length === 1 ? "" : "s"}` : "No items";
  $("#orderLines").innerHTML = order.lines.length ? order.lines.map(({ item, quantity }) => `
    <div class="dw-order-line">
      <div><strong>${escapeHtml(item.name)}</strong><small>${escapeHtml(item.merchant)} / ${formatNumber(quantity)} units</small></div>
      <span>${formatNumber(item.price * quantity)}</span>
      <button type="button" data-remove-order="${item.id}" title="Remove ${escapeHtml(item.name)}" aria-label="Remove ${escapeHtml(item.name)}">
        <i data-lucide="x" aria-hidden="true"></i>
      </button>
    </div>
  `).join("") : '<p class="dw-empty-state">No stock selected.</p>';
  $("#orderTotalCost").textContent = `${formatNumber(order.totalCost)} Chit`;
  $("#orderItemSlots").textContent = formatNumber(order.itemSlots);
  $("#orderChitSlots").textContent = formatNumber(order.chitSlots);
  $("#orderPeakSlots").textContent = `${order.peakSlots} / ${slots}`;

  $("#orderReplenishment").hidden = !order.lines.length;
  $("#replenishmentHides").textContent = formatNumber(recovery.hides);
  $("#replenishmentCapital").textContent = `${formatNumber(recovery.workingCapital)} Chit`;
  $("#replenishmentGross").textContent = `${formatNumber(recovery.grossReturn)} Chit`;
  $("#replenishmentNet").textContent = `${formatNumber(recovery.netRecovery)} Chit`;
  $("#replenishmentNote").textContent = order.lines.length
    ? `${recovery.stacks} hide stack${recovery.stacks === 1 ? "" : "s"}. ${recovery.tanneries ? `${recovery.tanneries} tanneries finish in about ${formatDuration(recovery.seconds)} across ${recovery.waves} load wave${recovery.waves === 1 ? "" : "s"}.` : `One tannery takes about ${formatDuration(recovery.seconds)}; enter your tannery count in Production Planner for a parallel estimate.`} The run recovers the ${formatNumber(order.totalCost)}-Chit order with ${formatNumber(recovery.netRecovery - order.totalCost)} Chit to spare.`
    : "";

  const fit = order.lines.length > 0 && order.peakSlots <= slots;
  const fitStatus = $("#orderFitStatus");
  fitStatus.className = `dw-fit-status ${fit ? "is-good" : order.lines.length ? "is-warning" : ""}`;
  fitStatus.textContent = !order.lines.length
    ? "Add stock to begin an order."
    : fit
      ? `Fits in one ${slots}-slot trip when carrying the exact Chit amount.`
      : `Needs ${order.peakSlots - slots} more slot${order.peakSlots - slots === 1 ? "" : "s"}, or split the order.`;

  const requestButton = $("#requestOrderFunds");
  requestButton.disabled = !order.lines.length;
  requestButton.title = state.user ? "Submit this requisition to the bank" : "Sign in to submit a bank request";
  refreshIcons();
}

function orderRequestNote(order) {
  const summary = order.lines.map(({ item, quantity }) => `${formatNumber(quantity)} ${item.name}`).join(", ");
  return `Merchant requisition: ${summary}`.slice(0, 160);
}

function displayName() {
  return state.user?.displayName || state.user?.email?.split("@")[0] || "Bancy Member";
}

async function submitBankRequest(type, amount, note) {
  if (!state.user) {
    setActiveTab("bank");
    showToast("Sign in before submitting a bank request.");
    return false;
  }

  const safeAmount = Math.max(0, Math.floor(Number(amount) || 0));
  const safeNote = String(note || "").trim().slice(0, 160);
  if (!safeAmount || !safeNote) throw new Error("Enter an amount and a transaction note.");

  const requestRef = push(ref(database, "dragonwildsLedger/requests"));
  await set(requestRef, {
    id: requestRef.key,
    uid: state.user.uid,
    displayName: displayName().slice(0, 64),
    type,
    amount: safeAmount,
    note: safeNote,
    status: "pending",
    createdAt: Date.now()
  });
  return true;
}

function normalizeEntries(value) {
  if (!value || typeof value !== "object") return [];
  return Object.entries(value).map(([id, entry]) => ({ id, ...entry }));
}

function renderBank() {
  const requests = normalizeEntries(state.bank.requests).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const ledger = normalizeEntries(state.bank.ledger).sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0));
  const visibleRequests = state.isAdmin ? requests : requests.filter((request) => request.uid === state.user?.uid);
  const pending = visibleRequests.filter((request) => request.status === "pending");
  const bankAmount = Number(state.bank.balance?.amount || 0);
  const chestCount = normalizedChestCount(state.bank.storage?.chestCount);
  const capacity = bankCapacity(chestCount);
  const remaining = Math.max(0, capacity - bankAmount);
  const usedPercent = capacity ? Math.min(100, Math.max(0, (bankAmount / capacity) * 100)) : 0;

  $("#bankBalance").textContent = state.user && state.bankLoaded ? formatNumber(bankAmount) : "--";
  $("#bankCapacity").textContent = state.user && state.bankLoaded ? formatNumber(capacity) : "--";
  $("#bankCapacityLabel").textContent = `${chestCount} Iron Chest${chestCount === 1 ? "" : "s"} / ${formatNumber(chestCount * IRON_CHEST_SLOTS)} slots`;
  $("#bankRemainingCapacity").textContent = state.user && state.bankLoaded ? `${formatNumber(remaining)} Chit` : "--";
  $("#bankCapacityBar").style.width = state.user && state.bankLoaded ? `${usedPercent}%` : "0%";
  $("#bankCapacityMeter").setAttribute("aria-valuenow", state.user && state.bankLoaded ? String(Math.round(usedPercent)) : "0");
  $("#bankCapacityStatus").textContent = state.user && state.bankLoaded
    ? `${percentFormat.format(usedPercent)}% used / ${formatNumber(remaining)} Chits remain before another chest is required.`
    : "Sign in to view physical storage usage.";
  $("#bankPendingCount").textContent = formatNumber(pending.length);
  $("#bankLedgerCount").textContent = formatNumber(ledger.length);
  $("#bankAccessLabel").textContent = state.isAdmin ? "Administrator" : state.user ? "Member" : "Guest";
  $("#pendingTabBadge").hidden = !pending.length;
  $("#pendingTabBadge").textContent = formatNumber(pending.length);
  $("#requestQueueHint").textContent = state.isAdmin ? "All member requests" : "Your requests";

  const connection = $("#bankConnectionState");
  connection.classList.toggle("is-online", Boolean(state.user && state.bankLoaded));
  connection.innerHTML = `<i></i> ${state.user ? state.bankLoaded ? "Ledger connected" : "Connecting" : "Sign in required"}`;

  $("#bankSignedOutGate").hidden = Boolean(state.user);
  $("#bankMemberWorkspace").hidden = !state.user;
  $("#adminBankPanel").hidden = !state.isAdmin;
  if (state.isAdmin && document.activeElement !== $("#adminChestCount")) {
    $("#adminChestCount").value = chestCount;
    renderStoragePreview();
  }

  $("#bankRequestList").innerHTML = visibleRequests.length ? visibleRequests.map((request) => bankRequestMarkup(request)).join("") : '<p class="dw-empty-state">No transaction requests yet.</p>';
  $("#bankLedgerList").innerHTML = ledger.length ? ledger.slice(0, 40).map((entry) => bankLedgerMarkup(entry)).join("") : '<p class="dw-empty-state">No approved activity yet.</p>';
  refreshIcons();
}

function bankRequestMarkup(request) {
  const isPending = request.status === "pending";
  return `
    <article class="dw-bank-entry">
      <div>
        <h4>${escapeHtml(request.type)} / ${escapeHtml(request.status || "pending")}</h4>
        <p>${escapeHtml(request.note)}</p>
        <small>${escapeHtml(request.displayName || "Member")} / ${escapeHtml(formatDate(request.createdAt))}</small>
      </div>
      <div class="dw-bank-entry-value"><strong>${formatNumber(request.amount)} Chit</strong></div>
      ${state.isAdmin && isPending ? `
        <div class="dw-entry-actions">
          <button type="button" data-action="approve" data-request-id="${escapeHtml(request.id)}">Approve</button>
          <button type="button" data-action="reject" data-request-id="${escapeHtml(request.id)}">Reject</button>
        </div>
      ` : ""}
    </article>
  `;
}

function bankLedgerMarkup(entry) {
  const amount = Number(entry.amount || 0);
  const valueClass = amount > 0 ? "is-positive" : amount < 0 ? "is-negative" : "";
  return `
    <article class="dw-bank-entry">
      <div>
        <h4>${escapeHtml(entry.type || "entry")}</h4>
        <p>${escapeHtml(entry.note || "Ledger entry")}</p>
        <small>${escapeHtml(entry.displayName || "Administrator")} / ${escapeHtml(formatDate(entry.createdAt))}</small>
      </div>
      <div class="dw-bank-entry-value">
        <strong class="${valueClass}">${escapeHtml(formatSigned(amount))}</strong>
        <small>Balance ${formatNumber(entry.balanceAfter)}</small>
      </div>
    </article>
  `;
}

function subscribeToBank() {
  if (unsubscribeBank) {
    unsubscribeBank();
    unsubscribeBank = null;
  }
  state.bankLoaded = false;
  if (!state.user) {
    state.bank = { balance: { amount: 0 }, storage: { chestCount: DEFAULT_BANK_CHESTS }, requests: {}, ledger: {} };
    renderBank();
    return;
  }

  unsubscribeBank = onValue(ref(database, "dragonwildsLedger"), (snapshot) => {
    const value = snapshot.val() || {};
    state.bank = {
      balance: value.balance || { amount: 0 },
      storage: value.storage || { chestCount: DEFAULT_BANK_CHESTS },
      requests: value.requests || {},
      ledger: value.ledger || {}
    };
    state.bankLoaded = true;
    renderBank();
  }, () => {
    state.bankLoaded = false;
    renderBank();
  });
}

async function resolveBankRequest(requestId, decision) {
  if (!state.isAdmin || !requestId) return;
  if (decision === "reject") {
    await update(ref(database, `dragonwildsLedger/requests/${requestId}`), {
      status: "rejected",
      resolvedAt: Date.now(),
      resolvedByUid: state.user.uid
    });
    showToast("Bank request rejected.");
    return;
  }

  const ledgerId = push(ref(database, "dragonwildsLedger/ledger")).key;
  const result = await runTransaction(ref(database, "dragonwildsLedger"), (current) => {
    const data = current || {};
    const request = data.requests?.[requestId];
    if (!request || request.status !== "pending") return;
    const currentBalance = Number(data.balance?.amount || 0);
    const direction = request.type === "deposit" ? 1 : -1;
    const delta = direction * Number(request.amount || 0);
    const nextBalance = currentBalance + delta;
    const capacity = bankCapacity(data.storage?.chestCount);
    if (nextBalance < 0 || nextBalance > capacity) return;

    data.balance = {
      amount: nextBalance,
      updatedAt: Date.now(),
      updatedByUid: state.user.uid
    };
    data.requests = data.requests || {};
    data.requests[requestId] = {
      ...request,
      status: "approved",
      resolvedAt: Date.now(),
      resolvedByUid: state.user.uid
    };
    data.ledger = data.ledger || {};
    data.ledger[ledgerId] = {
      id: ledgerId,
      requestId,
      uid: request.uid,
      displayName: request.displayName,
      type: request.type,
      amount: delta,
      note: request.note,
      balanceAfter: nextBalance,
      createdAt: Date.now(),
      approvedByUid: state.user.uid
    };
    return data;
  });

  if (!result.committed) throw new Error("The request changed, lacks available funds, or exceeds physical bank capacity.");
  showToast("Bank request approved and posted.");
}

async function applyAdminAdjustment() {
  if (!state.isAdmin) return;
  const amount = integerValue($("#adminAdjustmentAmount").value, 0);
  const note = $("#adminAdjustmentNote").value.trim().slice(0, 160);
  if (!amount || !note) throw new Error("Enter a non-zero adjustment and a reconciliation note.");
  const ledgerId = push(ref(database, "dragonwildsLedger/ledger")).key;
  const result = await runTransaction(ref(database, "dragonwildsLedger"), (current) => {
    const data = current || {};
    const currentBalance = Number(data.balance?.amount || 0);
    const nextBalance = currentBalance + amount;
    const capacity = bankCapacity(data.storage?.chestCount);
    if (nextBalance < 0 || nextBalance > capacity) return;
    data.balance = {
      amount: nextBalance,
      updatedAt: Date.now(),
      updatedByUid: state.user.uid
    };
    data.ledger = data.ledger || {};
    data.ledger[ledgerId] = {
      id: ledgerId,
      uid: state.user.uid,
      displayName: displayName(),
      type: "adjustment",
      amount,
      note,
      balanceAfter: nextBalance,
      createdAt: Date.now(),
      approvedByUid: state.user.uid
    };
    return data;
  });
  if (!result.committed) throw new Error("That adjustment would make the balance negative or exceed physical capacity.");
  $("#adminAdjustmentAmount").value = "";
  $("#adminAdjustmentNote").value = "";
  showToast("Bank balance adjusted.");
}

function renderStoragePreview() {
  const input = $("#adminChestCount");
  const chestCount = normalizedChestCount(input?.value);
  const slots = chestCount * IRON_CHEST_SLOTS;
  $("#adminStoragePreview").textContent = `${chestCount} chest${chestCount === 1 ? "" : "s"} provide ${formatNumber(slots)} slots and store up to ${formatNumber(bankCapacity(chestCount))} Chits.`;
}

async function saveBankStorage() {
  if (!state.isAdmin) return;
  const chestCount = normalizedChestCount($("#adminChestCount").value);
  const result = await runTransaction(ref(database, "dragonwildsLedger"), (current) => {
    const data = current || {};
    const currentBalance = Number(data.balance?.amount || 0);
    if (currentBalance > bankCapacity(chestCount)) return;
    data.storage = {
      chestCount,
      updatedAt: Date.now(),
      updatedByUid: state.user.uid
    };
    return data;
  });
  if (!result.committed) throw new Error("The current balance will not fit in that many chests.");
  showToast("Physical bank capacity updated.");
}

function updateAuthUi() {
  $("#authRoleLabel").textContent = state.isAdmin ? "Administrator" : state.user ? "Signed-in Member" : "Public Tools";
  renderBank();
  renderOrder();
}

function bindEvents() {
  $$("[data-ledger-tab]").forEach((button) => button.addEventListener("click", () => setActiveTab(button.dataset.ledgerTab)));
  $$('[data-method]').forEach((button) => button.addEventListener("click", () => setMethod(button.dataset.method)));
  $$('[data-profit-mode]').forEach((button) => button.addEventListener("click", () => setProfitMode(button.dataset.profitMode)));

  $("#profitInput").addEventListener("input", (event) => {
    state.profitInput = Math.max(0, integerValue(event.target.value, 0));
    renderProfit();
  });

  $("#resetProfit").addEventListener("click", () => {
    state.method = "dragonwolf";
    state.profitMode = "quantity";
    state.profitInput = 0;
    $("#profitInput").value = "";
    $("#profitInput").placeholder = "e.g. 500";
    $$('[data-method]').forEach((button) => button.classList.toggle("is-active", button.dataset.method === "dragonwolf"));
    $$('[data-profit-mode]').forEach((button) => button.classList.toggle("is-active", button.dataset.profitMode === "quantity"));
    renderProfit();
  });

  $("#sendToProduction").addEventListener("click", () => {
    const result = calculateRoute(state.method, state.profitInput, state.profitMode);
    $("#productionMethod").value = state.method;
    $("#productionBatch").value = result.units;
    renderProduction();
    setActiveTab("production");
  });

  ["productionMethod", "productionBatch", "targetMinutes", "tanneryCount", "sawmillCount", "kilnCount"].forEach((id) => {
    $("#" + id).addEventListener("input", renderProduction);
    $("#" + id).addEventListener("change", renderProduction);
  });

  $("#hotbarToggle").addEventListener("change", (event) => {
    state.hotbar = event.target.checked;
    renderProfit();
    renderProduction();
    renderOrder();
  });

  ["catalogSearch", "merchantFilter", "catalogTypeFilter"].forEach((id) => {
    $("#" + id).addEventListener(id === "catalogSearch" ? "input" : "change", renderCatalog);
  });

  $("#catalogRows").addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-item]");
    if (!button) return;
    state.selectedItemId = button.dataset.selectItem;
    $("#selectedItemQuantity").value = "";
    renderCatalog();
  });

  $("#selectedItemQuantity").addEventListener("input", renderSelectedItem);
  $("#addOrderItem").addEventListener("click", addSelectedItemToOrder);
  $("#clearOrder").addEventListener("click", () => {
    state.order.clear();
    renderOrder();
  });
  $("#planReplenishment").addEventListener("click", () => {
    const recovery = replenishmentSummary(orderSummary().totalCost);
    if (!recovery.hides) return;
    $("#productionMethod").value = "dragonwolf";
    $("#productionBatch").value = recovery.hides;
    renderProduction();
    setActiveTab("production");
    showToast("Recovery batch sent to Production Planner.");
  });
  $("#orderLines").addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-order]");
    if (!button) return;
    state.order.delete(button.dataset.removeOrder);
    renderOrder();
  });

  $("#requestOrderFunds").addEventListener("click", async () => {
    const order = orderSummary();
    if (!state.user) {
      setActiveTab("bank");
      showToast("Sign in before submitting a bank request.");
      return;
    }
    try {
      await submitBankRequest("purchase", order.totalCost, orderRequestNote(order));
      state.order.clear();
      renderOrder();
      setActiveTab("bank");
      showToast("Merchant purchase request submitted.");
    } catch (error) {
      showToast(error.message || "The purchase request could not be submitted.");
    }
  });

  $("#bankRequestForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const status = $("#bankRequestStatus");
    status.className = "dw-form-status";
    status.textContent = "Submitting...";
    try {
      await submitBankRequest(
        $("#bankRequestType").value,
        $("#bankRequestAmount").value,
        $("#bankRequestNote").value
      );
      event.target.reset();
      status.classList.add("is-good");
      status.textContent = "Request added to the ledger queue.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error.message || "Request failed.";
    }
  });

  $("#bankRequestList").addEventListener("click", async (event) => {
    const button = event.target.closest("[data-request-id]");
    if (!button) return;
    button.disabled = true;
    try {
      await resolveBankRequest(button.dataset.requestId, button.dataset.action);
    } catch (error) {
      showToast(error.message || "The request could not be updated.");
      button.disabled = false;
    }
  });

  $("#applyAdminAdjustment").addEventListener("click", async () => {
    const status = $("#adminAdjustmentStatus");
    status.className = "dw-form-status";
    status.textContent = "Applying...";
    try {
      await applyAdminAdjustment();
      status.classList.add("is-good");
      status.textContent = "Adjustment posted to the ledger.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error.message || "Adjustment failed.";
    }
  });

  $("#adminChestCount").addEventListener("input", renderStoragePreview);
  $("#saveBankStorage").addEventListener("click", async () => {
    const status = $("#adminStorageStatus");
    status.className = "dw-form-status";
    status.textContent = "Saving...";
    try {
      await saveBankStorage();
      status.classList.add("is-good");
      status.textContent = "Chest allocation saved to the shared ledger.";
    } catch (error) {
      status.classList.add("is-error");
      status.textContent = error.message || "Capacity update failed.";
    }
  });
}

bindEvents();
renderProfit();
renderCatalog();
renderOrder();
renderBank();
refreshIcons();

onAuthStateChanged(auth, async (user) => {
  state.user = user || null;
  state.isAdmin = user ? await isAdminUid(user.uid).catch(() => false) : false;
  updateAuthUi();
  subscribeToBank();
});
