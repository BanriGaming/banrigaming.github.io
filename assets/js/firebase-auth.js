import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  get,
  getDatabase,
  onDisconnect,
  onValue,
  ref,
  set,
  update
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { isAdminUid, readFileAsDataUrl } from "./site-store.js";

(function () {
  const REGISTER_CIPHER_KEY = "NVX-7Q-26-CIPHER";
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const database = getDatabase(app);

  let currentUser = null;
  let presenceUnsubscribe = null;
  let presenceRef = null;
  let presenceTouchAt = 0;

  function getElements() {
    return {
      navButton: document.getElementById("banriAuthNavButton"),
      adminNode: document.getElementById("banriAdminNode"),
      membersNode: document.getElementById("banriMembersNode"),
      worldsNode: document.getElementById("banriWorldsNode"),
      worldsNodeSubtext: document.getElementById("banriWorldsNodeSubtext"),
      chroniclesNode: document.getElementById("banriChroniclesNode"),
      relayNode: document.getElementById("banriRelayNode"),
      signedOut: document.getElementById("banriAuthSignedOut"),
      registerGate: document.getElementById("banriAuthRegisterGate"),
      registerForm: document.getElementById("banriAuthRegisterForm"),
      profile: document.getElementById("banriAuthProfile"),
      email: document.getElementById("banriLoginEmail"),
      password: document.getElementById("banriLoginPassword"),
      registerCode: document.getElementById("banriRegisterCode"),
      registerDisplayName: document.getElementById("banriRegisterDisplayName"),
      registerEmail: document.getElementById("banriRegisterEmail"),
      registerPassword: document.getElementById("banriRegisterPassword"),
      signIn: document.getElementById("banriSignInButton"),
      create: document.getElementById("banriCreateAccountButton"),
      unlockRegister: document.getElementById("banriUnlockRegisterButton"),
      backToLogin: document.getElementById("banriBackToLoginButton"),
      submitRegister: document.getElementById("banriSubmitRegisterButton"),
      cancelRegister: document.getElementById("banriCancelRegisterButton"),
      profileInitial: document.getElementById("banriProfileInitial"),
      profileName: document.getElementById("banriProfileName"),
      profileEmail: document.getElementById("banriProfileEmail"),
      profileDisplayName: document.getElementById("banriProfileDisplayName"),
      profileBio: document.getElementById("banriProfileBio"),
      profileStatus: document.getElementById("banriProfileStatus"),
      profileAvatarUrl: document.getElementById("banriProfileAvatarUrl"),
      profileAvatarFile: document.getElementById("banriProfileAvatarFile"),
      profileFavoriteGames: document.getElementById("banriProfileFavoriteGames"),
      profileYoutube: document.getElementById("banriProfileYoutube"),
      profileTwitch: document.getElementById("banriProfileTwitch"),
      profileSteam: document.getElementById("banriProfileSteam"),
      profileDiscord: document.getElementById("banriProfileDiscord"),
      profileWebsite: document.getElementById("banriProfileWebsite"),
      privacyAvatar: document.getElementById("banriPrivacyAvatar"),
      privacyBio: document.getElementById("banriPrivacyBio"),
      privacyStatus: document.getElementById("banriPrivacyStatus"),
      privacyFavorites: document.getElementById("banriPrivacyFavorites"),
      privacyPlatforms: document.getElementById("banriPrivacyPlatforms"),
      save: document.getElementById("banriSaveProfileButton"),
      signOut: document.getElementById("banriSignOutButton"),
      status: document.getElementById("banriAuthStatus")
    };
  }

  function setStatus(message, tone = "info") {
    const { status } = getElements();
    if (!status) return;
    status.textContent = message || "";
    status.dataset.tone = tone;
  }

  function setBusy(isBusy) {
    const { signIn, create, unlockRegister, backToLogin, submitRegister, cancelRegister, save, signOut: signOutButton } = getElements();
    [signIn, create, unlockRegister, backToLogin, submitRegister, cancelRegister, save, signOutButton].forEach((button) => {
      if (button) button.disabled = isBusy;
    });
  }

  function setAuthView(view) {
    const elements = getElements();
    elements.signedOut?.classList.toggle("d-none", view !== "login");
    elements.registerGate?.classList.toggle("d-none", view !== "gate");
    elements.registerForm?.classList.toggle("d-none", view !== "register");
    elements.profile?.classList.toggle("d-none", view !== "profile");
    const title = document.getElementById("banriLoginTitle");
    if (title) {
      title.textContent = view === "profile"
        ? "Nexus Profile"
        : view === "gate"
          ? "Cipher Gate"
          : view === "register"
            ? "Nexus Register"
            : "Nexus Login";
    }
  }

  function hideLoginModal() {
    const modal = document.getElementById("banriLoginModal");
    if (!modal || !window.bootstrap) return;
    window.bootstrap.Modal.getInstance(modal)?.hide();
  }

  function showLoginModal() {
    const modal = document.getElementById("banriLoginModal");
    if (!modal || !window.bootstrap) return;
    window.bootstrap.Modal.getOrCreateInstance(modal).show();
  }

  function renderWorldsAccess(isSignedIn) {
    const elements = getElements();
    elements.worldsNode?.classList.toggle("nexus-auth-locked", !isSignedIn);
    elements.worldsNode?.setAttribute("aria-disabled", isSignedIn ? "false" : "true");
    if (elements.worldsNodeSubtext) {
      elements.worldsNodeSubtext.textContent = isSignedIn ? "Hosted game servers" : "Login to Access";
    }
  }

  function normalizeCipherKey(value) {
    return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
  }

  function cleanDisplayName(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 32);
  }

  function cleanBio(value) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, 160);
  }

  function cleanText(value, maxLength = 160) {
    return String(value || "").trim().replace(/\s+/g, " ").slice(0, maxLength);
  }

  function cleanUrl(value) {
    const url = String(value || "").trim().slice(0, 500);
    return /^https?:\/\//i.test(url) ? url : "";
  }

  function cleanAvatarSource(value) {
    const source = String(value || "").trim();
    if (/^https?:\/\//i.test(source)) return source.slice(0, 500);
    if (/^data:image\/(?:webp|gif|png|jpeg);base64,/i.test(source) && source.length <= 1300000) return source;
    return "";
  }

  function isRemoteImageUrl(value) {
    return /^https?:\/\//i.test(String(value || "").trim());
  }

  function isDatabaseImage(value) {
    return /^data:image\/(?:webp|gif|png|jpeg);base64,/i.test(String(value || "").trim());
  }

  function readPlatforms(elements) {
    return {
      youtube: cleanUrl(elements.profileYoutube?.value),
      twitch: cleanUrl(elements.profileTwitch?.value),
      steam: cleanUrl(elements.profileSteam?.value),
      discord: cleanText(elements.profileDiscord?.value, 80),
      website: cleanUrl(elements.profileWebsite?.value)
    };
  }

  function readPrivacy(elements) {
    return {
      showAvatar: elements.privacyAvatar?.checked !== false,
      showBio: elements.privacyBio?.checked !== false,
      showStatus: elements.privacyStatus?.checked !== false,
      showFavorites: elements.privacyFavorites?.checked !== false,
      showPlatforms: elements.privacyPlatforms?.checked !== false
    };
  }

  function getInitial(name, email) {
    const source = cleanDisplayName(name) || String(email || "B");
    return source.charAt(0).toUpperCase();
  }

  function friendlyError(error) {
    const code = error?.code || "";
    const messages = {
      "auth/email-already-in-use": "That email already has a Nexus account.",
      "auth/invalid-email": "That email does not look valid.",
      "auth/invalid-credential": "Email or password did not match.",
      "auth/missing-password": "Password is required.",
      "auth/weak-password": "Use at least 6 characters for the password.",
      "auth/network-request-failed": "Firebase could not be reached from this browser."
    };

    return messages[code] || error?.message || "Firebase auth could not complete that request.";
  }

  async function uploadAvatarIfNeeded(user, file) {
    if (!file) return "";
    const allowedTypes = new Set(["image/webp", "image/gif", "image/png", "image/jpeg"]);
    if (!allowedTypes.has(file.type)) {
      throw new Error("Avatar must be WebP, GIF, PNG, or JPEG.");
    }
    if (file.size > 900 * 1024) {
      throw new Error("Avatar must be 900 KB or smaller when stored in Realtime Database.");
    }
    return readFileAsDataUrl(file);
  }

  function buildPublicProfile(profile) {
    const privacy = {
      showAvatar: profile.privacy?.showAvatar !== false,
      showBio: profile.privacy?.showBio !== false,
      showStatus: profile.privacy?.showStatus !== false,
      showFavorites: profile.privacy?.showFavorites !== false,
      showPlatforms: profile.privacy?.showPlatforms !== false
    };

    return {
      uid: profile.uid,
      displayName: profile.displayName,
      bio: privacy.showBio ? profile.bio || "" : "",
      status: privacy.showStatus ? profile.status || "" : "",
      favoriteGames: privacy.showFavorites ? profile.favoriteGames || "" : "",
      platforms: privacy.showPlatforms ? profile.platforms || {} : {},
      photoURL: privacy.showAvatar ? profile.photoURL || null : null,
      privacy,
      updatedAt: profile.updatedAt
    };
  }

  async function writeProfile(user, profileData = {}) {
    const displayName = cleanDisplayName(profileData.displayName || user.displayName || user.email?.split("@")[0] || "Nexus User");
    const privateRef = ref(database, `profiles/${user.uid}`);
    const publicRef = ref(database, `publicProfiles/${user.uid}`);
    const snapshot = await get(privateRef);
    const existing = snapshot.exists() ? snapshot.val() : {};
    const now = Date.now();
    const profile = {
      uid: user.uid,
      email: user.email || "",
      displayName,
      displayNameLower: displayName.toLowerCase(),
      bio: cleanBio(profileData.bio ?? existing.bio),
      status: cleanText(profileData.status ?? existing.status, 120),
      favoriteGames: cleanText(profileData.favoriteGames ?? existing.favoriteGames, 300),
      platforms: profileData.platforms || existing.platforms || {},
      privacy: {
        showAvatar: profileData.privacy?.showAvatar ?? existing.privacy?.showAvatar ?? true,
        showBio: profileData.privacy?.showBio ?? existing.privacy?.showBio ?? true,
        showStatus: profileData.privacy?.showStatus ?? existing.privacy?.showStatus ?? true,
        showFavorites: profileData.privacy?.showFavorites ?? existing.privacy?.showFavorites ?? true,
        showPlatforms: profileData.privacy?.showPlatforms ?? existing.privacy?.showPlatforms ?? true
      },
      photoURL: profileData.photoURL ?? existing.photoURL ?? user.photoURL ?? null,
      createdAt: existing.createdAt || now,
      updatedAt: now
    };

    await set(privateRef, profile);
    await set(publicRef, buildPublicProfile(profile));
  }

  async function loadProfile(user) {
    const privateRef = ref(database, `profiles/${user.uid}`);
    const snapshot = await get(privateRef);
    const data = snapshot.exists() ? snapshot.val() : {};

    if (!snapshot.exists()) {
      await writeProfile(user, {
        displayName: user.displayName || user.email?.split("@")[0] || "Nexus User",
        bio: ""
      });
    }

    return data;
  }

  function renderSignedOut() {
    const elements = getElements();
    clearPresence();
    currentUser = null;

    setAuthView("login");
    elements.adminNode?.classList.add("d-none");
    elements.adminNode?.setAttribute("aria-hidden", "true");
    elements.membersNode?.classList.remove("d-none");
    elements.membersNode?.setAttribute("aria-hidden", "false");
    elements.chroniclesNode?.classList.add("d-none");
    elements.chroniclesNode?.setAttribute("aria-hidden", "true");
    elements.relayNode?.classList.add("d-none");
    elements.relayNode?.setAttribute("aria-hidden", "true");
    renderWorldsAccess(false);
    if (elements.navButton) elements.navButton.textContent = "Login";
    if (elements.password) elements.password.value = "";
    if (elements.registerPassword) elements.registerPassword.value = "";
    setStatus("");
  }

  async function updateAdminVisibility(user) {
    const { adminNode } = getElements();
    if (!adminNode) return;

    const isAdmin = await isAdminUid(user?.uid);
    adminNode.classList.toggle("d-none", !isAdmin);
    adminNode.setAttribute("aria-hidden", isAdmin ? "false" : "true");
    window.dispatchEvent(new CustomEvent("banri:admin-state", {
      detail: {
        uid: user?.uid || "",
        isAdmin
      }
    }));
  }

  function presencePayload(user, isOnline) {
    return {
      uid: user.uid,
      displayName: cleanDisplayName(user.displayName || user.email?.split("@")[0] || "Nexus User"),
      online: isOnline,
      lastSeen: Date.now()
    };
  }

  function clearPresence() {
    if (presenceUnsubscribe) presenceUnsubscribe();
    presenceUnsubscribe = null;
    if (presenceRef && currentUser) {
      onDisconnect(presenceRef).cancel().catch(() => {});
      set(presenceRef, presencePayload(currentUser, false)).catch(() => {});
    }
    presenceRef = null;
  }

  function startPresence(user) {
    if (!user) return;
    if (presenceUnsubscribe) presenceUnsubscribe();

    presenceRef = ref(database, `presence/${user.uid}`);
    const connectedRef = ref(database, ".info/connected");
    presenceUnsubscribe = onValue(connectedRef, (snapshot) => {
      if (snapshot.val() !== true) return;
      onDisconnect(presenceRef).set(presencePayload(user, false)).then(() => {
        set(presenceRef, presencePayload(user, true)).catch(() => {});
      }).catch(() => {});
    });
  }

  function touchPresence(force = false) {
    if (!currentUser || !presenceRef) return;
    const now = Date.now();
    if (!force && now - presenceTouchAt < 8000) return;
    presenceTouchAt = now;
    set(presenceRef, presencePayload(currentUser, true)).catch(() => {});
  }

  async function renderSignedIn(user) {
    const elements = getElements();
    currentUser = user;
    startPresence(user);
    touchPresence(true);
    setAuthView("profile");
    elements.membersNode?.classList.remove("d-none");
    elements.membersNode?.setAttribute("aria-hidden", "false");
    elements.chroniclesNode?.classList.remove("d-none");
    elements.chroniclesNode?.setAttribute("aria-hidden", "false");
    elements.relayNode?.classList.remove("d-none");
    elements.relayNode?.setAttribute("aria-hidden", "false");
    renderWorldsAccess(true);
    if (elements.navButton) elements.navButton.textContent = "Profile";

    try {
      const data = await loadProfile(user);
      const displayName = cleanDisplayName(data.displayName || user.displayName || user.email?.split("@")[0] || "Nexus User");
      const bio = cleanBio(data.bio);
      const privacy = data.privacy || {};

      if (elements.profileInitial) elements.profileInitial.textContent = getInitial(displayName, user.email);
      if (elements.profileName) elements.profileName.textContent = displayName;
      if (elements.profileEmail) elements.profileEmail.textContent = user.email || "Signed in";
      if (elements.profileDisplayName) elements.profileDisplayName.value = displayName;
      if (elements.profileBio) elements.profileBio.value = bio;
      if (elements.profileStatus) elements.profileStatus.value = cleanText(data.status, 120);
      if (elements.profileAvatarUrl) {
        elements.profileAvatarUrl.value = isRemoteImageUrl(data.photoURL) ? data.photoURL : "";
        elements.profileAvatarUrl.placeholder = isDatabaseImage(data.photoURL) ? "Uploaded avatar saved in database." : "https://...";
      }
      if (elements.profileAvatarFile) elements.profileAvatarFile.value = "";
      if (elements.profileFavoriteGames) elements.profileFavoriteGames.value = cleanText(data.favoriteGames, 300);
      if (elements.profileYoutube) elements.profileYoutube.value = data.platforms?.youtube || "";
      if (elements.profileTwitch) elements.profileTwitch.value = data.platforms?.twitch || "";
      if (elements.profileSteam) elements.profileSteam.value = data.platforms?.steam || "";
      if (elements.profileDiscord) elements.profileDiscord.value = data.platforms?.discord || "";
      if (elements.profileWebsite) elements.profileWebsite.value = data.platforms?.website || "";
      if (elements.privacyAvatar) elements.privacyAvatar.checked = privacy.showAvatar !== false;
      if (elements.privacyBio) elements.privacyBio.checked = privacy.showBio !== false;
      if (elements.privacyStatus) elements.privacyStatus.checked = privacy.showStatus !== false;
      if (elements.privacyFavorites) elements.privacyFavorites.checked = privacy.showFavorites !== false;
      if (elements.privacyPlatforms) elements.privacyPlatforms.checked = privacy.showPlatforms !== false;
      await updateAdminVisibility(user);
      await set(ref(database, `presence/${user.uid}`), presencePayload({ uid: user.uid, email: user.email, displayName }, true)).catch(() => {});
      setStatus("Profile synced with Firebase.", "success");
    } catch (error) {
      setStatus(friendlyError(error), "error");
    }
  }

  async function handleSignIn() {
    const { email, password } = getElements();
    setBusy(true);
    setStatus("Opening Nexus channel...");

    try {
      await signInWithEmailAndPassword(auth, email.value.trim(), password.value);
      setStatus("Signed in.", "success");
      hideLoginModal();
    } catch (error) {
      setStatus(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleCreateAccount() {
    const { registerDisplayName, registerEmail, registerPassword } = getElements();
    const name = cleanDisplayName(registerDisplayName.value);
    const email = registerEmail.value.trim();
    const password = registerPassword.value;
    if (!name) {
      setStatus("Display name is required to register.", "error");
      return;
    }
    setBusy(true);
    setStatus("Creating Nexus profile...");

    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      await writeProfile(credential.user, { displayName: name, bio: "" });
      setStatus("Account created and profile synced.", "success");
      hideLoginModal();
    } catch (error) {
      setStatus(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSaveProfile() {
    const elements = getElements();
    const { profileDisplayName, profileBio } = elements;
    if (!currentUser) return;

    const displayName = cleanDisplayName(profileDisplayName.value);
    const bio = cleanBio(profileBio.value);
    if (!displayName) {
      setStatus("Display name is required.", "error");
      return;
    }

    setBusy(true);
    setStatus("Saving profile...");

    try {
      const existingSnapshot = await get(ref(database, `profiles/${currentUser.uid}`)).catch(() => null);
      const existing = existingSnapshot?.exists() ? existingSnapshot.val() : {};
      const uploadedAvatar = await uploadAvatarIfNeeded(currentUser, elements.profileAvatarFile?.files?.[0]);
      const manualAvatar = cleanAvatarSource(elements.profileAvatarUrl?.value);
      const photoURL = uploadedAvatar || manualAvatar || existing.photoURL || currentUser.photoURL || null;
      const now = Date.now();
      const profileRecord = {
        uid: currentUser.uid,
        email: currentUser.email || "",
        displayName,
        displayNameLower: displayName.toLowerCase(),
        bio,
        status: cleanText(elements.profileStatus?.value, 120),
        favoriteGames: cleanText(elements.profileFavoriteGames?.value, 300),
        platforms: readPlatforms(elements),
        privacy: readPrivacy(elements),
        photoURL,
        createdAt: existing.createdAt || now,
        updatedAt: now
      };

      const authProfile = isRemoteImageUrl(photoURL)
        ? { displayName, photoURL }
        : { displayName };
      await updateProfile(currentUser, authProfile);
      await set(ref(database, `profiles/${currentUser.uid}`), profileRecord);
      await set(ref(database, `publicProfiles/${currentUser.uid}`), buildPublicProfile(profileRecord));
      await set(ref(database, `presence/${currentUser.uid}`), presencePayload({ uid: currentUser.uid, email: currentUser.email, displayName }, true));
      await renderSignedIn(currentUser);
      setStatus("Profile updated.", "success");
    } catch (error) {
      setStatus(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  async function handleSignOut() {
    setBusy(true);
    setStatus("Closing Nexus session...");

    try {
      clearPresence();
      await signOut(auth);
      setStatus("");
    } catch (error) {
      setStatus(friendlyError(error), "error");
    } finally {
      setBusy(false);
    }
  }

  function bindAuthControls() {
    const elements = getElements();
    if (!elements.signIn || elements.signIn.dataset.banriAuthBound === "true") return;

    elements.signIn.dataset.banriAuthBound = "true";
    document.getElementById("banriLoginModal")?.addEventListener("show.bs.modal", () => {
      setAuthView(currentUser ? "profile" : "login");
      setStatus("");
      if (!currentUser) {
        if (elements.registerCode) elements.registerCode.value = "";
        if (elements.registerPassword) elements.registerPassword.value = "";
      }
    });
    elements.signIn.addEventListener("click", handleSignIn);
    elements.create?.addEventListener("click", () => {
      setAuthView("gate");
      setStatus("");
      elements.registerCode?.focus();
    });
    elements.unlockRegister?.addEventListener("click", () => {
      if (normalizeCipherKey(elements.registerCode?.value) !== REGISTER_CIPHER_KEY) {
        setStatus("Cipher key rejected.", "error");
        return;
      }
      if (elements.registerEmail && elements.email?.value) elements.registerEmail.value = elements.email.value.trim();
      setAuthView("register");
      setStatus("Cipher accepted. Complete registration.", "success");
      elements.registerDisplayName?.focus();
    });
    elements.backToLogin?.addEventListener("click", () => {
      setAuthView("login");
      setStatus("");
    });
    elements.cancelRegister?.addEventListener("click", () => {
      setAuthView("login");
      setStatus("");
    });
    elements.submitRegister?.addEventListener("click", handleCreateAccount);
    elements.save?.addEventListener("click", handleSaveProfile);
    elements.signOut?.addEventListener("click", handleSignOut);
    elements.worldsNode?.addEventListener("click", (event) => {
      if (currentUser) return;
      event.preventDefault();
      setAuthView("login");
      setStatus("Login to access hosted world routes.");
      showLoginModal();
    });

    [elements.email, elements.password].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") handleSignIn();
      });
    });

    elements.registerCode?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") elements.unlockRegister?.click();
    });

    [elements.registerDisplayName, elements.registerEmail, elements.registerPassword].forEach((input) => {
      input?.addEventListener("keydown", (event) => {
        if (event.key === "Enter") handleCreateAccount();
      });
    });

    elements.profileDisplayName?.addEventListener("keydown", (event) => {
      if (event.key === "Enter") handleSaveProfile();
    });
  }

  ["pointerdown", "keydown", "mousemove", "focus", "visibilitychange"].forEach((eventName) => {
    document.addEventListener(eventName, () => {
      if (eventName === "visibilitychange" && document.hidden) return;
      touchPresence();
    });
  });

  function init() {
    bindAuthControls();
    onAuthStateChanged(auth, (user) => {
      if (user) {
        renderSignedIn(user);
      } else {
        renderSignedOut();
      }
    });
  }

  document.addEventListener("banri:includes-ready", init, { once: true });
  if (document.getElementById("banriAuthSignedOut")) init();
})();
