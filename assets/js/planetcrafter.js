document.addEventListener('DOMContentLoaded', function () {
    const select = document.getElementById('categories'); // Check the ID here
    const quantityInput = document.getElementById('quantity');
    const generateButton = document.getElementById('generateButton');
    const shoppingList = document.getElementById('shoppingList');

    if (!select || !quantityInput || !generateButton || !shoppingList) {
        console.error('One or more elements not found in the DOM.');
        return;
    }

    let buildingsData;
    let materialsData;

    // Fetch data from JSON files
    Promise.all([
        fetch('https://banrigaming.github.io/assets/json/pcbuildings.json').then(response => response.json()),
        fetch('https://banrigaming.github.io/assets/json/pcmaterials.json').then(response => response.json())
    ])
    .then(data => {
        [buildingsData, materialsData] = data;
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

        if (!isNaN(quantity) && quantity > 0 && buildingsData) {
            const buildingData = buildingsData.find(building => building.name === selectedBuilding);

            if (buildingData) {
                generateShoppingList(buildingData, quantity);
            }
        }
    });

    function generateShoppingList(buildingData, quantity) {
        const basicMaterials = materialsData.basicMaterials;
        console.log("Selected building:", buildingData.name); // Add this line for debugging
        const advancedMaterials = materialsData.advancedMaterials[buildingData.name];
    
        const materialsList = document.createElement('div');
        materialsList.innerHTML = `<h3>Materials for ${quantity} ${buildingData.name}:</h3>`;
    
        for (const material in advancedMaterials) {
            const materialQuantity = advancedMaterials[material] * quantity;
            const materialItem = document.createElement('p');
            materialItem.textContent = `- ${material}: ${materialQuantity} units (${advancedMaterials[material]} per ${buildingData.name} x ${quantity} ${buildingData.name})`;
    
            const basicMaterialsForItem = getBasicMaterialsForItem(material, materialQuantity);
            if (basicMaterialsForItem.length > 0) {
                const basicMaterialsList = document.createElement('p');
                basicMaterialsList.textContent = `    Basic Materials for ${material}: ${basicMaterialsForItem.join(', ')}`;
                materialItem.appendChild(basicMaterialsList);
            }
    
            materialsList.appendChild(materialItem);
        }
    
        const totalPowerUsage = parseFloat(buildingData.PowerUsage) * quantity;
        const totalProduction = calculateTotalProduction(buildingData, quantity);
    
        const powerUsage = document.createElement('p');
        powerUsage.textContent = `Total Power Usage: ${totalPowerUsage.toFixed(2)} kW/s`;
        const production = document.createElement('p');
        production.textContent = `Total Production: ${totalProduction}`;
    
        materialsList.appendChild(powerUsage);
        materialsList.appendChild(production);
    
        shoppingList.innerHTML = '';
        shoppingList.appendChild(materialsList);
    }
    
    function getBasicMaterialsForItem(material, quantity) {
        const requiredMaterials = [];
        for (const mat in basicMaterials) {
            if (materialsData.advancedMaterials.hasOwnProperty(mat) && materialsData.advancedMaterials[mat].hasOwnProperty(material)) {
                const requiredQuantity = materialsData.advancedMaterials[mat][material] * quantity;
                if (basicMaterials[mat] < requiredQuantity) {
                    requiredMaterials.push(`${requiredQuantity - basicMaterials[mat]} ${mat}`);
                }
            }
        }
        return requiredMaterials;
    }
    
    function calculateTotalProduction(buildingData, quantity) {
        let totalProduction = '';
        if (buildingData.Heat) {
            totalProduction += `Heat: ${parseFloat(buildingData.Heat) * quantity} `;
        }
        if (buildingData.Oxygen) {
            totalProduction += `Oxygen: ${buildingData.Oxygen.replace(' ppq/s', '') * quantity} `;
        }
        if (buildingData.Pressure) {
            totalProduction += `Pressure: ${buildingData.Pressure.replace(' nPa/s', '') * quantity} `;
        }
        return totalProduction.trim();
    }
});
