// scripts/csv-to-json.js
import fs from 'fs';
import { parse } from 'csv-parse/sync';

const source = 'data/opportunities.csv';
const destination = 'src/opportunities.json';

const csv = fs.readFileSync(source, 'utf8');
const records = parse(csv, { columns: true, skip_empty_lines: true });

//if record contains any "" blank, remove the key
const filteredRecords = records.map(record => {
    return Object.fromEntries(
        Object.entries(record).filter(([_, value]) => value !== "")
    );
});

//verify that number of records is the same, if fails throw an error
if (filteredRecords.length !== records.length) {
    throw new Error(' > Number of records is not the same');
}
try {
    fs.writeFileSync(destination, JSON.stringify(filteredRecords, null, 2));
} catch (error) {
    throw new Error(' > Error writing JSON file ' + error);
}

console.log("\nVerifying generated JSON file...");

//verify that the json file is not empty
if (fs.readFileSync(destination, 'utf8').length === 0) {
    throw new Error(' > JSON file is empty');
} else {
    console.log(' > JSON file is generated successfully');
}


//verify that the json file is valid
const json = JSON.parse(fs.readFileSync(destination, 'utf8'));
if (!Array.isArray(json)) {
    throw new Error(' > JSON file is not valid');
} else {
    console.log(' > JSON file is valid');
}

// verify number of records is the same
if (json.length !== records.length) {
    throw new Error(' > Number of records is not the same');
} else {
    console.log(' > Number of records is the same');
}

console.log(' > CSV to JSON conversion successful');
