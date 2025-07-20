
async function loadCreatures() {
  const [creaturesRes, iconRes] = await Promise.all([
    fetch('https://banrigaming.github.io/assets/json/bugdata.json'),
    fetch('https://banrigaming.github.io/assets/json/icon_map.json')
  ]);
  const data = await creaturesRes.json();
  const icons = await iconRes.json();
  const grid = document.getElementById('creatureGrid');

  data.forEach((creature, index) => {
    const modalId = `creatureModal${index}`;

    // CARD
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 col-lg-3 mb-3 creature-card';
    col.dataset.name = creature.name.toLowerCase();
    col.innerHTML = `
      <div class="card text-center h-100 text-white bg-dark shadow-sm">
        <img src="${creature.image}" class="mx-auto mt-3" style="width:100px;height:100px;object-fit:contain;" />
        <div class="card-body">
          <h5 class="card-title fw-bold">${creature.name}</h5>
          <button class="btn btn-outline-info btn-sm mt-2" data-bs-toggle="modal" data-bs-target="#${modalId}">Details</button>
        </div>
      </div>
    `;
    grid.appendChild(col);

    // Helper for icons
    const makeIcons = (arr) => arr.map(type =>
      icons[type] ? `
      <div class="text-center me-2 mb-2">
        <img src="${icons[type]}" width="35" height="35" title="${type}" alt="${type}"><br>
        <small class="text-muted">${type}</small>
      </div>` : ''
    ).join('');

    // MODAL
    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = modalId;
    modal.tabIndex = -1;
    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header border-0">
            <h4 class="modal-title w-100 text-center">${creature.name}</h4>
            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
          </div>
          <div class="modal-body text-center">
            <img src="${creature.image}" class="img-fluid mb-4" style="width:200px;height:200px;object-fit:contain;" alt="${creature.name}">
            <div class="row text-start mb-3">
              <div class="col-6">
                <h6 class="text-uppercase small">Element Weakness</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.elementweakness || [])}</div>
              </div>
              <div class="col-6">
                <h6 class="text-uppercase small">Element Resistance</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.elementresistance || [])}</div>
              </div>
            </div>
            <div class="row text-start mb-3">
              <div class="col-6">
                <h6 class="text-uppercase small">Weakness</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.weaknesses || [])}</div>
              </div>
              <div class="col-6">
                <h6 class="text-uppercase small">Resistance</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.resistances || [])}</div>
              </div>
            </div>
            <div class="row text-start mb-3">
              <div class="col-6">
                <h6 class="text-uppercase small">Weakpoint</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.weakpoint || [])}</div>
              </div>
              <div class="col-6">
                <h6 class="text-uppercase small">Immunities</h6>
                <div class="d-flex justify-content-center flex-wrap">${makeIcons(creature.immunities || [])}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  });

  // SEARCH FILTER
  document.getElementById('searchInput').addEventListener('input', function(e) {
    const query = e.target.value.toLowerCase();
    document.querySelectorAll('.creature-card').forEach(card => {
      card.style.display = card.dataset.name.includes(query) ? '' : 'none';
    });
  });
}

document.addEventListener('DOMContentLoaded', loadCreatures);
