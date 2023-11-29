function generateCode() {
    var inputData = document.getElementById('inputData').value;

    // Splitting the input data by line breaks
    var lines = inputData.split('\n');
    
    var output = [];

    lines.forEach(function(line) {
        // Extracting id and name from each line
        var parts = line.split('--');
        if (parts.length === 2) {
            var id = parts[0].trim().replace(/"/g, ''); // Removing quotes from ID
            var idAndName = parts[1].trim().split('(');

            if (idAndName.length === 2) {
                var name = idAndName[1].replace(')', '').trim(); // Extracting the name inside parentheses

                // Creating the object and pushing it into the output array
                var obj = {
                    "id": id.endsWith(',') ? id.slice(0, -1) : id, // Remove trailing comma from ID if present
                    "name": name
                };
                output.push(obj);
            } else {
                console.error('Invalid data format in line:', line);
            }
        } else {
            console.error('Invalid data format in line:', line);
        }
    });

    // Displaying the generated code
    var outputCode = JSON.stringify(output, null, 2);
    document.getElementById('outputCode').innerText = outputCode;

    // Storing the generated code in a variable accessible globally
    window.generatedCode = outputCode;
}

function copyToClipboard() {
    if (!window.generatedCode) {
        console.error('No generated code found.');
        return;
    }

    // Create a temporary textarea element to copy the content to clipboard
    var textarea = document.createElement("textarea");
    textarea.textContent = window.generatedCode;
    document.body.appendChild(textarea);

    // Copy the generated code to clipboard
    textarea.select();
    document.execCommand('copy');

    // Remove the temporary textarea
    document.body.removeChild(textarea);

    alert("Copied to clipboard!");
}
