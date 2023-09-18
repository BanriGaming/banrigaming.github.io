// Load weapon data from the JSON file
fetch('https://banrigaming.github.io/assets/json/sfweapons.json')
    .then(response => response.json())
    .then(data => {
        generateWeaponList(data); // Generate the checklist
    })
    .catch(error => {
        console.error('Error loading weapon data:', error);
    });

// Function to generate the weapon checklist dynamically
function generateWeaponList(weaponsData) {
    const weaponList = document.getElementById('weapon-list');
    const filterButtons = document.querySelectorAll('.filter-buttons button');
    const savedChecks = JSON.parse(localStorage.getItem('weaponChecklist')) || {};

    // Clear existing checklist
    weaponList.innerHTML = '';

    weaponsData.forEach(category => {
        category.weapons.forEach(weapon => {
            const weaponItem = document.createElement('li');
            const checkbox = document.createElement('input');
            const label = document.createElement('label');
            checkbox.type = 'checkbox';
            checkbox.id = weapon.name;

            // Set the checkbox state based on local storage
            if (savedChecks[weapon.name]) {
                checkbox.checked = true;
            }

            label.textContent = weapon.name;
            label.setAttribute('for', weapon.name);

            // Append checkbox and label to the weapon item
            weaponItem.appendChild(checkbox);
            weaponItem.appendChild(label);

            // Append the weapon item to the list
            weaponList.appendChild(weaponItem);
        });
    });

    // Add event listeners to filter buttons
    filterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const category = button.id;
            filterWeapons(category);
        });
    });

    // Initially, show all weapons
    filterWeapons('all');
}

// Function to filter weapons by category
function filterWeapons(category) {
    const checkboxes = document.querySelectorAll('#weapon-list input');
    checkboxes.forEach(checkbox => {
        const weaponCategory = getWeaponCategory(checkbox.id);
        if (category === 'all' || category === weaponCategory) {
            checkbox.parentElement.style.display = 'block';
        } else {
            checkbox.parentElement.style.display = 'none';
        }
    });
}

// Function to get the category of a weapon
function getWeaponCategory(weaponName) {
    for (const category of weaponData) {
        const foundWeapon = category.weapons.find(weapon => weapon.name === weaponName);
        if (foundWeapon) {
            return category.category;
        }
    }
    return '';
}

// Save checkbox states to local storage on change
const checkboxes = document.querySelectorAll('#weapon-list input');
checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', () => {
        const weaponName = checkbox.id;
        const isChecked = checkbox.checked;

        // Save the checkbox state to local storage
        const savedChecks = JSON.parse(localStorage.getItem('weaponChecklist')) || {};
        savedChecks[weaponName] = isChecked;
        localStorage.setItem('weaponChecklist', JSON.stringify(savedChecks));
    });
});
