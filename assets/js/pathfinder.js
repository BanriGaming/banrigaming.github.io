var cards = document.querySelectorAll('.card');

// Hide all cards initially on page load
cards.forEach(function(card) {
    card.style.display = 'none';
});

// Filter by category
var filterDropdown = document.getElementById("categoryFilter");
filterDropdown.addEventListener("change", function () {
    // Show or hide cards based on the selected category
    filterCardsByCategory(this.value);
});
    
var searchBox = document.getElementById("search-box");   
searchBox.addEventListener("input", function () {
    var searchTerm = searchBox.value.trim();
    filterCardsByName(searchTerm);
});

// Store current selected category for reference
var selectedCategory = '';

// Function to filter by category
function filterCardsByCategory(selectedCategory) {
    cards.forEach(function (card) {
        var categories = card.dataset.categories.split(',').map(function (category) {
            return category.trim();
        });

        // Store the selected category
        selectedCategory = selectedCategory;

        // Show or hide cards based on the selected category
        if (selectedCategory === 'all' || categories.includes(selectedCategory)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }

        // If no category is selected and search box is empty, hide all cards again
        if (!selectedCategory && !searchBox.value.trim()) {
            cards.forEach(function (card) {
                card.style.display = 'none';
            });
        }
    });
}

// Function to filter by search term
function filterCardsByName(searchTerm) {
    // Only show cards that match the search term
    cards.forEach(function (card) {
        var name = card.dataset.name.toLowerCase();
        var searchTermLower = searchTerm.toLowerCase();

        // If search is not empty and matches, show card, else hide
        if (searchTerm === "") {
            // If search term is cleared, hide cards unless there's a category filter
            if (!selectedCategory || selectedCategory === 'all') {
                card.style.display = 'none';
            }
        } else if (name.includes(searchTermLower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

/* Function to trigger the modal on button click
document.getElementById("showImageButton").addEventListener("click", function() {
    // Create a new instance of the Bootstrap Modal
    var modal = new bootstrap.Modal(document.getElementById('imageModal'), {
        keyboard: true // Optional: allows closing the modal with the keyboard
    });

    // Show the modal
    modal.show();
});*/

function copyTextAndOpenURL() {
    // Get the displayed text
    const text = document.getElementById('displayText').innerText;

    // Copy the text to the clipboard
    navigator.clipboard.writeText(text)
        .then(() => {
            console.log('Text copied to clipboard:', text);
            // Open the specified URL
            window.open('https://banrigaming.github.io/nms/portaldecoder', '_blank');
        })
        .catch(err => {
            console.error('Failed to copy text: ', err);
        });
}