// Load the spacesuit set data from the JSON file
fetch('assets/json/spacesuits.json')
    .then(response => response.json())
    .then(data => {
        // Once data is loaded, generate the checklist
        generateChecklist(data);
    })
    .catch(error => {
        console.error('Error loading spacesuit set data:', error);
    });

    // Function to update the progress bar
function updateProgressBar(completed, total) {
    const progressBar = document.getElementById('progress-bar');
    const percentage = total > 0 ? (completed / total) * 100 : 0;
    progressBar.style.width = percentage + '%';
}

// Function to generate the checklist dynamically
function generateChecklist(spacesuitSets) {
    const columns = document.querySelectorAll('.column');
    let totalItems = 0;
    let completedItems = 0;

    spacesuitSets.forEach((set, index) => {
        const setHeader = document.createElement('h2');
        const setTitle = document.createElement('span'); // Create a clickable span for the set title
        setHeader.appendChild(setTitle);
        setHeader.style.cursor = 'pointer'; // Set the cursor style for the header

        // Function to toggle completion status of all pieces in the set
        function toggleSetCompletion(event) {
            if (event.target !== checkbox) {
                const setPieces = document.querySelectorAll(`#${set.name.replace(/\s+/g, '').toLowerCase()}Piece1,
                                                     #${set.name.replace(/\s+/g, '').toLowerCase()}Piece2,
                                                     #${set.name.replace(/\s+/g, '').toLowerCase()}Piece3`);

                setPieces.forEach(piece => {
                    const checkbox = piece.previousElementSibling;
                    const label = piece.nextElementSibling;
                    if (!checkbox.checked) {
                        checkbox.checked = true;
                        label.className = 'completed';
                        completedItems++;
                        localStorage.setItem(piece.id, 'true'); // Save completion status
                    }
                });

                // Update progress
                updateProgressBar(completedItems, totalItems);
            }
        }

        // Add click event listener to the set title
        setTitle.addEventListener('click', toggleSetCompletion);

        // Make the set title clickable
        setTitle.className = 'set-title';
        setTitle.textContent = set.name;

        const setList = document.createElement('ul');
        set.pieces.forEach((piece, pieceIndex) => {
            const pieceId = set.name.replace(/\s+/g, '').toLowerCase() + `Piece${pieceIndex + 1}`;
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

                // Update progress
                if (checkbox.checked) {
                    completedItems++;
                    localStorage.setItem(pieceId, 'true');
                } else {
                    completedItems--;
                    localStorage.setItem(pieceId, 'false');
                }
                updateProgressBar(completedItems, totalItems);
            });

            listItem.appendChild(checkbox);
            listItem.appendChild(label);
            setList.appendChild(listItem);

            totalItems++; // Increment total items
        });

        // Distribute sets across columns
        const column = columns[index % columns.length];
        column.appendChild(setHeader);
        column.appendChild(setList);
    });

    // Update progress bar initially
    updateProgressBar(completedItems, totalItems);
}

// Generate the checklist when the page loads
window.addEventListener('load', () => {
    fetch('assets/json/spacesuits.json')
        .then(response => response.json())
        .then(data => {
            // Once data is loaded, generate the checklist
            generateChecklist(data);

            // Update progress bar based on completion data from local storage
            const checkboxes = document.querySelectorAll('input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.addEventListener('change', function () {
                    const checkedCheckboxes = document.querySelectorAll('input[type="checkbox"]:checked');
                    const completedItems = checkedCheckboxes.length;
                    updateProgressBar(completedItems, checkboxes.length);
                });
            });
        })
        .catch(error => {
            console.error('Error loading spacesuit set data:', error);
        });
});