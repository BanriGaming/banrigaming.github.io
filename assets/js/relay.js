import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  limitToLast,
  onDisconnect,
  onValue,
  push,
  query,
  ref,
  remove,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { getFirebaseServices } from "./site-store.js";

const { auth, database } = getFirebaseServices();

const REACTION_OPTIONS = [
  { id: "thumbs", emoji: "\u{1F44D}", label: "Thumbs up" },
  { id: "laugh", emoji: "\u{1F602}", label: "Laugh" },
  { id: "fire", emoji: "\u{1F525}", label: "Fire" },
  { id: "game", emoji: "\u{1F3AE}", label: "Gaming" },
  { id: "cyan", emoji: "\u{1F499}", label: "Blue heart" },
  { id: "eyes", emoji: "\u{1F440}", label: "Eyes" }
];

const EMOJI_OPTIONS = [
  "\u{1F600}",
  "\u{1F602}",
  "\u{1F525}",
  "\u{1F3AE}",
  "\u{1F499}",
  "\u{1F440}",
  "\u{1F44D}",
  "\u{2728}",
  "\u{1FAE1}",
  "\u{1F680}",
  "\u{2694}\u{FE0F}",
  "\u{1F319}",
  "\u{2615}",
  "\u{1F3A7}",
  "\u{1F4E1}"
];

const state = {
  currentUser: null,
  mode: "global",
  activeThreadId: "",
  activeRecipientUid: "",
  messages: [],
  reactions: {},
  presence: {},
  profiles: {},
  replyTo: null,
  editingMessageId: "",
  lastRenderAtBottom: true
};

const elements = {
  locked: document.getElementById("relayLockedPanel"),
  console: document.getElementById("relayConsole"),
  messages: document.getElementById("relayMessages"),
  presence: document.getElementById("relayPresenceList"),
  dmList: document.getElementById("relayDmList"),
  channelTitle: document.getElementById("relayChannelTitle"),
  channelMeta: document.getElementById("relayChannelMeta"),
  form: document.getElementById("relayComposer"),
  input: document.getElementById("relayMessageInput"),
  send: document.getElementById("relaySendButton"),
  replyPreview: document.getElementById("relayReplyPreview"),
  emojiPanel: document.getElementById("relayEmojiPanel"),
  status: document.getElementById("relayStatus")
};

let unsubscribeMessages = null;
let unsubscribeReactions = null;
let unsubscribePresence = null;
let unsubscribeProfiles = null;
let resizeTimer = null;
let presenceTouchAt = 0;

function getMessageBasePath() {
  return state.mode === "dm" && state.activeThreadId
    ? `relayThreadMessages/${state.activeThreadId}`
    : "relayMessages";
}

function getReactionBasePath() {
  return state.mode === "dm" && state.activeThreadId
    ? `relayThreadReactions/${state.activeThreadId}`
    : "relayReactions";
}

function getDmThreadId(uidA, uidB) {
  return `dm_${[uidA, uidB].sort().join("_")}`;
}

function getProfileDisplayName(uid) {
  return state.profiles?.[uid]?.displayName
    || state.presence?.[uid]?.displayName
    || "Nexus User";
}

function setStatus(message, tone = "info") {
  if (!elements.status) return;
  elements.status.textContent = message || "";
  elements.status.dataset.tone = tone;
}

function displayNameFor(user) {
  return String(user?.displayName || user?.email?.split("@")[0] || "Nexus User").trim().slice(0, 32);
}

async function setPresence(user) {
  const presenceRef = ref(database, `presence/${user.uid}`);
  const offlineState = {
    uid: user.uid,
    displayName: displayNameFor(user),
    online: false,
    lastSeen: Date.now()
  };
  await onDisconnect(presenceRef).set(offlineState);
  await set(presenceRef, {
    uid: user.uid,
    displayName: displayNameFor(user),
    online: true,
    lastSeen: Date.now()
  });
}

async function markOffline(user) {
  if (!user?.uid) return;
  await set(ref(database, `presence/${user.uid}`), {
    uid: user.uid,
    displayName: displayNameFor(user),
    online: false,
    lastSeen: Date.now()
  }).catch(() => {});
}

function touchPresence(force = false) {
  if (!state.currentUser) return;
  const now = Date.now();
  if (!force && now - presenceTouchAt < 8000) return;
  presenceTouchAt = now;
  setPresence(state.currentUser).catch(() => {});
}

