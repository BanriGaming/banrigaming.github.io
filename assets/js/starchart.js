// Function to fetch planet data from CSV and generate data cards
function fetchPlanetDataAndGenerateDataCards() {
    return fetch('/assets/files/starfieldresources.csv')
        .then(response => response.text())
        .then(data => {
            const parsedData = Papa.parse(data, { header: true, skipEmptyLines: true }).data;
            let array = parsedData;
            generateDataCards(parsedData);
            handleSearchInput(array);
            handleResourceFilterInput(array);
        })
        .catch(error => {
            console.error('Error loading planet data:', error);
        });
}
//Function to initialize the page
function initializePage() {
    fetchPlanetDataAndGenerateDataCards();
}

// Initialize the page on load
window.addEventListener('load', initializePage);

// Function to get the resource name based on its abbreviation
function getResourceName(abbreviation) {
    // Define a mapping of resource abbreviations to resource names
    const resourceMappings = {
        'H20': 'Water',
        'He-3': 'Helium',
        'Cl': 'Chlorine',
        'Pb': 'Lead',
        'Ar': 'Argon',
        'SiH3Cl': 'Chlorosilanes',
        'Al': 'Aluminum',
        'Ni': 'Nickel',
        'W': 'Tungsten',
        'Pt': 'Platinum',
        'Xe': 'Xenon',
        'Fe': 'Iron',
        'V': 'Vanadium',
        'Co': 'Cobalt',
        'U': 'Uranium',
        'Dy': 'Dysprosium',
        'C6Hn': 'Benzene',
        'Be': 'Beryllium',
        'Ag': 'Silver',
        'F': 'Fluorine',
        'Yb': 'Ytterbium',
        'Li': 'Lithium',
        'HnCn': 'Alkanes',
        'Nd': 'Neodymium',
        'xF4': 'Tetrafluorides',
        'IL': 'Ionic Liquids',
        'Eu': 'Europium',
        'Cs': 'Caesium',
        'Pu': 'Plutonium',
        'Ir': 'Iridium',
        'Ne': 'Neon',
        'R-COOH': 'Carboxylic Acids',
        'Au': 'Gold',
        'Pd': 'Palladium',
        'Hg': 'Mercury',
        'Ti': 'Titanium',
        'Sb': 'Antimony',
        'Ta': 'Tantalum',
        'Cu': 'Copper',
        'Ad': 'Aldumite',
        'Ie': 'Indicite',
        'Rc': 'Rothicite',
        'Tsn': 'Tasine',
        'Vr' : 'Veryl',
        'Vy': 'Vytinium' 
        // Add more resource mappings as needed
    };

    // Return the resource name if it exists in the mapping, otherwise return the abbreviation
    return resourceMappings[abbreviation] || abbreviation;
}

// Function to generate data cards based on planet data
function generateDataCards(data) {
    const cardContainer = document.querySelector('.card-container');
    if (!cardContainer) return;

    // Get the list of available resources
    const availableResources = collectAvailableResources(data);
    cardContainer.innerHTML = data.map(buildPlanetCard).join('');

    // Update the resource filter buttons based on available resources
    updateResourceFilterButtons(availableResources);
    document.getElementById("d-planets").innerHTML = data.length;
}

function collectAvailableResources(data) {
    const availableResources = new Set();
    data.forEach(planet => {
        Object.keys(planet).forEach(key => {
            if (planet[key] === 'X' && key !== 'System' && key !== 'Location' && key !== 'Type') {
                availableResources.add(key);
            }
        });
    });
    return availableResources;
}

function buildPlanetCard(planet) {
    const resourceItems = Object.keys(planet)
        .filter(key => planet[key] === 'X' && key !== 'System' && key !== 'Location' && key !== 'Type')
        .map(key => {
            const resource = getResourceName(key);
            const resourceClass = getResourceClass(resource);
            const label = resource === "None" ? "None" : `${key} (${resource})`;

            return `
                <li>
                    <span class="me-2 d-inline-block block-element ${resourceClass}"></span>
                    ${escapeHtml(label)}
                </li>
            `;
        })
        .join('');

    return `
        <div class="card text-white bg-dark">
            <div class="card-header">
                <h5 class="card-title">${escapeHtml(planet['Location'])}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${escapeHtml(planet['System'])}</h6>
                <p class="card-text">${escapeHtml(planet['Type'])}</p>
            </div>
            <div class="card-body">
                <p>Resources:</p>
                <ul class="list-unstyled">${resourceItems}</ul>
            </div>
        </div>
    `;
}

