// Function to fetch and merge data from multiple JSON files
async function fetchData() {
  let items = [];

  // Fetch data from items1.json
  const response1 = await fetch('https://banrigaming.github.io/assets/json/bg3items1.json');
  const data1 = await response1.json();
  items = items.concat(data1.items);

  // Fetch data from items2.json
  const response2 = await fetch('https://banrigaming.github.io/assets/json/bg3items2.json');
  const data2 = await response2.json();
  items = items.concat(data2.items);

  // Fetch data from items3.json
  const response3 = await fetch('https://banrigaming.github.io/assets/json/bg3items3.json');
  const data3 = await response3.json();
  items = items.concat(data3.items);

  return items;
}

// Function to copy item ID to clipboard and update button text
function copyToClipboardAndUpdateButton(button, text) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);

  button.textContent = 'Copied!'; // Update button text to indicate it's copied
  setTimeout(() => {
    button.textContent = 'Copy'; // Revert button text after 1.5 seconds
  }, 1500);
}

// Function to display filtered items
function displayItems(filteredItems) {
  const itemsDiv = document.getElementById('items');
  itemsDiv.innerHTML = '';

  filteredItems.forEach(item => {
    const div = document.createElement('div');
    const button = document.createElement('button');
    button.textContent = 'Copy';
    button.addEventListener('click', () => {
      copyToClipboardAndUpdateButton(button, item.id);
    });

    div.innerHTML = `${item.name} - ID: ${item.id} `;
    div.appendChild(button);
    itemsDiv.appendChild(div);
  });
}

// Function to search items
async function searchItems() {
  const searchTerm = document.getElementById('search').value.toLowerCase();
  const allItems = await fetchData(); // Fetch all items

  const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(searchTerm));
  displayItems(filteredItems);

  const itemsDiv = document.getElementById('items');
  if (searchTerm.trim() === '') {
    itemsDiv.style.display = 'none'; // Hide all items if search term is empty
  } else {
    itemsDiv.style.display = 'block'; // Show items if search term is entered
  }
}

// Event listener for search input
document.getElementById('search').addEventListener('input', searchItems);

// Initially hide all items
document.getElementById('items').style.display = 'none';
