const XLSX = require('xlsx');
const fs = require('fs');

// Load Excel data
const workbook = XLSX.readFile('C:\\Users\\Darren\\Documents\\BanriGaming\\banrigaming.github.io\\assets\\files\\paliafurnlist.xlsx');

// Specify the sheet name you want to read
const sheetName = 'Homestead'; // Replace with the actual sheet name

// Read data from the specified sheet
const sheetData = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

// Write JSON to a file
fs.writeFileSync('output.json', JSON.stringify(sheetData, null, 2));
