// Load the weapon data from the JSON file
function fetchWeaponData() {
    return fetch('https://banrigaming.github.io/assets/json/sfweapons.json')
        .then(response => response.json());
}

// Function to toggle the checked state of a weapon
function toggleWeaponState(weaponName, weaponImage) {
    const currentOpacity = window.getComputedStyle(weaponImage).getPropertyValue('opacity');

    if (currentOpacity === '1') {
        weaponImage.style.opacity = '0.5';
    } else {
        weaponImage.style.opacity = '1';
    }

    localStorage.setItem(weaponName, weaponImage.style.opacity);
}

// Function to generate the weapon checklist dynamically
function generateChecklist(weaponData) {
    const weaponList = document.getElementById('weapon-list');
    const categoryButtons = document.querySelectorAll('.filter-buttons button');

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            button.classList.add('active');

            // Clear the existing checklist
            weaponList.innerHTML = '';

            // Filter weapons based on the clicked category
            const category = button.id.toLowerCase();

            if (category === 'all') {
                // Display all weapons for the "All" category
                weaponData.forEach(categoryWeapons => {
                    const weaponRow = document.createElement('div');
                    weaponRow.className = 'row';

                    categoryWeapons.weapons.forEach(weapon => {
                        const weaponItem = document.createElement('div');
                        weaponItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const weaponTitle = document.createElement('h2');
                        weaponTitle.innerHTML = `<u>${weapon.name}</u>`;
                        weaponItem.appendChild(weaponTitle);

                        // Check if the weapon has an ammo property
                        if (weapon.ammo) {
                            const weaponAmmo = document.createElement('h6');
                            weaponAmmo.innerHTML = `<em>Ammo: ${weapon.ammo}</em>`;
                            weaponItem.appendChild(weaponAmmo);
                        }

                        const weaponImage = document.createElement('img');
                        weaponImage.src = weapon.image;
                        weaponImage.alt = weapon.name;
                        weaponImage.style.opacity = localStorage.getItem(weapon.name) === '0.5' ? '0.5' : '1';

                        weaponImage.addEventListener('click', () => {
                            toggleWeaponState(weapon.name, weaponImage);
                        });

                        weaponItem.appendChild(weaponImage);
                        weaponRow.appendChild(weaponItem);
                    });

                    weaponList.appendChild(weaponRow);
                });
            } else {
                // Display weapons for the selected category
                const weapons = weaponData.find(item => item.category.toLowerCase() === category);

                if (weapons) {
                    const weaponRow = document.createElement('div');
                    weaponRow.className = 'row';

                    weapons.weapons.forEach(weapon => {
                        const weaponItem = document.createElement('div');
                        weaponItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const weaponTitle = document.createElement('h2');
                        weaponTitle.innerHTML = `<u>${weapon.name}</u>`;
                        weaponItem.appendChild(weaponTitle);

                        // Check if the weapon has an ammo property
                        if (weapon.ammo) {
                            const weaponAmmo = document.createElement('h6');
                            weaponAmmo.innerHTML = `<em>Ammo: ${weapon.ammo}</em>`;
                            weaponItem.appendChild(weaponAmmo);
                        }
                        const weaponImage = document.createElement('img');
                        weaponImage.src = weapon.image;
                        weaponImage.alt = weapon.name;
                        weaponImage.style.opacity = localStorage.getItem(weapon.name) === '0.5' ? '0.5' : '1';

                        weaponImage.addEventListener('click', () => {
                            toggleWeaponState(weapon.name, weaponImage);
                        });

                        weaponItem.appendChild(weaponImage);
                        weaponRow.appendChild(weaponItem);
                    });

                    weaponList.appendChild(weaponRow);
                }
            }
        });
    });
}

// Generate the checklist for the default category on page load
window.addEventListener('load', () => {
    fetchWeaponData()
        .then(data => {
            // Once data is loaded, generate the checklist
            generateChecklist(data);
        })
        .catch(error => {
            console.error('Error loading weapon data:', error);
        });
});