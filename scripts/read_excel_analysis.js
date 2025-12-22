
import * as xlsx from 'xlsx';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Since we are likely in a module environment given vite, or maybe commonjs.
// package.json doesn't say "type": "module", so it defaults to CommonJS.
// But to be safe let's use standard require if it's commonJS or import if module.
// Actually, looking at vite.config.ts, it's TS project.
// But I want to run this quickly with node.

// Let's assume CommonJS for simplicity unless "type": "module" is set, which it isn't in the package.json shown.
// Wait, the file I am writing is .js.

const fs = require('fs');
const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, '..', "DRAFT - KPI's MANUTENTION ET AGRICULTURE 2026__Digitalisation.xlsx");

console.log(`Reading file: ${filePath}`);

try {
    const workbook = XLSX.readFile(filePath);
    console.log('Workbook Sheets:', workbook.SheetNames);

    workbook.SheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const sheet = workbook.Sheets[sheetName];
        // Convert to JSON to see data easily
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // array of arrays

        // Print first 10 rows
        const rowsToShow = data.slice(0, 10);
        console.log(JSON.stringify(rowsToShow, null, 2));
    });

} catch (err) {
    console.error('Error reading excel file:', err);
}
