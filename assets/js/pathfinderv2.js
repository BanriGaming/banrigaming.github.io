// CSV Data URL
const csvUrl = 'https://banrigaming.github.io/assets/files/addressbook.csv';
let originalCardsData = []; // Store original data for filtering

// Fetch and parse the CSV
async function fetchCSVData() {
    const response = await fetch(csvUrl);
    const csvText = await response.text();

    return new Promise((resolve, reject) => {
        Papa.parse(csvText, {
            header: false, // CSV does not have headers
            skipEmptyLines: true,
            complete: (results) => resolve(results.data),
            error: (error) => reject(error),
        });
    });
}

// Generate glyph images based on portal code
function generateGlyphs(portalCode) {
    const glyphContainer = document.createElement('div');
    glyphContainer.classList.add('glyph');

    portalCode.split('').forEach((char) => {
        const glyphImage = document.createElement('img');
        glyphImage.src = `https://banrigaming.github.io/assets/img/nms/glyphs/${char.toLowerCase()}.png`;
        glyphImage.alt = `Glyph ${char}`;
        glyphContainer.appendChild(glyphImage);
    });

    return glyphContainer;
}

function renderCards(data) {
    const cardsContainer = document.getElementById('cardsContainer');
    cardsContainer.innerHTML = ''; // Clear existing cards

    if (data.length === 0) {
        // No results found message
        const noResults = document.createElement('p');
        noResults.textContent = 'No matching results found.';
        cardsContainer.appendChild(noResults);
        return;
    }

    data.forEach((row) => {
        const [itemName, itemGalaxy, type, portalCode, galacticAddress, coordinates, imageSrc, additionalData] = row;

        // Create card structure
        const card = document.createElement('div');
        card.classList.add('card', 'text-white', 'bg-dark');
        card.dataset.name = `${itemName}, ${itemGalaxy}`;
        card.dataset.categories = type;
        card.style.display = 'block';

        const cardBody = document.createElement('div');
        cardBody.classList.add('card-body');

        const title = document.createElement('h2');
        title.classList.add('card-title');
        title.textContent = itemName;

        const coord = document.createElement('p');
        coord.textContent = coordinates;

        const galaxyParagraph = document.createElement('h4');
        galaxyParagraph.textContent = itemGalaxy;

        const addressParagraph = document.createElement('p');
        addressParagraph.classList.add('card-text');
        addressParagraph.textContent = galacticAddress || 'N/A';

        const glyphs = generateGlyphs(portalCode);

        // Append elements to card body
        cardBody.appendChild(title);
        cardBody.appendChild(galaxyParagraph);
        cardBody.appendChild(coord);
        cardBody.appendChild(addressParagraph);
        cardBody.appendChild(glyphs);

        if(imageSrc !== "" || additionalData  !== ""){
            // Create and append the Show Data button
            const showDataButton = document.createElement('button');
            showDataButton.classList.add('btn', 'btn-primary');
            showDataButton.setAttribute('data-bs-toggle', 'modal');
            showDataButton.setAttribute('data-bs-target', '#piratefreighter');
            showDataButton.textContent = 'Show Data';

            // Event Listener for modal button
            showDataButton.addEventListener('click', () => {
                populateModal(imageSrc, additionalData);
            });
            cardBody.appendChild(showDataButton);
        }
        
        

        // Append card body to card
        card.appendChild(cardBody);

        // Append card to container
        cardsContainer.appendChild(card);
    });
}

// Function to populate the modal with data
function populateModal(imageSrc, additionalData) {
    const modalImage = document.getElementById('modalImage');
    const modalList = document.getElementById('modalList');

    if(imageSrc == ""){
        modalImage.classList.add("d-none");
    }else{
        // Set the image in the modal
        modalImage.classList.remove("d-none");
        modalImage.src = imageSrc;
    }
    
    // Clear the previous list
    modalList.innerHTML = '';

    // Split additionalData by newline (ALT + Enter splits data in CSV to new lines)
    if (additionalData) {
        const dataList = additionalData.split('\n');
        dataList.forEach(item => {
            const listItem = document.createElement('li');
            listItem.textContent = item;
            modalList.appendChild(listItem);
        });
    }
}

// Filter cards dynamically
function filterCards() {
    const searchQuery = document.getElementById('searchBox').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value.toLowerCase();
    const cardsContainer = document.getElementById('cardsContainer');

    // Clear cards if input is empty and "All Categories" is selected
    if (!searchQuery && typeFilter === 'all categories') {
        cardsContainer.innerHTML = '';
        return;
    }

    const filteredData = originalCardsData.filter((row) => {
        const [itemName, itemGalaxy, type] = row.map((cell) => cell.toLowerCase());

        const matchesSearch =
            itemName.includes(searchQuery) ||
            itemGalaxy.includes(searchQuery) ||
            type.includes(searchQuery);
        const matchesType = typeFilter === 'all categories' || type === typeFilter;

        return matchesSearch && matchesType;
    });

    renderCards(filteredData);
}


// Populate dropdown with types
function populateTypeDropdown(types) {
    const dropdown = document.getElementById('typeFilter');
    const uniqueTypes = ['All Categories', ...new Set(types)].sort();

    dropdown.innerHTML = ''; // Clear existing options
    uniqueTypes.forEach((type) => {
        const option = document.createElement('option');
        option.value = type;
        option.textContent = type;
        dropdown.appendChild(option);
    });
}

// Initialize event listeners
function initializeEventListeners() {
    const searchBox = document.getElementById('searchBox');
    const typeFilter = document.getElementById('typeFilter');
    const cardsContainer = document.getElementById('cardsContainer');
    searchBox.addEventListener('input', () => {
        if (searchBox.value || typeFilter.value !== 'All Categories') {
            filterCards();
        } else {
            cardsContainer.innerHTML = ''; // Clear previous cards
        }
    });

    typeFilter.addEventListener('change', () => {
        if (searchBox.value || typeFilter.value !== 'All Categories') {
            filterCards();
        } else {
            cardsContainer.innerHTML = ''; // Clear previous cards
        }
    });
}

// Populate cards dynamically
async function populateCards() {
    try {
        const csvData = await fetchCSVData();

        originalCardsData = csvData.slice(1); // Skip the header row

        const types = originalCardsData.map((row) => row[2]);
        populateTypeDropdown(types);

        initializeEventListeners();
    } catch (error) {
        console.error('Error fetching or parsing CSV data:', error);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', populateCards);