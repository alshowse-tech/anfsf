import { readCSV } from './csvReader';

async function main(): Promise<void> {
  const filePath = './data/sample.csv';
  try {
    const rows = await readCSV(filePath);
    console.log('CSV Content:');
    rows.forEach((row, index) => {
      console.log(`Row ${index + 1}:`, row);
    });
  } catch (error) {
    console.error('Error reading CSV:', error);
  }
}

main();