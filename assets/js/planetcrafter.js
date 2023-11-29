document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('categories');
    const quantityInput = document.getElementById('quantity');
    const generateButton = document.getElementById('generateButton');
    const shoppingList = document.getElementById('shoppingList');

    let buildingsData;
    let materialsData;

    // Fetch data from JSON files
    Promise.all([
        fetch('https://banrigaming.github.io/assets/json/pcbuildings.json').then(response => response.json()),
        fetch('https://banrigaming.github.io/assets/json/pcmaterials.json').then(response => response.json())
    ])
    .then(data => {
        [buildingsData, materialsData] = data;
        console.log('Buildings data:', buildingsData);
        console.log('Materials data:', materialsData);
        populateDropdown(buildingsData);
    })
    .catch(error => console.error('Error fetching data:', error));

    function populateDropdown(data) {
        const select = document.getElementById('categories');
        if (!select) {
            console.error("Select element not found in DOM");
            return;
        }
    
        let currentCategory = null;
    
        data.forEach(building => {
            if (building.category !== currentCategory) {
                currentCategory = building.category;
                const categoryHeader = document.createElement('option');
                categoryHeader.textContent = `== ${currentCategory} ==`;
                categoryHeader.disabled = true;
                select.appendChild(categoryHeader);
            }
    
            const option = document.createElement('option');
            option.value = building.name;
            option.textContent = building.name;
            select.appendChild(option);
        });
    }

    generateButton.addEventListener('click', function () {
        const selectedBuilding = select.value;
        const quantity = parseInt(quantityInput.value);

        console.log('Selected Building:', selectedBuilding);
        console.log('Quantity:', quantity);

        if (!isNaN(quantity) && quantity > 0 && buildingsData && materialsData) {
            const buildingData = buildingsData.find(building => building.name === selectedBuilding);

            if (buildingData) {
                generateShoppingList(buildingData, quantity);
            } else {
                console.log('Building data not found for:', selectedBuilding);
            }
        } else {
            console.log('Invalid quantity or no building data available.');
        }
    });

    function generateShoppingList(buildingData, quantity) {
        console.log('Generating shopping list for:', buildingData.name);
        console.log('Quantity:', quantity);
        const advancedMaterials = buildingData.advancedMaterials || {};
        const materialsList = document.createElement('div');
        materialsList.innerHTML = `<h3>Materials for ${quantity} ${buildingData.name}:</h3>`;

        for (const materialName in advancedMaterials) {
            const materialQuantity = advancedMaterials[materialName] * quantity;
            const materialItem = document.createElement('p');
            materialItem.textContent = `- ${materialName}: ${materialQuantity} units (${advancedMaterials[materialName]} per ${buildingData.name} x ${quantity} ${buildingData.name})`;

            if (materialsData) {
                const materialInfo = materialsData.find(material => material.name === materialName);
                if (materialInfo && materialInfo.type === 'Advanced') {
                    if (materialInfo.materials) {
                        const basicMaterialsList = document.createElement('p');
                        basicMaterialsList.textContent = `    Basic Materials for ${materialName}: ${JSON.stringify(materialInfo.materials)}`;
                        materialItem.appendChild(basicMaterialsList);
                    } else if (materialInfo.qty) {
                        const basicMaterialsList = document.createElement('p');
                        basicMaterialsList.textContent = `    ${materialInfo.materials} for ${materialName}: ${materialInfo.qty}`;
                        materialItem.appendChild(basicMaterialsList);
                    }
                }
            }

            materialsList.appendChild(materialItem);
        }

        shoppingList.innerHTML = '';
        shoppingList.appendChild(materialsList);
        console.log('Shopping list generated.');
    }
});
