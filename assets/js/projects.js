(function () {
  const projects = [
    {
      title: "Palworld Build Vault",
      type: "Party Tool",
      game: "Palworld",
      status: "Active",
      href: "/palworld/palworld-build-vault-api-v8/index.html",
      summary: "Five-Pal teams, owned Pal records, public or private loadouts, and Firebase sync.",
      image: "/assets/img/hero/banri-hero-02.webp"
    },
    {
      title: "Planetary Resource Archive",
      type: "Tracker",
      game: "Starfield",
      status: "Active",
      href: "/starfield/starchart.html",
      summary: "Search planets, resources, systems, traits, and survey planning signals.",
      image: "/assets/img/starfield/Starfield-Map.webp"
    },
    {
      title: "Spacesuit Locker",
      type: "Loadout Tool",
      game: "Starfield",
      status: "Active",
      href: "/starfield/suitlocker.html",
      summary: "Suit tracking and equipment reference for exploration kits.",
      image: "/assets/img/hero/banri-hero-03.webp"
    },
    {
      title: "Gun Locker",
      type: "Loadout Tool",
      game: "Starfield",
      status: "Active",
      href: "/starfield/gunlocker.html",
      summary: "Weapon notes and arsenal organization for Starfield runs.",
      image: "/assets/img/hero/banri-hero-04.webp"
    },
    {
      title: "Magazine Shelf",
      type: "Checklist",
      game: "Starfield",
      status: "Active",
      href: "/starfield/magazines.html",
      summary: "Magazine tracking for collection progress and route planning.",
      image: "/assets/img/hero/banri-hero-05.webp"
    },
    {
      title: "Palia Time Calculator",
      type: "Calculator",
      game: "Palia",
      status: "Active",
      href: "/palia/ptimecalc.html",
      summary: "Real-time Palia clock and day-cycle helper.",
      image: "/assets/banri-hero-noir.png"
    },
    {
      title: "Palia Villager Registry",
      type: "Reference",
      game: "Palia",
      status: "Active",
      href: "/palia/palianpc.html",
      summary: "Villager and relationship notes for the Palia hub.",
      image: "/assets/img/hero/banri-hero-01.webp"
    },
    {
      title: "No Man's Sky Galaxy List",
      type: "Reference",
      game: "No Man's Sky",
      status: "Active",
      href: "/nms/galaxies.html",
      summary: "Galaxy records and exploration reference.",
      image: "/assets/img/nms/portalbg.jpg"
    },
    {
      title: "Portal Glyphs & Data",
      type: "Reference",
      game: "No Man's Sky",
      status: "Active",
      href: "/nms/infoglyphs.html",
      summary: "Glyph explanations and portal data notes.",
      image: "/assets/img/nms/portalbg.jpg"
    },
    {
      title: "No Man's Sky Save Editor",
      type: "Reference",
      game: "No Man's Sky",
      status: "Active",
      href: "/nms/nms-se.html",
      summary: "Save-editor notes and utility guidance.",
      image: "/assets/img/hero/banri-hero-02.webp"
    },
    {
      title: "Star Citizen Ship Pricer",
      type: "Calculator",
      game: "Star Citizen",
      status: "Active",
      href: "/starcitizen/scpricer.html",
      summary: "Ship price reference and fleet utility experiment.",
      image: "/assets/img/nms/portalbg.jpg"
    },
    {
      title: "V Rising Calculator",
      type: "Calculator",
      game: "V Rising",
      status: "Active",
      href: "/vrising/vrisingcalc.html",
      summary: "Server and vampire-survival planning utilities.",
      image: "/assets/banri-hero-noir.png"
    },
    {
      title: "Melvor Rune Calculator",
      type: "Calculator",
      game: "Melvor Idle",
      status: "Active",
      href: "/melvor/runecalculator.html",
      summary: "Rune planning utility from the Melvor tool set.",
      image: "/assets/img/bg.jpg"
    },
    {
      title: "Melvor XP Calculator",
      type: "Calculator",
      game: "Melvor Idle",
      status: "Active",
      href: "/melvor/xpcalc.html",
      summary: "Experience planning for Melvor training routes.",
      image: "/assets/img/bg.jpg"
    },
    {
      title: "Elden Ring Boss Checklist",
      type: "Checklist",
      game: "Elden Ring",
      status: "Active",
      href: "/Elden%20Ring/erbosschecklist.html",
      summary: "Boss progress tracking for the Lands Between.",
      image: "/assets/img/hero/banri-hero-05.webp"
    }
  ];

  const archived = [
    {
      title: "Diablo 4 Resources",
      type: "Archived Tool",
      game: "Diablo 4",
      status: "Archived",
      href: "/diablo4/resources.html",
      summary: "Older seasonal and Paragon notes preserved without being part of the live tool rotation.",
      image: "/assets/banri-hero-noir.png"
    },
    {
      title: "Baldur's Gate 3 Item IDs",
      type: "Archived Reference",
      game: "Baldur's Gate 3",
      status: "Archived",
      href: "/bg3itemids.html",
      summary: "Legacy item-id lookup kept for reference.",
      image: "/assets/img/bg.jpg"
    },
    {
      title: "Planet Crafter Utility",
      type: "Archived Tool",
      game: "Planet Crafter",
      status: "Archived",
      href: "/planetcrafter.html",
      summary: "Older experiment held in cold storage.",
      image: "/assets/img/hero/banri-hero-03.webp"
    },
    {
      title: "Quick Tool",
      type: "Archived Utility",
      game: "Misc",
      status: "Archived",
      href: "/quicktool.html",
      summary: "Legacy utility page preserved for later triage.",
      image: "/assets/img/hero/banri-hero-04.webp"
    },
    {
      title: "SWTOR Notes",
      type: "Archived Reference",
      game: "SWTOR",
      status: "Archived",
      href: "/swtor.html",
      summary: "Old reference surface kept out of active rotation.",
      image: "/assets/banri-hero-noir.png"
    }
  ];

  const elements = {
    search: document.getElementById("projectSearch"),
    grid: document.getElementById("projectGrid"),
    archive: document.getElementById("projectArchiveGrid"),
    count: document.getElementById("projectCount")
  };

  function render() {
    const query = String(elements.search?.value || "").trim().toLowerCase();
    const matches = (item) => !query || [
      item.title,
      item.type,
      item.game,
      item.status,
      item.summary
    ].join(" ").toLowerCase().includes(query);

    const activeMatches = projects.filter(matches);
    const archiveMatches = archived.filter(matches);
    if (elements.count) elements.count.textContent = String(projects.length).padStart(2, "0");
    if (elements.grid) elements.grid.innerHTML = activeMatches.length
      ? activeMatches.map(renderCard).join("")
      : '<div class="relay-empty">No active projects match that search.</div>';
    if (elements.archive) elements.archive.innerHTML = archiveMatches.length
      ? archiveMatches.map(renderCard).join("")
      : '<div class="relay-empty">No archived systems match that search.</div>';
  }

  function renderCard(item) {
    return `
      <a class="project-card" href="${escapeAttr(item.href)}" style="--project-image: url('${escapeAttr(item.image)}')">
        <span>${escapeHtml(item.type)}</span>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.summary)}</p>
        <small>${escapeHtml(item.game)} / ${escapeHtml(item.status)}</small>
      </a>
    `;
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

  elements.search?.addEventListener("input", render);
  render();
})();
