const villagerSelect = document.getElementById('villagerSelect');
const likesList = document.getElementById('likesList');
const lovesList = document.getElementById('lovesList');

// Load villagers from JSON
fetch('villagers.json')
    .then(response => response.json())
    .then(villagers => {
        for (const villager in villagers) {
            const option = document.createElement('option');
            option.value = villager;
            option.textContent = villager.charAt(0).toUpperCase() + villager.slice(1);
            villagerSelect.appendChild(option);
        }
    });

villagerSelect.addEventListener('change', () => {
    const selectedVillager = villagerSelect.value;
    if (selectedVillager) {
        const villager = villagers[selectedVillager];
        likesList.innerHTML = '';
        lovesList.innerHTML = '';

        for (const like of villager.likes) {
            const li = document.createElement('li');
            li.textContent = like;
            likesList.appendChild(li);
        }

        for (const love of villager.loves) {
            const li = document.createElement('li');
            li.textContent = love;
            lovesList.appendChild(li);
        }
    }
});
