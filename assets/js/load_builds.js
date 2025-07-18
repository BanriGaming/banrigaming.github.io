
async function loadBuilds() {
  const res = await fetch('https://banrigaming.github.io/assets/json/grounded.json');
  const builds = await res.json();
  const container = document.getElementById('builds-container');

  builds.forEach((build, index) => {
    const col = document.createElement('div');
    col.className = 'col-sm-6 col-md-4 col-lg-3 mb-4';

    const card = document.createElement('div');
    card.className = 'card text-center shadow build-card';

    const cardBody = document.createElement('div');
    cardBody.className = 'card-body';

    const title = document.createElement('h5');
    title.className = 'card-title';
    title.textContent = build.title;

    const imgRow = document.createElement('div');
    imgRow.className = 'mb-2';

    const mainData = build.variants ? Object.values(build.variants)[0] : build;
    const armor = Array.isArray(mainData.armor) ? mainData.armor : [];
    const weapons = Array.isArray(mainData.weapons) ? mainData.weapons : [];

    [...armor, ...weapons].forEach(item => {
      const img = document.createElement('img');
      img.src = item.img;
      img.alt = item.name;
      img.title = item.name;
      img.style.width = '50px';
      img.style.height = '50px';
      imgRow.appendChild(img);
    });

    const btn = document.createElement('button');
    btn.className = 'btn btn-primary btn-sm';
    btn.textContent = 'View Build';
    btn.setAttribute('data-bs-toggle', 'modal');
    btn.setAttribute('data-bs-target', `#modal${index}`);

    cardBody.appendChild(title);
    cardBody.appendChild(imgRow);
    cardBody.appendChild(btn);
    card.appendChild(cardBody);
    col.appendChild(card);
    container.appendChild(col);

    const modal = document.createElement('div');
    modal.className = 'modal fade';
    modal.id = `modal${index}`;
    modal.setAttribute('tabindex', '-1');

    function renderSection(title, items, includeUpgrade = false) {
      if (!items || items.length === 0) return '';
      return `
        <div class="modal-section"><h6>${title}</h6><div class="d-flex justify-content-center flex-wrap">
          ${items.map(item => `
            <div class="text-center me-2">
              <div class="horizontal-icon-wrap">
                <div class="icon-title">${item.name}</div>
                <img src="${item.img}" title="${item.name}" alt="${item.name}" style="width:50px;height:50px;">
                ${includeUpgrade && item.upgrade ? `<div class="icon-label">${item.upgrade}</div>` : ''}
              </div>
            </div>`).join('')}
        </div></div>
      `;
    }

    let modalBody = '';
    if (build.variants) {
      modalBody = Object.entries(build.variants).map(([variantKey, variantData]) => `
        <div class="variant-content" id="variant-${index}-${variantKey}" style="${variantKey === 'backyard' ? '' : 'display:none;'}">
          ${renderSection('Armor', variantData.armor, true)}
          ${renderSection('Trinket', Array.isArray(variantData.trinket) ? variantData.trinket : [variantData.trinket])}
          ${renderSection('Weapons', variantData.weapons, true)}
          ${renderSection('Mutations', variantData.mutations)}
          <div class="modal-section"><h6>Notes</h6><p>${variantData.notes}</p></div>
        </div>
      `).join('');
    } else {
      modalBody = `
        <div class="variant-content">
          ${renderSection('Armor', build.armor, true)}
          ${renderSection('Trinket', build.trinket)}
          ${renderSection('Weapons', build.weapons, true)}
          ${renderSection('Mutations', build.mutations)}
          <div class="modal-section"><h6>Notes</h6><p>${build.notes}</p></div>
        </div>
      `;
    }

    const variantButtons = build.variants
      ? `<div class="btn-group mt-2" role="group">
          ${Object.keys(build.variants).map(variant =>
            `<button class="btn btn-outline-light btn-sm text-capitalize" onclick="switchVariant('${index}', '${variant}')">${variant}</button>`
          ).join('')}
        </div>`
      : '';

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header flex-column">
            <h5 class="modal-title w-100 text-center">${build.title}</h5>
            ${variantButtons}
          </div>
          <div class="modal-body">${modalBody}</div>
          <div class="modal-footer">
            <button class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  });
}

function switchVariant(index, variant) {
  document.querySelectorAll(`#modal${index} .variant-content`).forEach(el => el.style.display = 'none');
  const showEl = document.getElementById(`variant-${index}-${variant}`);
  if (showEl) showEl.style.display = '';
}

document.addEventListener('DOMContentLoaded', loadBuilds);