function renderMessages() {
  if (!elements.messages) return;
  const shouldStick = elements.messages.scrollTop + elements.messages.clientHeight >= elements.messages.scrollHeight - 120;
  state.lastRenderAtBottom = shouldStick || !elements.messages.scrollHeight;

  elements.messages.innerHTML = state.messages.length
    ? state.messages.map(renderMessage).join("")
    : '<div class="relay-empty">No transmissions yet.</div>';

  if (state.lastRenderAtBottom) {
    elements.messages.scrollTop = elements.messages.scrollHeight;
  }
}

function renderMessage(message) {
  const isOwn = message.uid === state.currentUser?.uid;
  const reactions = aggregateReactions(message.id);
  const displayName = message.displayName || "Nexus User";
  const profile = state.profiles?.[message.uid] || {};
  const photoURL = profile.photoURL || "";
  const time = formatChatTime(message.createdAt);
  const ariaLabel = `${displayName} at ${time}: ${message.text || ""}`;

  return `
    <article class="relay-message${isOwn ? " own" : ""}" data-message-id="${escapeAttr(message.id)}" aria-label="${escapeAttr(ariaLabel)}">
      <div class="relay-message-avatar${photoURL ? " has-photo" : ""}" aria-hidden="true">
        ${photoURL ? `<img src="${escapeAttr(photoURL)}" alt="" loading="lazy" referrerpolicy="no-referrer" />` : ""}
        <span>${escapeHtml(displayName.charAt(0).toUpperCase())}</span>
      </div>
      <div class="relay-message-main">
        ${message.replyTo ? renderReplyLine(message.replyTo) : ""}
        <div class="relay-message-header">
          <strong>${escapeHtml(displayName)}</strong>
          <time datetime="${escapeAttr(toDateTime(message.createdAt))}">${escapeHtml(time)}</time>
          ${message.editedAt ? '<span class="relay-edited">(edited)</span>' : ""}
        </div>
        <div class="relay-message-text">${renderBlockMarkdown(message.text || "")}</div>
        ${reactions.length ? `
          <div class="relay-reaction-summary" aria-label="Message reactions">
            ${reactions.map((reaction) => `
              <button type="button" class="${reaction.hasCurrentUser ? "active" : ""}" data-relay-reaction="${escapeAttr(reaction.id)}" aria-label="${escapeAttr(reaction.label)} reaction, ${reaction.count} total">
                <span>${reaction.emoji}</span><small>${reaction.count}</small>
              </button>
            `).join("")}
          </div>
        ` : ""}
      </div>
      <button class="relay-menu-trigger" type="button" data-relay-menu aria-label="Message options">...</button>
    </article>
  `;
}

function renderReplyLine(replyTo) {
  return `
    <div class="relay-reply-line">
      <span>Replying to</span>
      <strong>${escapeHtml(replyTo.displayName || "Nexus User")}</strong>
      <em>${escapeHtml(trimExcerpt(replyTo.text || ""))}</em>
    </div>
  `;
}

function renderBlockMarkdown(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim().startsWith(">")
      ? `<blockquote>${renderInlineMarkdown(line.replace(/^>\s?/, ""))}</blockquote>`
      : `<p>${renderInlineMarkdown(line)}</p>`)
    .join("");
}

function renderInlineMarkdown(value) {
  let html = escapeHtml(value);
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");
  html = html.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  html = html.replace(/(^|\s)\*([^*]+)\*/g, "$1<em>$2</em>");
  html = html.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  html = html.replace(/^&gt;\s?(.*)$/g, '<span class="relay-markdown-quote">$1</span>');
  return html;
}

function renderPresence() {
  if (!elements.presence) return;
  const signals = getSignals();
  const online = signals.filter((signal) => signal.online);
  const offline = signals.filter((signal) => !signal.online);

  elements.presence.innerHTML = signals.length
    ? `
      ${renderPresenceGroup("Online", online)}
      ${renderPresenceGroup("Offline", offline)}
    `
    : '<div class="relay-empty">No signals detected.</div>';

  renderDmList(signals);
}

