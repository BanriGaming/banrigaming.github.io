(function () {
  const tracks = [
    ["Slipstream", "/assets/music/01%20Slipstream.mp3"],
    ["Stardance", "/assets/music/02%20Stardance.mp3"],
    ["Afterlight", "/assets/music/03%20Afterlight.mp3"],
    ["Midnight Ride", "/assets/music/04%20Midnight%20Ride.mp3"],
    ["Starscape", "/assets/music/05%20Starscape.mp3"],
    ["Hyperspace", "/assets/music/06%20Hyperspace.mp3"],
    ["Orbital Drift", "/assets/music/07%20Orbital%20Drift.mp3"],
    ["Meteor Rain", "/assets/music/08%20Meteor%20Rain.mp3"],
    ["Eclipse", "/assets/music/09%20Eclipse.mp3"],
    ["Singularity", "/assets/music/10%20Singularity.mp3"],
    ["Nightfall", "/assets/music/Nightfall.mp3"],
    ["Skyline", "/assets/music/Skyline.mp3"]
  ];

  const keys = {
    index: "banriMusicIndex",
    time: "banriMusicTime",
    playing: "banriMusicPlaying",
    volume: "banriMusicVolume",
    updatedAt: "banriMusicUpdatedAt"
  };

  const state = {
    audio: null,
    index: Number(localStorage.getItem(keys.index) || 0),
    playing: false,
    lastSavedAt: 0
  };

  function initMusicPlayer() {
    const root = document.getElementById("banriMusicPlayer");
    if (!root || root.dataset.musicBound === "true") return;
    root.dataset.musicBound = "true";

    const toggle = document.getElementById("banriMusicToggle");
    const panel = document.getElementById("banriMusicPanel");
    const play = document.getElementById("banriMusicPlay");
    const prev = document.getElementById("banriMusicPrev");
    const next = document.getElementById("banriMusicNext");
    const now = document.getElementById("banriMusicNow");
    const list = document.getElementById("banriMusicTracks");
    const volume = document.getElementById("banriMusicVolume");
    if (!toggle || !panel || !play || !prev || !next || !now || !list || !volume) return;

    const saved = readPlaybackState();
    state.audio = new Audio();
    state.audio.preload = "metadata";
    state.audio.volume = saved.volume;
    state.index = saved.index;
    volume.value = String(saved.volume);

    list.innerHTML = tracks.map(([label], index) => `
      <button type="button" data-music-track="${index}">
        <span>${escapeHtml(label)}</span>
        <small>${String(index + 1).padStart(2, "0")}</small>
      </button>
    `).join("");

    function loadTrack(index, options = {}) {
      const shouldPlay = options.play ?? false;
      const seekTo = Math.max(0, Number(options.seekTo || 0));
      state.index = clampIndex(index);
      const [label, src] = tracks[state.index];
      state.audio.src = src;
      now.textContent = label;
      localStorage.setItem(keys.index, String(state.index));

      const applySeek = () => {
        if (!Number.isFinite(state.audio.duration) || state.audio.duration <= 0) {
          state.audio.currentTime = seekTo;
          return;
        }
        state.audio.currentTime = Math.min(seekTo % state.audio.duration, Math.max(0, state.audio.duration - 0.25));
      };

      if (seekTo > 0) {
        try {
          state.audio.currentTime = seekTo;
        } catch {
          // Metadata may not be ready yet; loadedmetadata applies the seek below.
        }
        state.audio.addEventListener("loadedmetadata", applySeek, { once: true });
      }

      state.playing = false;
      renderState();
      if (shouldPlay) playTrack({ preserveTime: options.preserveTime, seekTo });
      else if (options.preserveTime) {
        localStorage.setItem(keys.time, String(seekTo));
        localStorage.setItem(keys.playing, "false");
        localStorage.setItem(keys.updatedAt, String(Date.now()));
      } else {
        localStorage.setItem(keys.time, "0");
        savePlaybackState(false);
      }
    }

    async function playTrack(options = {}) {
      try {
        await state.audio.play();
        state.playing = true;
        if (options.preserveTime) {
          localStorage.setItem(keys.time, String(Math.max(0, Number(options.seekTo || state.audio.currentTime || 0))));
          localStorage.setItem(keys.playing, "true");
          localStorage.setItem(keys.volume, String(state.audio.volume));
          localStorage.setItem(keys.updatedAt, String(Date.now()));
        } else {
          savePlaybackState(true);
        }
        renderState();
      } catch (error) {
        state.playing = false;
        renderState();
      }
    }

    function pauseTrack() {
      state.audio.pause();
      state.playing = false;
      savePlaybackState(false);
      renderState();
    }

    function savePlaybackState(isPlaying = state.playing) {
      if (!state.audio) return;
      localStorage.setItem(keys.index, String(state.index));
      localStorage.setItem(keys.time, String(Number(state.audio.currentTime || 0)));
      localStorage.setItem(keys.playing, String(Boolean(isPlaying)));
      localStorage.setItem(keys.volume, String(state.audio.volume));
      localStorage.setItem(keys.updatedAt, String(Date.now()));
    }

    function renderState() {
      play.textContent = state.playing ? "Pause" : "Play";
      toggle.classList.toggle("is-playing", state.playing);
      toggle.textContent = state.playing ? "Audio On" : "Audio";
      toggle.setAttribute("aria-expanded", panel.hidden ? "false" : "true");
      list.querySelectorAll("[data-music-track]").forEach((button) => {
        button.classList.toggle("active", Number(button.dataset.musicTrack) === state.index);
      });
    }

    toggle.addEventListener("click", () => {
      panel.hidden = !panel.hidden;
      renderState();
    });

    play.addEventListener("click", () => {
      if (state.playing) {
        pauseTrack();
      } else {
        playTrack();
      }
    });

    prev.addEventListener("click", () => loadTrack(state.index - 1, { play: state.playing }));
    next.addEventListener("click", () => loadTrack(state.index + 1, { play: state.playing }));
    volume.addEventListener("input", () => {
      state.audio.volume = Number(volume.value);
      savePlaybackState();
    });
    state.audio.addEventListener("ended", () => loadTrack(state.index + 1, { play: true }));
    state.audio.addEventListener("timeupdate", () => {
      if (!state.playing && Number(state.audio.currentTime || 0) === 0) return;
      if (Date.now() - state.lastSavedAt < 1500) return;
      state.lastSavedAt = Date.now();
      savePlaybackState();
    });
    state.audio.addEventListener("pause", () => {
      if (!state.audio.ended && state.playing) savePlaybackState(false);
    });
    window.addEventListener("pagehide", () => savePlaybackStateOnExit());
    window.addEventListener("beforeunload", () => savePlaybackStateOnExit());

    list.addEventListener("click", (event) => {
      const button = event.target.closest("[data-music-track]");
      if (!button) return;
      loadTrack(Number(button.dataset.musicTrack), { play: true });
    });
    document.addEventListener("click", (event) => {
      if (panel.hidden || root.contains(event.target)) return;
      panel.hidden = true;
      renderState();
    });

    loadTrack(saved.index, {
      play: saved.playing,
      seekTo: saved.resumeTime,
      preserveTime: true
    });

    function savePlaybackStateOnExit() {
      if (state.playing || Number(state.audio.currentTime || 0) > 0) {
        savePlaybackState(state.playing);
      }
    }
  }

  function readPlaybackState() {
    const index = clampIndex(Number(localStorage.getItem(keys.index) || 0));
    const volume = Math.max(0, Math.min(1, Number(localStorage.getItem(keys.volume) || 0.45)));
    const playing = localStorage.getItem(keys.playing) === "true";
    const savedTime = Math.max(0, Number(localStorage.getItem(keys.time) || 0));
    const updatedAt = Number(localStorage.getItem(keys.updatedAt) || Date.now());
    const elapsed = playing ? Math.max(0, (Date.now() - updatedAt) / 1000) : 0;

    return {
      index,
      volume,
      playing,
      resumeTime: savedTime + elapsed
    };
  }

  function clampIndex(index) {
    const count = tracks.length;
    return ((Number(index) || 0) % count + count) % count;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  document.addEventListener("banri:includes-ready", initMusicPlayer);
  if (document.getElementById("banriMusicPlayer")) initMusicPlayer();
})();
