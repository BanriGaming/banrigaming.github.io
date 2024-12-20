// Function to fetch item data from JSON file
function fetchItemData() {
    // Fetch the JSON file
    fetch('https://banrigaming.github.io/assets/json/vrisingcalc.json')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log('JSON data:', data); // Add this line for logging
        // Call function to populate search options
        populateSearchOptions(data);
      })
      .catch(error => {
        console.error('There was a problem fetching the item data:', error);
      });
}

// Function to populate search options with item names
function populateSearchOptions(data) {
    const searchInput = document.getElementById('searchInput');
    const searchDropdown = document.getElementById('searchDropdown');

    // Add event listener to search input for input changes
    searchInput.addEventListener('input', function(event) {
        const searchTerm = event.target.value.toLowerCase();

        // Clear existing dropdown items
        searchDropdown.innerHTML = '';

        // Loop through each crafting table and its items
        Object.values(data.craftingTables).forEach(craftingTable => {
            Object.values(craftingTable).forEach(itemGroup => {
                if (itemGroup.items) {
                    itemGroup.items.forEach(item => {
                        if (item.item.toLowerCase().includes(searchTerm)) {
                            const dropdownItem = document.createElement('li');
                            dropdownItem.classList.add('dropdown-item');
                            dropdownItem.textContent = item.item;
                            dropdownItem.addEventListener('click', () => {
                                searchInput.value = item.item;
                            });
                            searchDropdown.appendChild(dropdownItem);
                        }
                    });
                }
            });
        });
    });
}

function openQuantityModal(item) {
    // Open modal for specifying quantity
    console.log('Opening modal for:', item);
    // Here you can implement your logic to open the modal and handle quantity selection
}

// Fetch item data when the page loads
window.addEventListener('load', fetchItemData);
