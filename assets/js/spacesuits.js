// Load the spacesuit set data from the JSON file
fetch('https://banrigaming.github.io/assets/json/spacesuits.json')
    .then(response => response.json())
    .then(data => {
        // Once data is loaded, generate the checklist
        generateChecklist(data);
    })
    .catch(error => {
        console.error('Error loading spacesuit set data:', error);
    });

// Function to generate the checklist dynamically
function generateChecklist(spacesuitSets) {
    const columns = document.querySelectorAll('.column');

    // Clear existing checklist
    columns.forEach(column => {
        column.innerHTML = ''; // Clear the content of each column
    });

    spacesuitSets.forEach((set, index) => {
        const setHeader = document.createElement('h2');
        const setTitle = document.createElement('span'); // Create a clickable span for the set title
        setHeader.appendChild(setTitle);
        setHeader.style.cursor = 'pointer'; // Set the cursor style for the header

        // Inside the generateChecklist function
        const setImage = document.createElement('img'); // Create an image element
        setImage.src = set.image; // Set the image source based on the data in JSON 
        
        setImage.className = 'set-image'; // Add a CSS class for styling

        // Function to toggle completion status of all pieces in the set
        function toggleSetCompletion(event) {
            console.log('Title clicked!'); // Add this line for debugging
            set.pieces.forEach(piece => {
                const pieceId = set.name.replace(/\s+/g, '').toLowerCase() + piece.replace(/\s+/g, '').toLowerCase();
                const checkbox = document.getElementById(pieceId);
                if (!checkbox) {
                    console.log(`No checkbox found for piece: ${pieceId}`); // Add this line for debugging
                    return; // Skip this piece and continue with the next one
                }

                const label = checkbox.nextElementSibling;
                if (!checkbox.checked) {
                    checkbox.checked = true;
                    label.className = 'completed';
                    localStorage.setItem(pieceId, 'true'); // Save completion status
                }else{
                    checkbox.checked = false; // Uncheck the checkbox
                    label.className = 'uncompleted';
                    localStorage.setItem(piece.id, 'false'); // Save completion status
                }
            });
        }

        // Add click event listener to the set title
        setTitle.addEventListener('click', toggleSetCompletion);

        // Make the set title clickable
        setTitle.className = 'set-title';
        setTitle.textContent = set.name;

        const setList = document.createElement('ul');
        set.pieces.forEach((piece, pieceIndex) => {
            const pieceId = set.name.replace(/\s+/g, '').toLowerCase() + piece.replace(/\s+/g, '').toLowerCase();
            const pieceLabel = piece;

            const listItem = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.id = pieceId;
            const label = document.createElement('label');
            label.setAttribute('for', pieceId);
            label.textContent = pieceLabel;

            // Restore completion status from local storage
            const isChecked = localStorage.getItem(pieceId) === 'true';
            checkbox.checked = isChecked;
            label.className = isChecked ? 'completed' : 'uncompleted';

            // Add class to label based on checkbox status
            checkbox.addEventListener('change', function () {
                label.className = checkbox.checked ? 'completed' : 'uncompleted';

                // Update completion status in local storage
                localStorage.setItem(pieceId, checkbox.checked ? 'true' : 'false');
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            setList.appendChild(listItem);
        });

        // Distribute sets across columns
        const column = columns[index % columns.length];
        column.appendChild(setHeader);
        column.appendChild(setImage);
        column.appendChild(setList);
    });
}

// Generate the checklist when the page loads
window.addEventListener('load', () => {
    fetch('https://banrigaming.github.io/assets/json/spacesuits.json')
        .then(response => response.json())
        .then(data => {
            // Once data is loaded, generate the checklist
            generateChecklist(data);
        })
        .catch(error => {
            console.error('Error loading spacesuit set data:', error);
        });
});