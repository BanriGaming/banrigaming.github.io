// Function to fetch planet data from the CSV file
function fetchPlanetData() {
    return fetch('../assets/files/starfieldresources.csv') // Update the file path accordingly
        .then(response => response.text())
        .then(data => {
            // Parse the CSV data and return it as an array of objects
            return parseCSV(data);
        });
}

// Function to parse CSV data into an array of objects
function parseCSV(csvData) {
    // Split CSV data into rows
    const rows = csvData.split('\n');
    const header = rows[0].split(',');

    // Initialize an array to store planet data
    const planetData = [];

    // Loop through rows and create objects for each planet
    for (let i = 1; i < rows.length; i++) {
        const rowData = rows[i].split(',');
        if (rowData.length === header.length) {
            const planet = {};
            for (let j = 0; j < header.length; j++) {
                planet[header[j]] = rowData[j];
            }
            planetData.push(planet);
        }
    }

    return planetData;
}

// Function to filter and display planet data based on selected resources and search query
function filterAndDisplayData(planetData) {
    const resourceButtons = document.querySelectorAll('.resource-button');
    const searchInput = document.getElementById('search-input');
    const tableBody = document.querySelector('tbody');

    // Add event listeners to resource buttons
    resourceButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Toggle the 'selected' class to indicate selection
            button.classList.toggle('selected');

            // Get selected resources
            const selectedResources = Array.from(resourceButtons)
                .filter(btn => btn.classList.contains('selected'))
                .map(btn => btn.getAttribute('data-value'));

            // Filter planet data based on selected resources and search query
            const filteredPlanets = planetData.filter(planet => {
                // Check if the planet has at least one selected resource
                return selectedResources.some(resource => planet[resource] !== 'None');
            });

            // Apply additional search query filtering if provided
            const searchQuery = searchInput.value.toLowerCase().trim();
            if (searchQuery) {
                return filteredPlanets.filter(planet => {
                    return (
                        planet['System'].toLowerCase().includes(searchQuery) ||
                        planet['Location'].toLowerCase().includes(searchQuery) ||
                        planet['Type'].toLowerCase().includes(searchQuery)
                    );
                });
            }

            return filteredPlanets;
        });

        // Function to update the table with filtered data
        function updateTable(filteredData) {
            // Clear the table body
            tableBody.innerHTML = '';

            // Populate the table with filtered data
            filteredData.forEach(planet => {
                const row = document.createElement('tr');
                // Add table cells for each column (e.g., System, Location, Type, etc.)
                // You can also add cells for resource columns here
                // Example: const resourceCell = document.createElement('td');
                //          resourceCell.textContent = planet['Resource Column Name'];
                //          row.appendChild(resourceCell);
                tableBody.appendChild(row);
            });
        }

        // Update the table when resource buttons are clicked or search input changes
        updateTable(filterAndDisplayData(planetData));
    });
}

// Main function to initialize the page
function init() {
    fetchPlanetData()
        .then(planetData => {
            // Initialize the page with planet data
            filterAndDisplayData(planetData);
        })
        .catch(error => {
            console.error('Error loading planet data:', error);
        });
}

// Call the init function when the page loads
window.addEventListener('load', init);
