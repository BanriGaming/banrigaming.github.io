// Parse CSV function (use PapaParse or FileReader for your case)
// Assuming PapaParse library is included
function parseCSV(csvData) {
    return Papa.parse(csvData, { header: true }).data;
}

// Render Cards
function renderCards(parsedData) {
    const container = document.getElementById('cards-container'); // Assume you have a container for cards
    
    parsedData.forEach((item) => {
        // Create card element
        const card = document.createElement('div');
        card.className = 'card';
        
        // Add Item Name
        const nameElement = document.createElement('h3');
        nameElement.innerText = item.Item;
        card.appendChild(nameElement);

        // Add Galaxy and Type
        const galaxyElement = document.createElement('p');
        galaxyElement.innerText = `Galaxy: ${item.Galaxy}`;
        card.appendChild(galaxyElement);

        const typeElement = document.createElement('p');
        typeElement.innerText = `Category: ${item.Type}`;
        card.appendChild(typeElement);
        
        // Add Portal Code and corresponding glyphs
        const portalCode = item.Portalcode.trim();
        const portalContainer = document.createElement('div');
        portalCode.split('').forEach((glyphChar) => {
            const glyphName = getGlyphName(glyphChar);
            const glyphImage = document.createElement('img');
            glyphImage.src = `https://banrigaming.github.io/assets/img/nms/glyphs/${glyphName}.png`;  // Assuming image names match the glyph names
            glyphImage.alt = glyphName;
            portalContainer.appendChild(glyphImage);
        });
        card.appendChild(portalContainer);

        // Add Galactic Address and Coordinates (if available)
        if (item.GalacticAddress) {
            const addressElement = document.createElement('p');
            addressElement.innerText = `Address: ${item.GalacticAddress}`;
            card.appendChild(addressElement);
        }

        if (item.Coordinates) {
            const coordinatesElement = document.createElement('p');
            coordinatesElement.innerText = `Coordinates: ${item.Coordinates}`;
            card.appendChild(coordinatesElement);
        }

        // Add Notes (if available)
        if (item.Notes) {
            const notesElement = document.createElement('p');
            notesElement.innerText = `Notes: ${item.Notes}`;
            card.appendChild(notesElement);
        }

        // Add Image (with Modal functionality)
        if (item.Image) {
            const imgElement = document.createElement('img');
            imgElement.src = item.Image;
            imgElement.className = 'card-image';  // Add some classes for styling
            imgElement.addEventListener('click', function() {
                openModal(item.Image); // Open image modal (implement separately)
            });
            card.appendChild(imgElement);
        }

        // Add the card to the container
        container.appendChild(card);
    });
}

// Get the Glyph Name for each character in the Portal Code
function getGlyphName(char) {
    const glyphs = {
        '0': 'Sunset',
        '1': 'Bird',
        '2': 'Face',
        '3': 'Diplo',
        '4': 'Eclipse',
        '5': 'Balloon',
        '6': 'Boat',
        '7': 'Bug',
        '8': 'Dragonfly',
        '9': 'Galaxy',
        'A': 'Voxel',
        'B': 'Fish',
        'C': 'Tent',
        'D': 'Rocket',
        'E': 'Tree',
        'F': 'Atlas'
    };

    return glyphs[char] || '';  // return the glyph name or an empty string if invalid
}

// Function to handle modal (if applicable)
function openModal(imageUrl) {
    const modal = document.getElementById('imageModal');  // Assume there's a modal element
    const modalImage = modal.querySelector('img');
    modalImage.src = imageUrl;
    modal.style.display = 'block';  // Show the modal
}

function closeModal() {
    const modal = document.getElementById('imageModal');
    modal.style.display = 'none'; // Hide the modal when clicked outside
}

// Example usage: CSV parsing and rendering
document.getElementById('https://banrigaming.github.io/assets/files/addressbook.csv').addEventListener('change', function(event) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const csvData = e.target.result;
        const parsedData = parseCSV(csvData);
        renderCards(parsedData);
    };
    reader.readAsText(event.target.files[0]);
});
