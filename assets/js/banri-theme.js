(function () {
  const state = {
    initialized: false,
    particleSeeded: false,
    audio: {
      context: null,
      gain: null,
      hum: null,
      shimmer: null,
      sub: null,
      noise: null,
      interval: null,
      muted: localStorage.getItem("banriNexusMuted") === "true"
    }
  };

  const NEXUS_ROUTE_MAP = {
    gaming: {
      title: "Gaming Routes",
      groups: [
        {
          id: "games",
          label: "Games",
          note: "World hubs and landing pages",
          links: [
            { label: "Palworld", href: "/landing-pages/palworld.html" },
            { label: "Grounded", href: "/landing-pages/grounded.html" },
            { label: "Helldivers 2", href: "/landing-pages/helldivers-2.html" },
            { label: "Starfield", href: "/landing-pages/starfield.html" },
            { label: "No Man's Sky", href: "/landing-pages/nms.html" },
            { label: "Palia", href: "/landing-pages/palia.html" },
            { label: "Final Fantasy XIV", href: "/ff14/resources.html" },
            { label: "Elden Ring", href: "/Elden%20Ring/eldenring.html" }
          ]
        },
        {
          id: "guides",
          label: "Guides",
          note: "Guide landing pages",
          links: [
            { label: "MHW Guides", href: "/mhw/guides.html" },
            { label: "MHR Guides", href: "/mhr/guides.html" },
            { label: "Starfield Guides", href: "/starfield/guides.html" },
            { label: "NMS Pathfinder", href: "/nms/pathfinder.html" }
          ]
        },
        {
          id: "builds",
          label: "Builds",
          note: "Build indexes and loadouts",
          links: [
            { label: "MHW Builds", href: "/mhw/builds.html" },
            { label: "MHR Builds", href: "/mhr/builds.html" },
            { label: "Grounded Builds", href: "/grounded/groundedbuilds.html" }
          ]
        }
      ]
    },
    tools: {
      title: "Tool Routes",
      groups: [
        {
          id: "starfield",
          label: "Starfield",
          note: "Archive lockers and trackers",
          links: [
            { label: "Planetary Archive", href: "/starfield/starchart.html" },
            { label: "Spacesuit Locker", href: "/starfield/suitlocker.html" },
            { label: "Gun Locker", href: "/starfield/gunlocker.html" },
            { label: "Magazine Shelf", href: "/starfield/magazines.html" }
          ]
        },
        {
          id: "nms",
          label: "No Man's Sky",
          note: "Glyphs, galaxies, save tools",
          links: [
            { label: "Galaxy List", href: "/nms/galaxies.html" },
            { label: "Portal Glyphs", href: "/nms/infoglyphs.html" },
            { label: "Save Editor", href: "/nms/nms-se.html" },
            { label: "DHD Portal Console", href: "/nms/dhd.html" }
          ]
        },
        {
          id: "utilities",
          label: "Utilities",
          note: "Calculators and project tools",
          links: [
            { label: "Palia Time Calculator", href: "/palia/ptimecalc.html" },
            { label: "Palworld Build Vault", href: "/palworld/palworld-build-vault-api-v8/index.html" },
            { label: "Palworld Skills", href: "/palworld/palskills.html" },
            { label: "AI Creations", href: "/ai-creations.html" },
            { label: "Project Archive", href: "/projects.html" },
            { label: "Activity Feed", href: "/activity.html" }
          ]
        }
      ]
    }
  };

  function resolveNavKey(pathname) {
    const path = pathname.replace(/\/$/, "").toLowerCase();

    if (path === "" || path === "/index" || path === "/index.html") return "home";
    if (path.includes("/clips")) return "clips";
    if (path.includes("/gallery") || path.includes("/collections/")) return "gallery";
    if (path.includes("/aboutme")) return "about";
    if (path.includes("/projects")) return "projects";
    if (
      path.includes("/landing-pages/mhw") ||
      path.includes("/landing-pages/mhr") ||
      path.includes("/landing-pages/diablo4") ||
      path.includes("/landing-pages/melvor") ||
      path.includes("/games") ||
      path.includes("/mhw/") ||
      path.includes("/mhr/") ||
      path.includes("/palworld/")
    ) return "gaming";
    if (path.includes("/starfield/") || path.includes("/palia/") || path.includes("/nms/")) return "worlds";
    if (path.includes("/landing-pages/")) return "worlds";

    return "";
  }

  function setActiveNav() {
    const key = resolveNavKey(window.location.pathname);
    document.querySelectorAll("[data-nav-key]").forEach((link) => {
      link.classList.toggle("active", link.dataset.navKey === key);
      if (link.dataset.navKey === key) {
        link.setAttribute("aria-current", "page");
      } else {
        link.removeAttribute("aria-current");
      }
    });
  }

  function seedNexusParticles() {
    if (state.particleSeeded) return;

    let seeded = false;

    document.querySelectorAll(".nexus-stage").forEach((stage) => {
      if (stage.querySelector(".nexus-particle")) return;

      for (let index = 0; index < 24; index += 1) {
        const particle = document.createElement("span");
        particle.className = "nexus-particle";
        particle.style.setProperty("--x", `${8 + Math.random() * 84}%`);
        particle.style.setProperty("--y", `${8 + Math.random() * 84}%`);
        particle.style.setProperty("--delay", `${Math.random() * 4}s`);
        particle.style.setProperty("--speed", `${5 + Math.random() * 7}s`);
        stage.appendChild(particle);
      }

      seeded = true;
    });

    if (seeded) state.particleSeeded = true;
  }

  function bindNexusModal() {
    const modal = document.getElementById("banriNexusModal");
    if (!modal || modal.dataset.banriBound === "true") return;

    modal.dataset.banriBound = "true";
    modal.addEventListener("shown.bs.modal", () => {
      seedNexusParticles();
      startNexusAudio();
    });
    modal.addEventListener("hidden.bs.modal", stopNexusAudio);
  }

  function bindNexusBranches() {
    document.querySelectorAll("[data-nexus-branch]").forEach((branch) => {
      const button = branch.querySelector("[data-nexus-expand]");
      if (!button || button.dataset.nexusBound === "true") return;

      button.dataset.nexusBound = "true";
      button.addEventListener("click", (event) => {
        event.preventDefault();
        event.stopPropagation();
        const nextState = !branch.classList.contains("active");
        document.querySelectorAll("[data-nexus-branch].active").forEach((openBranch) => {
          if (openBranch === branch) return;
          openBranch.classList.remove("active");
          openBranch.querySelector("[data-nexus-expand]")?.setAttribute("aria-expanded", "false");
        });
        branch.classList.toggle("active", nextState);
        button.setAttribute("aria-expanded", String(nextState));
        renderNexusDrawer(branch, nextState);
      });
    });
  }

  function renderNexusDrawer(branch, shouldOpen) {
    const drawer = document.getElementById("nexusRouteDrawer");
    const title = document.getElementById("nexusRouteDrawerTitle");
    const links = document.getElementById("nexusRouteDrawerLinks");
    if (!drawer || !title || !links) return;

    if (!shouldOpen) {
      drawer.hidden = true;
      drawer.classList.remove("active");
      links.innerHTML = "";
      return;
    }

    const routeKey = branch.dataset.nexusRouteKey || "";
    const routeMap = NEXUS_ROUTE_MAP[routeKey];
    drawer.dataset.nexusRouteKey = routeKey;

    if (routeMap) {
      renderNexusRouteRoot(routeKey);
      drawer.hidden = false;
      requestAnimationFrame(() => drawer.classList.add("active"));
      return;
    }

    const branchTitle = branch.querySelector(".nexus-node-head strong")?.textContent?.trim() || "Routes";
    const routeLinks = [...branch.querySelectorAll(".nexus-branch-panel a")];
    title.textContent = `${branchTitle} Routes`;
    links.innerHTML = routeLinks
      .map((link) => `<a href="${link.getAttribute("href")}">${link.textContent}<span aria-hidden="true">-&gt;</span></a>`)
      .join("");
    drawer.hidden = false;
    requestAnimationFrame(() => drawer.classList.add("active"));
  }

  function closeNexusDrawer() {
    const drawer = document.getElementById("nexusRouteDrawer");
    const links = document.getElementById("nexusRouteDrawerLinks");
    document.querySelectorAll("[data-nexus-branch].active").forEach((openBranch) => {
      openBranch.classList.remove("active");
      openBranch.querySelector("[data-nexus-expand]")?.setAttribute("aria-expanded", "false");
    });
    if (drawer) {
      drawer.classList.remove("active");
      drawer.hidden = true;
      drawer.dataset.nexusRouteKey = "";
    }
    if (links) links.innerHTML = "";
  }

  function renderNexusRouteRoot(routeKey) {
    const routeMap = NEXUS_ROUTE_MAP[routeKey];
    const title = document.getElementById("nexusRouteDrawerTitle");
    const links = document.getElementById("nexusRouteDrawerLinks");
    if (!routeMap || !title || !links) return;

    title.textContent = routeMap.title;
    links.innerHTML = routeMap.groups
      .map((group) => `
        <button type="button" data-nexus-route-group="${escapeAttr(group.id)}">
          <span>${escapeHtml(group.label)}</span>
          <small>${escapeHtml(group.note)}</small>
        </button>
      `)
      .join("");
  }

  function renderNexusRouteGroup(routeKey, groupId) {
    const routeMap = NEXUS_ROUTE_MAP[routeKey];
    const group = routeMap?.groups.find((item) => item.id === groupId);
    const title = document.getElementById("nexusRouteDrawerTitle");
    const links = document.getElementById("nexusRouteDrawerLinks");
    if (!group || !title || !links) return;

    title.textContent = group.label;
    links.innerHTML = `
      <button class="nexus-route-back" type="button" data-nexus-route-back>
        <span>Back</span>
        <small>${escapeHtml(routeMap.title)}</small>
      </button>
      ${group.links.map((link) => `<a href="${escapeAttr(link.href)}">${escapeHtml(link.label)}<span aria-hidden="true">-&gt;</span></a>`).join("")}
    `;
  }

  function bindNexusRouteDrawer() {
    const drawer = document.getElementById("nexusRouteDrawer");
    if (!drawer || drawer.dataset.nexusDrawerBound === "true") return;

    drawer.dataset.nexusDrawerBound = "true";
    drawer.addEventListener("click", (event) => {
      const groupButton = event.target.closest("[data-nexus-route-group]");
      const backButton = event.target.closest("[data-nexus-route-back]");
      const routeLink = event.target.closest(".nexus-route-links a");
      const routeKey = drawer.dataset.nexusRouteKey || "";

      if (groupButton) {
        event.preventDefault();
        event.stopPropagation();
        renderNexusRouteGroup(routeKey, groupButton.dataset.nexusRouteGroup);
      } else if (backButton) {
        event.preventDefault();
        event.stopPropagation();
        renderNexusRouteRoot(routeKey);
      } else if (routeLink) {
        event.preventDefault();
        event.stopPropagation();
        const href = routeLink.getAttribute("href");
        closeNexusDrawer();
        if (href) window.location.href = href;
      } else {
        closeNexusDrawer();
      }
    });
  }

  function bindNexusDestinationClicks() {
    const modal = document.getElementById("banriNexusModal");
    if (!modal || modal.dataset.nexusDestinationBound === "true") return;

    modal.dataset.nexusDestinationBound = "true";
    modal.addEventListener("click", (event) => {
      const drawer = document.getElementById("nexusRouteDrawer");
      if (!drawer || drawer.hidden || event.target.closest("[data-nexus-expand]")) return;
      if (event.target.closest("#nexusRouteDrawer")) return;
      closeNexusDrawer();
    });
  }

  function updateNexusAudioButton() {
    const button = document.getElementById("nexusAudioToggle");
    if (!button) return;

    button.textContent = state.audio.muted ? "Audio Off" : "Audio On";
    button.setAttribute("aria-pressed", String(!state.audio.muted));
  }

  function createNexusAudio() {
    if (state.audio.context) return;

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = 0.0001;
    master.connect(context.destination);

    const sub = context.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 32;
    const subGain = context.createGain();
    subGain.gain.value = 0.38;
    sub.connect(subGain);
    subGain.connect(master);
    sub.start();

    const hum = context.createOscillator();
    hum.type = "sine";
    hum.frequency.value = 64;
    const humGain = context.createGain();
    humGain.gain.value = 0.46;
    hum.connect(humGain);
    humGain.connect(master);
    hum.start();

    const shimmer = context.createOscillator();
    shimmer.type = "sawtooth";
    shimmer.frequency.value = 146;
    const filter = context.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.value = 760;
    filter.Q.value = 4.2;
    const shimmerGain = context.createGain();
    shimmerGain.gain.value = 0.08;
    shimmer.connect(filter);
    filter.connect(shimmerGain);
    shimmerGain.connect(master);
    shimmer.start();

    const noiseBuffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const noiseData = noiseBuffer.getChannelData(0);
    for (let index = 0; index < noiseData.length; index += 1) {
      noiseData[index] = (Math.random() * 2 - 1) * 0.28;
    }
    const noise = context.createBufferSource();
    const noiseFilter = context.createBiquadFilter();
    const noiseGain = context.createGain();
    noise.buffer = noiseBuffer;
    noise.loop = true;
    noiseFilter.type = "highpass";
    noiseFilter.frequency.value = 720;
    noiseGain.gain.value = 0.028;
    noise.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start();

    state.audio.context = context;
    state.audio.gain = master;
    state.audio.sub = sub;
    state.audio.hum = hum;
    state.audio.shimmer = shimmer;
    state.audio.noise = noise;
  }

  function pulseNexusAudio() {
    const { context, gain } = state.audio;
    if (!context || !gain || state.audio.muted) return;

    const blip = context.createOscillator();
    const blipGain = context.createGain();
    const filter = context.createBiquadFilter();
    blip.type = "sine";
    blip.frequency.value = 520 + Math.random() * 620;
    filter.type = "bandpass";
    filter.frequency.value = 900 + Math.random() * 600;
    blipGain.gain.setValueAtTime(0.0001, context.currentTime);
    blipGain.gain.exponentialRampToValueAtTime(0.055, context.currentTime + 0.018);
    blipGain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.24);
    blip.connect(filter);
    filter.connect(blipGain);
    blipGain.connect(gain);
    blip.start();
    blip.stop(context.currentTime + 0.28);
  }

  async function startNexusAudio() {
    updateNexusAudioButton();
    if (state.audio.muted) return;

    createNexusAudio();
    if (!state.audio.context) return;

    if (state.audio.context.state === "suspended") {
      await state.audio.context.resume().catch(() => {});
    }

    state.audio.gain.gain.setTargetAtTime(0.085, state.audio.context.currentTime, 0.04);
    if (!state.audio.interval) {
      state.audio.interval = window.setInterval(pulseNexusAudio, 1050);
    }
  }

  function stopNexusAudio() {
    if (!state.audio.context || !state.audio.gain) return;
    state.audio.gain.gain.setTargetAtTime(0.0001, state.audio.context.currentTime, 0.04);
    if (state.audio.interval) {
      window.clearInterval(state.audio.interval);
      state.audio.interval = null;
    }
  }

  function bindNexusAudioToggle() {
    const button = document.getElementById("nexusAudioToggle");
    if (!button || button.dataset.nexusAudioBound === "true") return;

    button.dataset.nexusAudioBound = "true";
    updateNexusAudioButton();
    button.addEventListener("click", () => {
      state.audio.muted = !state.audio.muted;
      localStorage.setItem("banriNexusMuted", String(state.audio.muted));
      updateNexusAudioButton();
      if (state.audio.muted) {
        stopNexusAudio();
      } else {
        startNexusAudio();
      }
    });
  }

  function closeNavbarOnModalOpen() {
    const nav = document.getElementById("banriPrimaryNav");
    if (!nav || !nav.classList.contains("show") || typeof bootstrap === "undefined") return;

    const collapse = bootstrap.Collapse.getOrCreateInstance(nav, { toggle: false });
    collapse.hide();
  }

  function bindNavActions() {
    document.querySelectorAll("[data-bs-target='#banriNexusModal'], [data-bs-target='#banriLoginModal']").forEach((button) => {
      if (button.dataset.banriActionBound === "true") return;
      button.dataset.banriActionBound = "true";
      button.addEventListener("click", () => {
        closeNavbarOnModalOpen();
        if (button.dataset.bsTarget === "#banriNexusModal") {
          startNexusAudio();
        }
      });
    });
  }

  function bindBackToTop() {
    const button = document.getElementById("banriBackToTop");
    if (!button || button.dataset.backTopBound === "true") return;

    button.dataset.backTopBound = "true";
    const updateVisibility = () => {
      button.classList.toggle("visible", window.scrollY > 420);
    };
    button.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    window.addEventListener("scroll", updateVisibility, { passive: true });
    updateVisibility();
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

  function init() {
    setActiveNav();
    bindNexusModal();
    bindNexusBranches();
    bindNexusRouteDrawer();
    bindNexusDestinationClicks();
    bindNexusAudioToggle();
    bindNavActions();
    bindBackToTop();
    seedNexusParticles();
    state.initialized = true;
  }

  window.BanriTheme = { init };

  document.addEventListener("DOMContentLoaded", init);
  document.addEventListener("banri:includes-ready", init);
})();
