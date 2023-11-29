// Function to fetch and merge data from multiple JSON files
async function fetchData() {
    let items = [];
  
    // Fetch data from items1.json
    await fetch('items1.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items1:', error));
  
    // Fetch data from items2.json
    await fetch('items2.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items2:', error));
  
    // Fetch data from items3.json
    await fetch('items3.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items3:', error));
  
    return items;
  }
  
  // Function to display filtered items
  function displayItems(filteredItems) {
    const itemsDiv = document.getElementById('items');
    itemsDiv.innerHTML = '';
  
    filteredItems.forEach(item => {
      const div = document.createElement('div');
      div.innerHTML = `${item.name} - ID: ${item.id} <button onclick="copyToClipboard('${item.id}')">Copy</button>`;
      itemsDiv.appendChild(div);
    });
  }
  
  // Function to search items
  async function searchItems() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const allItems = await fetchData(); // Fetch all items
    const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(searchTerm));
    displayItems(filteredItems);
  }
  
  // Function to copy item ID to clipboard
  function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
    alert('Copied to clipboard: ' + text);
  }
  
  // Initial display of all items
  fetchData().then(allItems => displayItems(allItems));
  
  // Event listener for search input
  document.getElementById('search').addEventListener('input', searchItems);
  