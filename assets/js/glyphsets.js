var cards = document.querySelectorAll('.card');
//Filter by category

// Create a dropdown (select element) for categories
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

function filterCardsByCategory(selectedCategory) {
    // Get all cards

    // Show or hide cards based on the selected category
    cards.forEach(function (card) {
        var categories = card.dataset.categories.split(',').map(function (category) {
            return category.trim();
        });

        if (selectedCategory === 'all' || categories.includes(selectedCategory)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}


function filterCardsByName(searchTerm) {

    cards.forEach(function (card) {
        var name = card.dataset.name.toLowerCase();
        var searchTermLower = searchTerm.toLowerCase();

        if (name.includes(searchTermLower)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