function getSignals() {
  const byUid = {};

  Object.entries(state.profiles).forEach(([uid, profile]) => {
    byUid[uid] = {
      uid,
      displayName: profile.displayName || "Nexus User",
      online: false,
      lastSeen: 0
    };
  });

  Object.entries(state.presence).forEach(([uid, signal]) => {
    byUid[uid] = {
      ...byUid[uid],
      ...signal,
      uid,
      displayName: signal.displayName || byUid[uid]?.displayName || "Nexus User"
    };
  });

  return Object.values(byUid)
    .sort((a, b) => Number(b.online) - Number(a.online) || String(a.displayName || "").localeCompare(String(b.displayName || "")));
}

function renderPresenceGroup(label, signals) {
  return `
    <section class="relay-presence-group">
      <h3>${escapeHtml(label)} <span>${signals.length}</span></h3>
      ${signals.length ? signals.map((signal) => `
        <article class="relay-presence-row${signal.online ? " online" : ""}">
          <span aria-hidden="true"></span>
          <div>
            <strong>${escapeHtml(signal.displayName || "Nexus User")}</strong>
            <small>${signal.online ? "Online" : `Last seen ${formatPresenceTime(signal.lastSeen)}`}</small>
          </div>
          ${signal.uid !== state.currentUser?.uid ? `<button type="button" data-open-dm="${escapeAttr(signal.uid)}" aria-label="Message ${escapeAttr(signal.displayName || "Nexus User")}">DM</button>` : ""}
        </article>
      `).join("") : '<div class="relay-empty small">No signals.</div>'}
    </section>
  `;
}

function renderDmList(signals = getSignals()) {
  if (!elements.dmList) return;
  const users = signals.filter((signal) => signal.uid !== state.currentUser?.uid);
  elements.dmList.innerHTML = `
    <div class="relay-dm-heading">
      <span>// Direct Signals</span>
      <small>${users.length}</small>
    </div>
    ${users.length ? users.map((signal) => `
      <button class="${signal.uid === state.activeRecipientUid ? "active" : ""}" type="button" data-open-dm="${escapeAttr(signal.uid)}">
        <span class="${signal.online ? "online" : ""}" aria-hidden="true"></span>
        <strong>${escapeHtml(signal.displayName || "Nexus User")}</strong>
        <small>${signal.online ? "Online" : `Last ${formatPresenceTime(signal.lastSeen)}`}</small>
      </button>
    `).join("") : '<div class="relay-empty small">No direct signals yet.</div>'}
  `;
}

function renderChannelUi() {
  document.querySelectorAll("[data-relay-mode]").forEach((button) => {
    button.classList.toggle("active", button.dataset.relayMode === state.mode);
  });
  elements.dmList?.classList.toggle("d-none", state.mode !== "dm");

  if (state.mode === "dm") {
    const name = state.activeRecipientUid ? getProfileDisplayName(state.activeRecipientUid) : "Choose Signal";
    if (elements.channelTitle) elements.channelTitle.textContent = state.activeRecipientUid ? `Direct / ${name}` : "Direct Signals";
    if (elements.channelMeta) {
      elements.channelMeta.textContent = state.activeRecipientUid
        ? "Private transmission visible only to this two-person signal."
        : "Choose a Nexus member on the left to open a private transmission.";
    }
  } else {
    if (elements.channelTitle) elements.channelTitle.textContent = "Global Transmission";
    if (elements.channelMeta) elements.channelMeta.textContent = "Everyone signed into the Nexus can read this channel.";
  }

  renderDmList();
}

function aggregateReactions(messageId) {
  const source = state.reactions[messageId] || {};
  return REACTION_OPTIONS.map((reaction) => {
    const users = source[reaction.id] || {};
    const count = Object.keys(users).length;
    return {
      ...reaction,
      count,
      hasCurrentUser: !!users[state.currentUser?.uid]
    };
  }).filter((reaction) => reaction.count > 0);
}

function bindStreams() {
  unsubscribePresence?.();
  unsubscribeProfiles?.();

  bindMessageStreams();

  unsubscribePresence = onValue(ref(database, "presence"), (snapshot) => {
    state.presence = snapshot.val() || {};
    renderPresence();
    renderChannelUi();
  });

  unsubscribeProfiles = onValue(ref(database, "publicProfiles"), (snapshot) => {
    state.profiles = snapshot.val() || {};
    renderPresence();
    renderChannelUi();
  });
}

