// Load the magazine data from the JSON file
function fetchMagazineData() {
    return fetch('https://banrigaming.github.io/assets/json/magazine.json')
        .then(response => response.json());
}

// Function to filter magazines based on search input
function filterMagazinesBySearch(magazineData, searchString) {
    const filteredData = [];

    magazineData.forEach(categoryMagazines => {
        const filteredMagazines = categoryMagazines.magazines.filter(magazine =>
            magazine.name.toLowerCase().includes(searchString.toLowerCase())
        );

        if (filteredMagazines.length > 0) {
            const categoryCopy = { ...categoryMagazines };
            categoryCopy.magazines = filteredMagazines;
            filteredData.push(categoryCopy);
        }
    });

    return filteredData;
}

// Function to handle the search input
function handleSearchInput(magazineData) {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('input', () => {
        const searchString = searchInput.value.trim();
        const currentCategory = document.querySelector('.filter-buttons .active').id.toLowerCase();
        const filteredData = filterMagazinesBySearch(magazineData, searchString);

        generateChecklist(filteredData, currentCategory);
    });
}

// Function to toggle the checked state of a magazine
function toggleMagazineState(magazineName, magazineImage) {
    const currentOpacity = window.getComputedStyle(magazineImage).getPropertyValue('opacity');

    if (currentOpacity === '1') {
        magazineImage.style.opacity = '0.5';
    } else {
        magazineImage.style.opacity = '1';
    }

    localStorage.setItem(magazineName, magazineImage.style.opacity);
}

// Function to generate the magazine checklist dynamically
function generateChecklist(magazineData, defaultCategory) {
    const magazineList = document.getElementById('magazine-list');
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
            magazineList.innerHTML = '';

            // Filter magazines based on the clicked category
            const category = button.id.toLowerCase();

            if (category === 'all') {
                // Display all magazines for the "All" category
                magazineData.forEach(categoryMagazines => {
                    const magazineRow = document.createElement('div');
                    magazineRow.className = 'row';

                    categoryMagazines.magazines.forEach(magazine => {
                        const magazineItem = document.createElement('div');
                        magazineItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const magazineTitle = document.createElement('h2');
                        magazineTitle.innerHTML = `<u>${magazine.name}</u>`;
                        magazineItem.appendChild(magazineTitle);

                        // Check if the magazine has an ammo property
                        if (magazine.ammo) {
                            const magazineAmmo = document.createElement('h6');
                            magazineAmmo.innerHTML = `<em>Ammo: ${magazine.ammo}</em>`;
                            magazineItem.appendChild(magazineAmmo);
                        }

                        const magazineImage = document.createElement('img');
                        magazineImage.src = magazine.image;
                        magazineImage.alt = magazine.name;
                        magazineImage.style.opacity = localStorage.getItem(magazine.name) === '0.5' ? '0.5' : '1';

                        magazineImage.addEventListener('click', () => {
                            toggleMagazineState(magazine.name, magazineImage);
                        });

                        magazineItem.appendChild(magazineImage);
                        magazineRow.appendChild(magazineItem);
                    });

                    magazineList.appendChild(magazineRow);
                });
            } else {
                // Display magazines for the selected category
                const magazines = magazineData.find(item => item.category.toLowerCase() === category);

                if (magazines) {
                    const magazineRow = document.createElement('div');
                    magazineRow.className = 'row';

                    magazines.magazines.forEach(magazine => {
                        const magazineItem = document.createElement('div');
                        magazineItem.className = 'col-md-3'; // Use Bootstrap's grid classes to create 4 columns

                        const magazineTitle = document.createElement('h2');
                        magazineTitle.innerHTML = `<u>${magazine.name}</u>`;
                        magazineItem.appendChild(magazineTitle);

                        // Check if the magazine has an ammo property
                        if (magazine.ammo) {
                            const magazineAmmo = document.createElement('h6');
                            magazineAmmo.innerHTML = `<em>Ammo: ${magazine.ammo}</em>`;
                            magazineItem.appendChild(magazineAmmo);
                        }
                        const magazineImage = document.createElement('img');
                        magazineImage.src = magazine.image;
                        magazineImage.alt = magazine.name;
                        magazineImage.style.opacity = localStorage.getItem(magazine.name) === '0.5' ? '0.5' : '1';

                        magazineImage.addEventListener('click', () => {
                            toggleMagazineState(magazine.name, magazineImage);
                        });

                        magazineItem.appendChild(magazineImage);
                        magazineRow.appendChild(magazineItem);
                    });

                    magazineList.appendChild(magazineRow);
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
    fetchMagazineData()
        .then(data => {
            // Once data is loaded, generate the checklist with the default category
            generateChecklist(data, defaultCategory);
            // Add the search input functionality
            handleSearchInput(data);
        })
        .catch(error => {
            console.error('Error loading magazine data:', error);
        });
});