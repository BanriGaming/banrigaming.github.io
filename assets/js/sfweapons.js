// Load the weapon data from the JSON file
function fetchWeaponData() {
    return fetch('https://banrigaming.github.io/assets/json/sfweapons.json') // Replace with the correct path to your JSON file
        .then(response => response.json());
}

// Function to generate the weapon checklist dynamically
function generateChecklist(weaponData) {
    const weaponList = document.getElementById('weapon-list');
    const categoryButtons = document.querySelectorAll('.filter-buttons button');

    // Function to clear the existing checklist
    function clearChecklist() {
        weaponList.innerHTML = '';
    }

    categoryButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            button.classList.add('active');

            // Clear the existing checklist
            clearChecklist();

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

                        // Create an <h2> element for the weapon title with underlining
                        const weaponTitle = document.createElement('h2');
                        weaponTitle.innerHTML = `<u>${weapon.name}</u>`; // Display the weapon name with underlining
                        weaponItem.appendChild(weaponTitle);

                        // Create an image element and set its source
                        const weaponImage = document.createElement('img');
                        weaponImage.src = weapon.image; // Assuming your JSON data has the image URL
                        weaponImage.alt = weapon.name; // Set alt text for accessibility
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

                        // Create an <h2> element for the weapon title with underlining
                        const weaponTitle = document.createElement('h2');
                        weaponTitle.innerHTML = `<u>${weapon.name}</u>`; // Display the weapon name with underlining
                        weaponItem.appendChild(weaponTitle);

                        // Create an image element and set its source
                        const weaponImage = document.createElement('img');
                        weaponImage.src = weapon.image; // Assuming your JSON data has the image URL
                        weaponImage.alt = weapon.name; // Set alt text for accessibility
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