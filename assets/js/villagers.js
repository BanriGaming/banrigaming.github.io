const villagerSelect = document.getElementById('villagerSelect');
const likesList = document.getElementById('likesList');
const lovesList = document.getElementById('lovesList');

fetch('villagers.json')
  .then(response => response.json())
  .then(data => {
    for (const villager in data) {
      const option = document.createElement('option');
      option.value = villager;
      option.textContent = capitalizeFirstLetter(villager);
      villagerSelect.appendChild(option);
    }
  });

villagerSelect.addEventListener('change', function() {
  const selectedVillager = villagerSelect.value;
  const selectedVillagerData = villagers[selectedVillager];

  likesList.innerHTML = '';
  lovesList.innerHTML = '';

  selectedVillagerData.likes.forEach(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    likesList.appendChild(listItem);
  });

  selectedVillagerData.loves.forEach(item => {
    const listItem = document.createElement('li');
    listItem.textContent = item;
    lovesList.appendChild(listItem);
  });
});

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1);
}