function bindMessageStreams() {
  unsubscribeMessages?.();
  unsubscribeReactions?.();
  unsubscribeMessages = null;
  unsubscribeReactions = null;
  state.messages = [];
  state.reactions = {};

  if (state.mode === "dm" && !state.activeThreadId) {
    renderMessages();
    renderChannelUi();
    return;
  }

  unsubscribeMessages = onValue(query(ref(database, getMessageBasePath()), limitToLast(150)), (snapshot) => {
    const raw = snapshot.val() || {};
    state.messages = Object.entries(raw)
      .map(([id, message]) => ({ id, ...message }))
      .sort((a, b) => Number(a.createdAt || 0) - Number(b.createdAt || 0));
    renderMessages();
  });

  unsubscribeReactions = onValue(ref(database, getReactionBasePath()), (snapshot) => {
    state.reactions = snapshot.val() || {};
    renderMessages();
  });

  renderChannelUi();
}

async function openDirectMessage(uid) {
  if (!state.currentUser || !uid || uid === state.currentUser.uid) return;
  const threadId = getDmThreadId(state.currentUser.uid, uid);
  const now = Date.now();
  const participantNames = {
    [state.currentUser.uid]: displayNameFor(state.currentUser),
    [uid]: getProfileDisplayName(uid)
  };

  await update(ref(database, `relayThreads/${threadId}`), {
    id: threadId,
    type: "dm",
    participants: {
      [state.currentUser.uid]: true,
      [uid]: true
    },
    participantNames,
    updatedAt: now,
    createdAt: now
  });

  state.mode = "dm";
  state.activeThreadId = threadId;
  state.activeRecipientUid = uid;
  clearComposerState();
  bindMessageStreams();
  setStatus(`Direct signal open with ${participantNames[uid]}.`, "success");
}

function switchRelayMode(mode) {
  if (!state.currentUser) return;
  if (mode === "global") {
    state.mode = "global";
    state.activeThreadId = "";
    state.activeRecipientUid = "";
    clearComposerState();
    bindMessageStreams();
    setStatus("Global relay open.", "success");
    return;
  }

  state.mode = "dm";
  clearComposerState();
  bindMessageStreams();
  setStatus("Choose a member to open a direct signal.", "info");
}

async function submitMessage(event) {
  event.preventDefault();
  if (!state.currentUser) return;
  if (state.mode === "dm" && !state.activeThreadId) {
    setStatus("Choose a direct signal before transmitting.", "error");
    return;
  }
  touchPresence(true);

  const text = elements.input.value.trim().slice(0, 2000);
  if (!text) return;

  elements.send.disabled = true;
  elements.send.textContent = state.editingMessageId ? "Saving..." : "Transmitting...";

  if (state.editingMessageId) {
    await update(ref(database, `${getMessageBasePath()}/${state.editingMessageId}`), {
      text,
      editedAt: Date.now()
    });
    clearComposerState();
    setStatus("Transmission edited.", "success");
  } else {
    const payload = {
      uid: state.currentUser.uid,
      displayName: displayNameFor(state.currentUser),
      text,
      createdAt: Date.now()
    };
    if (state.replyTo) payload.replyTo = state.replyTo;
    await set(push(ref(database, getMessageBasePath())), payload);
    if (state.mode === "dm" && state.activeThreadId) {
      await update(ref(database, `relayThreads/${state.activeThreadId}`), {
        updatedAt: Date.now(),
        lastMessage: trimExcerpt(text, 140),
        lastSenderUid: state.currentUser.uid,
        participantNames: {
          [state.currentUser.uid]: displayNameFor(state.currentUser),
          [state.activeRecipientUid]: getProfileDisplayName(state.activeRecipientUid)
        }
      }).catch(() => {});
    }
    clearComposerState();
    setStatus("Delivered.", "success");
  }

  elements.send.disabled = false;
  elements.send.textContent = "Transmit";
}

function clearComposerState() {
  elements.input.value = "";
  state.replyTo = null;
  state.editingMessageId = "";
  renderReplyPreview();
  elements.send.textContent = "Transmit";
}

function renderReplyPreview() {
  if (!elements.replyPreview) return;

  if (!state.replyTo && !state.editingMessageId) {
    elements.replyPreview.classList.add("d-none");
    elements.replyPreview.innerHTML = "";
    return;
  }

  const editing = state.editingMessageId
    ? state.messages.find((message) => message.id === state.editingMessageId)
    : null;
  const source = editing || state.replyTo;
  elements.replyPreview.classList.remove("d-none");
  elements.replyPreview.innerHTML = `
    <div>
      <span>${editing ? "Editing transmission" : "Replying to"}</span>
      <strong>${escapeHtml(source?.displayName || "Nexus User")}</strong>
      <p>${escapeHtml(trimExcerpt(source?.text || ""))}</p>
    </div>
    <button type="button" data-relay-cancel-context aria-label="Cancel ${editing ? "edit" : "reply"}">Cancel</button>
  `;
}

