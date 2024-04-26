// Function to generate the code block based on IDs and quantity
function generateCode() {
    const inputText = document.getElementById('inputTextArea').value.trim();
    const quantity = document.getElementById('quantityInput').value.trim(); // Get the quantity

    // Split the input text into an array of IDs (each line represents an ID)
    const idsArray = inputText.split('\n');

    // Construct the code block based on the IDs and quantity
    let generatedCode = '{$lua}\nif syntaxcheck then return end\n[ENABLE]\nlocal item = {\n';

    idsArray.forEach((id, index) => {
        generatedCode += `"${id}"`;
        if (index < idsArray.length - 1) {
            generatedCode += ',\n';
        }
    });

    generatedCode += `\n}\nTemplateAddToPlayer(item, ${quantity})\n[DISABLE]`;

    // Get the code display element or create one if not present
    let generatedCodeDiv = document.getElementById('generatedCode');
    if (!generatedCodeDiv) {
        generatedCodeDiv = document.createElement('pre');
        generatedCodeDiv.setAttribute('id', 'generatedCode');
        const columnRight = document.querySelector('.column-right');
        columnRight.appendChild(generatedCodeDiv);
    }

    // Update the content of the generated code
    generatedCodeDiv.textContent = generatedCode;

    // Create a button to copy the code to clipboard
    const copyButton = document.createElement('button');
    copyButton.textContent = 'Copy Code';
    copyButton.addEventListener('click', () => {
        copyToClipboard(generatedCode);
        copyButton.textContent = 'Copied!';
        setTimeout(() => {
            copyButton.textContent = 'Copy Code';
        }, 1500); // Change back to 'Copy Code' after 1.5 seconds
    });

    // Append the copy button below the generated code
    generatedCodeDiv.appendChild(copyButton);
}

// Function to copy text to clipboard
function copyToClipboard(text) {
    const el = document.createElement('textarea');
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
}

// Event listener for the button to generate code
document.addEventListener('DOMContentLoaded', function() {
    const generateButton = document.createElement('button');
    generateButton.textContent = 'Generate Code';
    generateButton.addEventListener('click', generateCode);

    const columnRight = document.querySelector('.column-right');

    // Create an input box for specifying quantity
    const quantityInput = document.createElement('input');
    quantityInput.setAttribute('type', 'number');
    quantityInput.setAttribute('id', 'quantityInput');
    quantityInput.setAttribute('placeholder', 'Enter quantity');
    columnRight.appendChild(quantityInput);

    // Line break to separate the input boxes
    columnRight.appendChild(document.createElement('br'));

    // Add the input box for IDs
    const inputTextArea = document.getElementById('inputTextArea');
    columnRight.appendChild(inputTextArea);
    
    // Add the generate button
    columnRight.appendChild(generateButton);
});
