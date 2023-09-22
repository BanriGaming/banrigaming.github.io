// Function to fetch planet data from CSV and generate data cards
function fetchPlanetDataAndGenerateDataCards() {
    return fetch('https://banrigaming.github.io/assets/files/starfieldresources.csv')
        .then(response => response.text())
        .then(data => {
            const parsedData = Papa.parse(data, { header: true }).data;
            let array = $.csv.toObjects(data); //uses jquery.csv.min.js library to convert csv to array
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
        'Cu': 'Copper'
        // Add more resource mappings as needed
    };

    // Return the resource name if it exists in the mapping, otherwise return the abbreviation
    return resourceMappings[abbreviation] || abbreviation;
}

// Function to generate data cards based on planet data
function generateDataCards(data) {
    const cardContainer = document.querySelector('.card-container');
    var count = 0;
    // Clear the card container
    cardContainer.innerHTML = '';

    // Get the list of available resources
    const availableResources = new Set();

    // Loop through the data and generate data cards
    data.forEach(planet => {
        const card = document.createElement('div');
        card.classList.add('card', 'text-white', 'bg-dark');

        // Create a list to display resources
        const resourceList = document.createElement('ul');
        resourceList.classList.add('list-unstyled');

        // Loop through the data keys to find resource properties
        Object.keys(planet).forEach(key => {
            if (planet[key] === 'X' && key !== 'System' && key !== 'Location' && key !== 'Type') {
                // Add resource to the available resources set
                availableResources.add(key);
                
                //create span
                const s_tag = document.createElement('span');
                s_tag.classList.add("me-2","d-inline-block");
                var resource = getResourceName(key);
                s_tag.classList.add("block-element");
                if(resource == "Alkanes"){
                    s_tag.classList.add("block-alkanes");
                }else if(resource == "Aluminum"){
                    s_tag.classList.add("block-aluminum");
                }else if(resource == "Antimony"){
                    s_tag.classList.add("block-antimony");
                }else if(resource == "Argon"){
                    s_tag.classList.add("block-argon");
                }else if(resource == "Benzene"){
                    s_tag.classList.add("block-benzene");
                }else if(resource == "Beryllium"){
                    s_tag.classList.add("block-beryllium");
                }else if(resource == "Caesium"){
                    s_tag.classList.add("block-caesium");
                }else if(resource == "Carboxylic Acids"){
                    s_tag.classList.add("block-carboxylicacids");
                }else if(resource == "Chlorine"){
                    s_tag.classList.add("block-chlorine");
                }else if(resource == "Chlorosilanes"){
                    s_tag.classList.add("block-chlorosilanes");
                }else if(resource == "Cobalt"){
                    s_tag.classList.add("block-cobalt");
                }else if(resource == "Copper"){
                    s_tag.classList.add("block-copper");
                }else if(resource == "Dysprosium"){
                    s_tag.classList.add("block-dysprosium");
                }else if(resource == "Europium"){
                    s_tag.classList.add("block-europium");
                }else if(resource == "Fluorine"){
                    s_tag.classList.add("block-fluorine");
                }else if(resource == "Gold"){
                    s_tag.classList.add("block-gold");
                }else if(resource == "Helium"){
                    s_tag.classList.add("block-helium");
                }else if(resource == "Ionic Liquids"){
                    s_tag.classList.add("block-ionicliquids");
                }else if(resource == "Iron"){
                    s_tag.classList.add("block-iron");
                }else if(resource == "Lead"){
                    s_tag.classList.add("block-lead");
                }else if(resource == "Lithium"){
                    s_tag.classList.add("block-lithium");
                }else if(resource == "Mercury"){
                    s_tag.classList.add("block-mercury");
                }else if(resource == "Neodymium"){
                    s_tag.classList.add("block-neodymium");
                }else if(resource == "Neon"){
                    s_tag.classList.add("block-neon");
                }else if(resource == "Nickel"){
                    s_tag.classList.add("block-nickel");
                }else if(resource == "Palladium"){
                    s_tag.classList.add("block-palladium");
                }else if(resource == "Platinum"){
                    s_tag.classList.add("block-platinum");
                }else if(resource == "Plutonium"){
                    s_tag.classList.add("block-plutonium");
                }else if(resource == "Silver"){
                    s_tag.classList.add("block-silver");
                }else if(resource == "Tantalum"){
                    s_tag.classList.add("block-tantalum");
                }else if(resource == "Tetrafluorides"){
                    s_tag.classList.add("block-tetrafluorides");
                }else if(resource == "Titanium"){
                    s_tag.classList.add("block-titanium");
                }else if(resource == "Tungsten"){
                    s_tag.classList.add("block-tungsten");
                }else if(resource == "Uranium"){
                    s_tag.classList.add("block-uranium");
                }else if(resource == "Vanadium"){
                    s_tag.classList.add("block-vanadium");
                }else if(resource == "Water"){
                    s_tag.classList.add("block-water");
                }else if(resource == "Ytterbium"){
                    s_tag.classList.add("block-ytterbium");
                }else{

                }
                // Create a list item for the resource
                const listItem = document.createElement('li');
                // Display the resource with abbreviation and name in parentheses
                
                if(resource == "None"){
                    listItem.textContent = `None`;
                }else{
                    listItem.textContent = `${key} (${getResourceName(key)})`;
                }
                listItem.insertBefore(s_tag , listItem.firstChild); //append span tag
                // Append the list item to the resource list
                resourceList.appendChild(listItem);
            }
        });

        card.innerHTML = `
            <div class="card-header">
                <h5 class="card-title">${planet['Location']}</h5>
                <h6 class="card-subtitle mb-2 text-muted">${planet['System']}</h6>
                <p class="card-text">${planet['Type']}</p>
            </div>
            <div class="card-body">
            <p>Resources:</p>
            </p>
            ${resourceList.outerHTML}
            </p>
        `;

        // Add resource information dynamically
        const resources = Object.keys(planet);
        resources.splice(resources.indexOf('System'), 1); // Remove 'System' from resources
        resources.splice(resources.indexOf('Location'), 1); // Remove 'Location' from resources
        resources.splice(resources.indexOf('Type'), 1); // Remove 'Type' from resources

        resources.forEach(resource => {
            const resourceValue = planet[resource] === 'None' ? 'No' : planet[resource] === 'Yes' ? 'Yes' : '';
            if (resourceValue === 'Yes') {              
                availableResources.add(resource);
                const listItem = document.createElement('li');
                listItem.textContent = `${resource}`;
                resourceList.appendChild(listItem);
            }
        });

        cardContainer.appendChild(card);
        count++;
    });

    // Update the resource filter buttons based on available resources
    updateResourceFilterButtons(availableResources);
    document.getElementById("d-planets").innerHTML = count;
}

// Function to update resource filter buttons based on available resources
function updateResourceFilterButtons(availableResources) {
    const resourceFilterButtons = document.querySelectorAll('.resource-buttons button');

    resourceFilterButtons.forEach(button => {
        const resource = button.id.replace('filter-', '');
        if (availableResources.has(resource)) {
            button.classList.add("d-inline");
        } else {
            button.classList.add("d-none");
        }
    });
}


/*Function to filter and display data based on search input
function filterAndDisplayData(data) {
    const searchInput = document.getElementById('search-input').value.toLowerCase();
    let array = $.csv.toObjects(data); //uses jquery.csv.min.js library to convert csv to array
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
                let array = $.csv.toObjects(data); //uses jquery.csv.min.js library to convert csv to array
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

    resourceFilterButtons.forEach(button => {
        button.addEventListener('click', () => {
            button.classList.toggle('active'); // Toggle the 'active' class on filter button
            button.classList.add("d-none");
             // Create a <span> element with text
            var newSpan = $('<span class="bg-primary p-1 me-2 rounded-2">'+button.innerHTML+'</span>');
            // Append the <span> element to the #s-filters element
            $("#s-filters").append(newSpan);
            // Trigger data filtering when a filter button is clicked
            filterAndDisplayData(data);
        });
    });
}
