
async function loadBuilds() {
  const res = await fetch('grounded.json');
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

    const firstVariant = Object.values(build.variants)[0];
    firstVariant.armor.concat(firstVariant.weapons).forEach(item => {
      const img = document.createElement('img');
      img.src = item.img;
      img.alt = item.name;
      img.title = item.name;
      img.style.width = '32px';
      img.style.height = '32px';
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

    modal.innerHTML = `
      <div class="modal-dialog modal-dialog-centered modal-lg">
        <div class="modal-content">
          <div class="modal-header flex-column">
            <h5 class="modal-title w-100 text-center">${build.title}</h5>
            <div class="btn-group mt-2" role="group">
              ${Object.keys(build.variants).map(variant =>
                `<button class="btn btn-outline-dark btn-sm" onclick="switchVariant('${index}', '${variant}')">${variant}</button>`
              ).join('')}
            </div>
          </div>
          <div class="modal-body">
            ${Object.entries(build.variants).map(([variantKey, variantData]) => `
              <div class="variant-content" id="variant-${index}-${variantKey}" style="${variantKey === 'backyard' ? '' : 'display:none;'}">
                <div class="modal-section"><h6>Armor</h6><div class="d-flex justify-content-center flex-wrap">
                  ${variantData.armor.map(piece => `
                    <div class="text-center me-2">
                      <img src="${piece.img}" title="${piece.name}" alt="${piece.name}" style="width:40px;height:40px;"><br>
                      <small>${piece.name}<br><em>${piece.upgrade}</em></small>
                    </div>`).join('')}
                </div></div>
                <div class="modal-section"><h6>Trinket</h6><div>
                  <img src="${variantData.trinket.img}" title="${variantData.trinket.name}" alt="${variantData.trinket.name}" style="width:40px;height:40px;">
                  <div><small>${variantData.trinket.name}</small></div>
                </div></div>
                <div class="modal-section"><h6>Weapons</h6><div class="d-flex justify-content-center flex-wrap">
                  ${variantData.weapons.map(w => `
                    <div class="text-center me-2">
                      <img src="${w.img}" title="${w.name}" alt="${w.name}" style="width:40px;height:40px;"><br>
                      <small>${w.name}<br><em>${w.upgrade}</em></small>
                    </div>`).join('')}
                </div></div>
                <div class="modal-section"><h6>Mutations</h6><div class="d-flex justify-content-center flex-wrap">
                  ${variantData.mutations.map(m => `
                    <div class="text-center me-2">
                      <img src="${m.img}" title="${m.name}" alt="${m.name}" style="width:40px;height:40px;"><br>
                      <small>${m.name}</small>
                    </div>`).join('')}
                </div></div>
                <div class="modal-section"><h6>Notes</h6><p>${variantData.notes}</p></div>
              </div>
            `).join('')}
          </div>
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
