// Function to fetch and merge data from multiple JSON files
async function fetchData() {
    let items = [];
  
    // Fetch data from items1.json
    await fetch('https://banrigaming.github.io/assets/json/bg3items1.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items1:', error));
  
    // Fetch data from items2.json
    await fetch('https://banrigaming.github.io/assets/json/bg3items2.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items2:', error));
  
    // Fetch data from items3.json
    await fetch('https://banrigaming.github.io/assets/json/bg3items3.json')
      .then(response => response.json())
      .then(data => {
        items = items.concat(data.items);
      })
      .catch(error => console.error('Error fetching items3:', error));
  
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
  
    if (searchTerm.trim() !== '') {
      const filteredItems = allItems.filter(item => item.name.toLowerCase().includes(searchTerm));
      displayItems(filteredItems);
    } else {
      document.getElementById('items').innerHTML = ''; // Clear items if search term is empty
    }
  }
  
  // Event listener for search input
  document.getElementById('search').addEventListener('input', searchItems);
  
  // Initial display of all items
  fetchData().then(allItems => displayItems(allItems));
  