function getRelayContextMenu() {
  let menu = document.getElementById("relayContextMenu");
  if (menu) return menu;

  menu = document.createElement("div");
  menu.id = "relayContextMenu";
  menu.className = "relay-context-menu";
  menu.hidden = true;
  document.body.appendChild(menu);
  return menu;
}

function openRelayMenu(message, x, y) {
  if (!message || !state.currentUser) return;
  const menu = getRelayContextMenu();
  const isOwn = message.uid === state.currentUser.uid;
  menu.dataset.messageId = message.id;
  menu.innerHTML = `
    <div class="relay-context-reactions">
      ${REACTION_OPTIONS.map((reaction) => `
        <button type="button" data-relay-menu-reaction="${escapeAttr(reaction.id)}" aria-label="React with ${escapeAttr(reaction.label)}">${reaction.emoji}</button>
      `).join("")}
    </div>
    <button type="button" data-relay-menu-action="reply">Reply</button>
    ${isOwn ? '<button type="button" data-relay-menu-action="edit">Edit Message</button>' : ""}
    <button type="button" data-relay-menu-action="copy">Copy Text</button>
    ${isOwn ? '<button type="button" class="danger" data-relay-menu-action="delete">Delete Message</button>' : ""}
  `;
  menu.hidden = false;
  const width = menu.offsetWidth || 240;
  const height = menu.offsetHeight || 260;
  menu.style.left = `${Math.min(x, window.innerWidth - width - 12)}px`;
  menu.style.top = `${Math.min(y, window.innerHeight - height - 12)}px`;
}

function closeRelayMenu() {
  const menu = document.getElementById("relayContextMenu");
  if (!menu) return;
  menu.hidden = true;
  menu.dataset.messageId = "";
}

function actionMessage(message, action) {
  if (!message || !state.currentUser) return;

  if (action === "reply") {
    state.replyTo = {
      id: message.id,
      displayName: message.displayName || "Nexus User",
      text: trimExcerpt(message.text || "", 180)
    };
    state.editingMessageId = "";
    elements.input.focus();
    renderReplyPreview();
    return;
  }

  if (action === "edit" && message.uid === state.currentUser.uid) {
    state.editingMessageId = message.id;
    state.replyTo = null;
    elements.input.value = message.text || "";
    elements.input.focus();
    elements.send.textContent = "Save Edit";
    renderReplyPreview();
    return;
  }

  if (action === "delete" && message.uid === state.currentUser.uid) {
    deleteMessage(message.id).catch((error) => setStatus(error.message || "Delete failed.", "error"));
    return;
  }

  if (action === "copy") {
    navigator.clipboard?.writeText(message.text || "")
      .then(() => setStatus("Transmission copied.", "success"))
      .catch(() => setStatus("Clipboard copy was blocked by the browser.", "error"));
  }
}

function handleMessageAction(event) {
  const menuButton = event.target.closest("[data-relay-menu]");
  if (menuButton) {
    event.preventDefault();
    event.stopPropagation();
    const row = menuButton.closest("[data-message-id]");
    const message = state.messages.find((item) => item.id === row?.dataset.messageId);
    const rect = menuButton.getBoundingClientRect();
    openRelayMenu(message, rect.right - 240, rect.bottom + 8);
    return;
  }

  const button = event.target.closest("[data-relay-action], [data-relay-reaction]");
  if (!button || !state.currentUser) return;

  const row = button.closest("[data-message-id]");
  const message = state.messages.find((item) => item.id === row?.dataset.messageId);
  if (!message) return;

  if (button.dataset.relayReaction) {
    toggleReaction(message.id, button.dataset.relayReaction).catch((error) => setStatus(error.message || "Reaction failed.", "error"));
    return;
  }

  actionMessage(message, button.dataset.relayAction);
}

async function deleteMessage(messageId) {
  if (!await confirmRelay("Delete this transmission?", "Delete Message")) return;
  await remove(ref(database, `${getReactionBasePath()}/${messageId}`)).catch(() => {});
  await remove(ref(database, `${getMessageBasePath()}/${messageId}`));
  if (state.editingMessageId === messageId) clearComposerState();
  setStatus("Transmission deleted.", "success");
}