function getResourceClass(resource) {
    return `block-${String(resource || "").toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Function to update resource filter buttons based on available resources
function updateResourceFilterButtons(availableResources) {
    const resourceFilterButtons = document.querySelectorAll('.resource-buttons button');

    resourceFilterButtons.forEach(button => {
        const resource = button.id.replace('filter-', '');
        if (availableResources.has(resource)) {
            button.dataset.available = "true";
            button.classList.add("d-inline");
            if (!button.classList.contains("active")) {
                button.classList.remove("d-none");
            }
        } else {
            button.dataset.available = "false";
            button.classList.add("d-none");
        }
    });
}


/*Function to filter and display data based on search input
function filterAndDisplayData(data) {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    let array = data;
    const searchType = document.querySelector('input[name="search-type"]:checked').id;
    console.log(searchType);
    const filteredData = array.filter(planet => {
        if (searchType === 'search-star-system') {
            return planet['System'].toLowerCase().includes(searchInput);
        } else {
            return planet['Location'].toLowerCase().includes(searchInput);
        }
    });

    generateDataCards(filteredData);
}*/

// Function to handle search input
function handleSearchInput(data) {
    const searchInput = document.getElementById('search-input');

    searchInput.addEventListener('input', () => {
        filterAndDisplayData(data);
    });

    // Handle search type radio button change
    const searchTypeInputs = document.querySelectorAll('input[name="search-type"]');
    searchTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            filterAndDisplayData(data);
        });
    });
}

/* Function to handle resource filter input
function handleResourceFilterInput(data) {
    const resourceFilterButtons = document.querySelectorAll('.resource-buttons button');

    resourceFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            const resource = button.id.replace('filter-', '');
            const resourceFilterInputs = document.querySelectorAll('.resource-buttons button');

            resourceFilterInputs.forEach(input => {
                input.classList.remove('active');
            });

            button.classList.add('active');

            if (resource === 'none') {
                // Show all data if 'None' filter is selected
                generateDataCards(data);
            } else {
                let array = data;
                console.log(array);
                // Filter and display data based on resource filter
                const filteredData = array.filter(planet => planet[resource] === 'X');
                generateDataCards(filteredData);
            }
        });
    });
}*/


// Function to filter and display data based on selected resource filters
function filterAndDisplayData(data) {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    const searchType = document.querySelector('input[name="search-type"]:checked').id;
    const selectedFilters = Array.from(document.querySelectorAll('.resource-buttons button.active'))
        .map(button => button.id.replace('filter-', '')); // Get the selected filter values

    const filteredData = data.filter(planet => {
        if (searchType === 'search-star-system') {
            if (!selectedFilters.length) {
                return planet['System'].toLowerCase().includes(searchInput);
            } else {
                return (
                    planet['System'].toLowerCase().includes(searchInput) &&
                    selectedFilters.every(filter => planet[filter] === 'X')
                );
            }
        } else {
            if (!selectedFilters.length) {
                return planet['Location'].toLowerCase().includes(searchInput);
            } else {
                return (
                    planet['Location'].toLowerCase().includes(searchInput) &&
                    selectedFilters.every(filter => planet[filter] === 'X')
                );
            }
        }
    });

    generateDataCards(filteredData);
}


// Function to handle resource filter input
function handleResourceFilterInput(data) {
    const resourceFilterButtons = document.querySelectorAll('.resource-buttons button');
    const clearFiltersButton = document.getElementById('clear-resource-filters');

    resourceFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active'); // Toggle the 'active' class on filter button
            button.classList.add("d-none");
            renderSelectedFilters();
            // Trigger data filtering when a filter button is clicked
            filterAndDisplayData(data);
        });
    });

    if (clearFiltersButton) {
        clearFiltersButton.addEventListener('click', () => {
            clearActiveResourceFilters();
            filterAndDisplayData(data);
        });
    }

    renderSelectedFilters();
}

function clearActiveResourceFilters() {
    const resourceFilterButtons = document.querySelectorAll('.resource-buttons button');

    resourceFilterButtons.forEach(button => {
        button.classList.remove('active');
        if (button.dataset.available === "true") {
            button.classList.remove("d-none");
            button.classList.add("d-inline");
        }
    });

    renderSelectedFilters();
}

function renderSelectedFilters() {
    const selectedFiltersContainer = document.getElementById("s-filters");
    if (!selectedFiltersContainer) return;

    const selectedButtons = Array.from(document.querySelectorAll('.resource-buttons button.active'));
    if (!selectedButtons.length) {
        selectedFiltersContainer.innerHTML = "Selected Filters: <span class=\"selected-filter-empty\">None</span>";
        return;
    }

    selectedFiltersContainer.innerHTML = "Selected Filters: " + selectedButtons
        .map(button => `<span class="selected-filter-chip">${button.innerHTML}</span>`)
        .join(" ");
}
