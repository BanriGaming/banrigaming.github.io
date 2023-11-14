document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('buildings');
    const shoppingList = document.getElementById('shoppingList');
    const generateButton = document.getElementById('generateButton');

    let buildingsData;
    let materialsData;

    // Fetch data from JSON files
    fetch('https://banrigaming.github.io/assets/json/pcbuildings.json')
        .then(response => response.json())
        .then(data => {
            buildingsData = data;
            populateDropdown(data);
        });

    fetch('https://banrigaming.github.io/assets/json/pcmaterials.json')
        .then(response => response.json())
        .then(data => {
            materialsData = data;
        });

    function populateDropdown(data) {
        data.forEach(building => {
            const option = document.createElement('option');
            option.value = building.name;
            option.textContent = building.name;
            select.appendChild(option);
        });
    }

    generateButton.addEventListener('click', function () {
        const selectedBuilding = select.value;
        const quantity = document.getElementById('quantity').valueAsNumber;

        const buildingData = buildingsData.find(building => building.name === selectedBuilding);

        if (buildingData) {
            const basicMaterials = materialsData.basicMaterials;
            const totalMaterials = materialsData.advancedMaterials[selectedBuilding];

            for (const material in totalMaterials) {
                totalMaterials[material] *= quantity;
                if (basicMaterials.hasOwnProperty(material)) {
                    basicMaterials[material] = totalMaterials[material];
                    delete totalMaterials[material];
                }
            }

            displayShoppingList(basicMaterials, totalMaterials, quantity, buildingData);
        }
    });

    function displayShoppingList(basicMaterials, totalMaterials, quantity, buildingData) {
        shoppingList.innerHTML = ''; // Clear previous content

        const listHeader = document.createElement('h3');
        listHeader.textContent = 'Shopping List:';
        shoppingList.appendChild(listHeader);

        const basicMaterialsHeader = document.createElement('p');
        basicMaterialsHeader.textContent = 'Basic Materials:';
        shoppingList.appendChild(basicMaterialsHeader);

        for (const material in basicMaterials) {
            const materialItem = document.createElement('p');
            materialItem.textContent = `${material}: ${basicMaterials[material]} units`;
            shoppingList.appendChild(materialItem);
        }

        const advancedMaterialsHeader = document.createElement('p');
        advancedMaterialsHeader.textContent = 'Advanced Materials:';
        shoppingList.appendChild(advancedMaterialsHeader);

        for (const material in totalMaterials) {
            const materialItem = document.createElement('p');
            materialItem.textContent = `${material}: ${totalMaterials[material]} units`;
            shoppingList.appendChild(materialItem);
        }

        if (buildingData['PowerUsage']) {
            const powerUsage = document.createElement('p');
            powerUsage.textContent = `Total Power Usage: ${buildingData['PowerUsage'] * quantity}`;
            shoppingList.appendChild(powerUsage);
        }
        if (buildingData['PowerProduction']) {
            const production = document.createElement('p');
            production.textContent = `Total Production: ${buildingData['PowerProduction'] * quantity}`;
            shoppingList.appendChild(production);
        }
    }
});