function confirmRelay(message, title = "Confirm Action") {
  return new Promise((resolve) => {
    let dialog = document.getElementById("relayConfirmDialog");
    if (!dialog) {
      dialog = document.createElement("dialog");
      dialog.id = "relayConfirmDialog";
      dialog.className = "relay-confirm-dialog";
      document.body.appendChild(dialog);
    }

    dialog.innerHTML = `
      <form method="dialog">
        <div>
          <p class="banri-modal-kicker">Relay Confirmation</p>
          <h2>${escapeHtml(title)}</h2>
          <p>${escapeHtml(message)}</p>
        </div>
        <footer>
          <button class="button" value="cancel">Cancel</button>
          <button class="button button--danger" type="button" data-relay-confirm-accept>Delete</button>
        </footer>
      </form>
    `;

    const accept = dialog.querySelector("[data-relay-confirm-accept]");
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

async function toggleReaction(messageId, reactionId) {
  const reaction = REACTION_OPTIONS.find((item) => item.id === reactionId);
  if (!reaction || !state.currentUser) return;

  const path = `${getReactionBasePath()}/${messageId}/${reaction.id}/${state.currentUser.uid}`;
  const hasReaction = !!state.reactions?.[messageId]?.[reaction.id]?.[state.currentUser.uid];
  if (hasReaction) {
    await remove(ref(database, path));
    return;
  }

  await set(ref(database, path), {
    emoji: reaction.emoji,
    displayName: displayNameFor(state.currentUser),
    createdAt: Date.now()
  });
}

function insertAtCursor(textBefore, textAfter = "") {
  const input = elements.input;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const selected = input.value.slice(start, end);
  input.value = `${input.value.slice(0, start)}${textBefore}${selected}${textAfter}${input.value.slice(end)}`;
  const cursor = start + textBefore.length + selected.length;
  input.focus();
  input.setSelectionRange(cursor, cursor);
}

function applyMarkdown(kind) {
  const input = elements.input;
  const start = input.selectionStart;
  const end = input.selectionEnd;
  const selected = input.value.slice(start, end);

  if (kind === "bold") insertAtCursor("**", "**");
  if (kind === "italic") insertAtCursor("*", "*");
  if (kind === "code") insertAtCursor("`", "`");
  if (kind === "quote") {
    const replacement = (selected || "quote").split("\n").map((line) => `> ${line}`).join("\n");
    input.value = `${input.value.slice(0, start)}${replacement}${input.value.slice(end)}`;
    input.focus();
    input.setSelectionRange(start + replacement.length, start + replacement.length);
  }
  if (kind === "link") {
    const label = selected || "link";
    const replacement = `[${label}](https://)`;
    input.value = `${input.value.slice(0, start)}${replacement}${input.value.slice(end)}`;
    input.focus();
    const urlStart = start + replacement.length - 9;
    input.setSelectionRange(urlStart, urlStart + 8);
  }
}

function renderEmojiPanel() {
  if (!elements.emojiPanel) return;
  elements.emojiPanel.innerHTML = EMOJI_OPTIONS
    .map((emoji) => `<button type="button" data-relay-emoji="${escapeAttr(emoji)}" aria-label="Insert ${escapeAttr(emoji)}">${emoji}</button>`)
    .join("");
}

function bindComposerTools() {
  renderEmojiPanel();

  elements.form?.addEventListener("click", (event) => {
    const markdownButton = event.target.closest("[data-relay-markdown]");
    const emojiToggle = event.target.closest("[data-relay-emoji-toggle]");
    const emojiButton = event.target.closest("[data-relay-emoji]");
    const cancelContext = event.target.closest("[data-relay-cancel-context]");

    if (markdownButton) applyMarkdown(markdownButton.dataset.relayMarkdown);
    if (emojiToggle) {
      const nextState = elements.emojiPanel.classList.contains("d-none");
      elements.emojiPanel.classList.toggle("d-none", !nextState);
      emojiToggle.setAttribute("aria-expanded", String(nextState));
    }
    if (emojiButton) insertAtCursor(emojiButton.dataset.relayEmoji);
    if (cancelContext) clearComposerState();
  });

  elements.replyPreview?.addEventListener("click", (event) => {
    if (event.target.closest("[data-relay-cancel-context]")) clearComposerState();
  });

  elements.input?.addEventListener("keydown", (event) => {
    touchPresence();
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      elements.form?.requestSubmit();
    }
    if (event.key === "Escape" && (state.replyTo || state.editingMessageId)) {
      clearComposerState();
    }
  });
}

function showLocked() {
  const priorUser = state.currentUser;
  state.currentUser = null;
  state.mode = "global";
  state.activeThreadId = "";
  state.activeRecipientUid = "";
  state.messages = [];
  state.reactions = {};
  markOffline(priorUser);
  elements.locked?.classList.remove("d-none");
  elements.console?.classList.add("d-none");
  unsubscribeMessages?.();
  unsubscribeReactions?.();
  unsubscribePresence?.();
  unsubscribeProfiles?.();
}

async function showRelay(user) {
  state.currentUser = user;
  state.mode = "global";
  state.activeThreadId = "";
  state.activeRecipientUid = "";
  elements.locked?.classList.add("d-none");
  elements.console?.classList.remove("d-none");
  await setPresence(user);
  touchPresence(true);
  bindStreams();
  renderChannelUi();
  setStatus("Relay connected.", "success");
}

function formatChatTime(value) {
  if (!value) return "now";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "now";
  return new Intl.DateTimeFormat("en-US", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function formatPresenceTime(value) {
  if (!value) return "unknown";
  const date = new Date(Number(value));
  if (Number.isNaN(date.getTime())) return "unknown";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function toDateTime(value) {
  const date = new Date(Number(value));
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

function trimExcerpt(value, limit = 88) {
  const text = String(value || "").replace(/\s+/g, " ").trim();
  return text.length > limit ? `${text.slice(0, limit - 1)}...` : text;
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

elements.form?.addEventListener("submit", (event) => {
  submitMessage(event)
    .catch((error) => setStatus(error.message || "Transmission failed.", "error"))
    .finally(() => {
      if (elements.send) {
        elements.send.disabled = false;
        elements.send.textContent = state.editingMessageId ? "Save Edit" : "Transmit";
      }
    });
});
elements.console?.addEventListener("click", (event) => {
  const modeButton = event.target.closest("[data-relay-mode]");
  const dmButton = event.target.closest("[data-open-dm]");

  if (modeButton) {
    switchRelayMode(modeButton.dataset.relayMode);
    return;
  }

  if (dmButton) {
    openDirectMessage(dmButton.dataset.openDm)
      .catch((error) => setStatus(error.message || "Direct signal failed.", "error"));
  }
});
elements.messages?.addEventListener("click", handleMessageAction);
elements.messages?.addEventListener("contextmenu", (event) => {
  const row = event.target.closest("[data-message-id]");
  if (!row) return;
  const message = state.messages.find((item) => item.id === row.dataset.messageId);
  if (!message) return;
  event.preventDefault();
  openRelayMenu(message, event.clientX, event.clientY);
});
document.addEventListener("click", (event) => {
  const menu = document.getElementById("relayContextMenu");
  const reactionButton = event.target.closest("[data-relay-menu-reaction]");
  const actionButton = event.target.closest("[data-relay-menu-action]");

  if (reactionButton || actionButton) {
    const message = state.messages.find((item) => item.id === menu?.dataset.messageId);
    if (reactionButton && message) {
      toggleReaction(message.id, reactionButton.dataset.relayMenuReaction).catch((error) => setStatus(error.message || "Reaction failed.", "error"));
    }
    if (actionButton && message) {
      actionMessage(message, actionButton.dataset.relayMenuAction);
    }
    closeRelayMenu();
    return;
  }

  if (menu && !menu.hidden && !menu.contains(event.target) && !event.target.closest("[data-relay-menu]")) {
    closeRelayMenu();
  }
});
["pointerdown", "mousemove", "focus", "visibilitychange"].forEach((eventName) => {
  document.addEventListener(eventName, () => {
    if (eventName === "visibilitychange" && document.hidden) return;
    touchPresence();
  });
});
bindComposerTools();

window.addEventListener("resize", () => {
  window.clearTimeout(resizeTimer);
  resizeTimer = window.setTimeout(renderMessages, 120);
});

onAuthStateChanged(auth, (user) => {
  if (!user) {
    showLocked();
    return;
  }

  showRelay(user).catch((error) => {
    showLocked();
    setStatus(error.message || "Relay connection failed.", "error");
  });
});
