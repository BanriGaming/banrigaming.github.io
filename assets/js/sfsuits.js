// Load the spacesuit data from the JSON file
function fetchSpacesuitData() {
    return fetch('https://banrigaming.github.io/assets/json/sfspacesuits.json')
        .then(response => response.json());
}

// Function to filter spacesuits based on search input
function filterSpacesuitsBySearch(spacesuitData, searchString) {
    const filteredData = [];

    spacesuitData.forEach(categorySpacesuits => {
        const filteredSpacesuits = categorySpacesuits.spacesuits.filter(spacesuit =>
            spacesuit.name.toLowerCase().includes(searchString.toLowerCase())
        );

        if (filteredSpacesuits.length > 0) {
            const categoryCopy = { ...categorySpacesuits };
            categoryCopy.spacesuits = filteredSpacesuits;
            filteredData.push(categoryCopy);
        }
    });

    return filteredData;
}

// Function to handle the search input
function handleSearchInput(spacesuitData) {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('input', () => {
        const searchString = searchInput.value.trim();
        const currentCategory = document.querySelector('.filter-buttons .active').id.toLowerCase();
        const filteredData = filterSpacesuitsBySearch(spacesuitData, searchString);

        generateChecklist(filteredData, currentCategory);
    });
}

// Function to toggle the checked state of a spacesuit
function toggleSpacesuitState(spacesuitName, spacesuitImage) {
    const currentOpacity = window.getComputedStyle(spacesuitImage).getPropertyValue('opacity');

    if (currentOpacity === '1') {
        spacesuitImage.style.opacity = '0.5';
    } else {
        spacesuitImage.style.opacity = '1';
    }

    localStorage.setItem(spacesuitName, spacesuitImage.style.opacity);
}

// Function to generate the spacesuit checklist dynamically
function generateChecklist(spacesuitData, defaultCategory) {
    const spacesuitList = document.getElementById('spacesuit-list');
    const categoryButtons = document.querySelectorAll('.filter-buttons button');

    categoryButtons.forEach(button => { // Set the default category based on local storage or the provided defaultCategory
    const defaultButton = document.getElementById(defaultCategory || 'all');
    defaultButton.click();
        button.addEventListener('click', () => {
            // Remove active class from all buttons
            categoryButtons.forEach(btn => btn.classList.remove('active'));
            // Add active class to the clicked button
            button.classList.add('active');

            // Clear the existing checklist
            spacesuitList.innerHTML = '';

            // Filter spacesuits based on the clicked category
            const category = button.id.toLowerCase();

            if (category === 'all') {
                // Display all spacesuits for the "All" category
                spacesuitData.forEach(categorySpacesuits => {
                    const spacesuitRow = document.createElement('div');
                    spacesuitRow.className = 'row';

                    categorySpacesuits.spacesuits.forEach(spacesuit => {
                        const spacesuitItem = document.createElement('div');
                        spacesuitItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const spacesuitTitle = document.createElement('h2');
                        spacesuitTitle.innerHTML = `<u>${spacesuit.name}</u>`;
                        spacesuitItem.appendChild(spacesuitTitle);

                        // Check if the spacesuit has an ammo property
                        if (spacesuit.ammo) {
                            const spacesuitAmmo = document.createElement('h6');
                            spacesuitAmmo.innerHTML = `<em>Ammo: ${spacesuit.ammo}</em>`;
                            spacesuitItem.appendChild(spacesuitAmmo);
                        }

                        const spacesuitImage = document.createElement('img');
                        spacesuitImage.src = spacesuit.image;
                        spacesuitImage.alt = spacesuit.name;
                        spacesuitImage.style.opacity = localStorage.getItem(spacesuit.name) === '0.5' ? '0.5' : '1';

                        spacesuitImage.addEventListener('click', () => {
                            toggleSpacesuitState(spacesuit.name, spacesuitImage);
                        });

                        spacesuitItem.appendChild(spacesuitImage);
                        spacesuitRow.appendChild(spacesuitItem);
                    });

                    spacesuitList.appendChild(spacesuitRow);
                });
            } else {
                // Display spacesuits for the selected category
                const spacesuits = spacesuitData.find(item => item.category.toLowerCase() === category);

                if (spacesuits) {
                    const spacesuitRow = document.createElement('div');
                    spacesuitRow.className = 'row';

                    spacesuits.spacesuits.forEach(spacesuit => {
                        const spacesuitItem = document.createElement('div');
                        spacesuitItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const spacesuitTitle = document.createElement('h2');
                        spacesuitTitle.innerHTML = `<u>${spacesuit.name}</u>`;
                        spacesuitItem.appendChild(spacesuitTitle);

                        // Check if the spacesuit has an ammo property
                        if (spacesuit.ammo) {
                            const spacesuitAmmo = document.createElement('h6');
                            spacesuitAmmo.innerHTML = `<em>Ammo: ${spacesuit.ammo}</em>`;
                            spacesuitItem.appendChild(spacesuitAmmo);
                        }
                        const spacesuitImage = document.createElement('img');
                        spacesuitImage.src = spacesuit.image;
                        spacesuitImage.alt = spacesuit.name;
                        spacesuitImage.style.opacity = localStorage.getItem(spacesuit.name) === '0.5' ? '0.5' : '1';

                        spacesuitImage.addEventListener('click', () => {
                            toggleSpacesuitState(spacesuit.name, spacesuitImage);
                        });

                        spacesuitItem.appendChild(spacesuitImage);
                        spacesuitRow.appendChild(spacesuitItem);
                    });

                    spacesuitList.appendChild(spacesuitRow);
                }
            }
        });
    });

     // Set the default category based on local storage or the provided defaultCategory
     const defaultButton = document.getElementById(defaultCategory || 'all');
     defaultButton.click();
}

// Get the default category from local storage, or use "All" if not set
const storedDefaultCategory = localStorage.getItem('defaultCategory');
const defaultCategory = storedDefaultCategory || 'all';

// Generate the checklist with the default category on page load
window.addEventListener('load', () => {
    fetchSpacesuitData()
        .then(data => {
            // Once data is loaded, generate the checklist with the default category
            generateChecklist(data, defaultCategory);
            // Add the search input functionality
            handleSearchInput(data);
        })
        .catch(error => {
            console.error('Error loading spacesuit data:', error);
        });
});