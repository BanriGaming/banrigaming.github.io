$(document).ready(function() {
    // Initialize an empty array to store the added items
    var itemList = [];

    // Function to add item to the list
    function addItemToList(itemName, quantity) {
        // Check if the item already exists in the list
        var existingItem = itemList.find(item => item.name === itemName);
        if (existingItem) {
            // If item exists, update its quantity
            existingItem.quantity += quantity;
        } else {
            // If item doesn't exist, add it to the list
            itemList.push({ name: itemName, quantity: quantity });
        }
        // Refresh the displayed list
        displayItemList();
    }

    // Function to display the list of added items
    function displayItemList() {
        // Get the element where the item list will be displayed
        var itemListElement = $("#itemList");
        // Clear the existing content
        itemListElement.empty();
        // Loop through the itemList array and add each item to the displayed list
        itemList.forEach(function(item) {
            var itemHtml = `<div class="item">${item.name}: ${item.quantity}</div>`;
            itemListElement.append(itemHtml);
        });
    }

    // Event listener for the "Add to List" button
    $("#addItemButton").click(function() {
        // Get the item name from the search input
        var itemName = $("#searchInput").val();
        // Get the quantity from the user input (you may need to add an input field for quantity)
        var quantity = 1; // For now, let's assume quantity is always 1
        // Add the item to the list
        addItemToList(itemName, quantity);
    });
});
