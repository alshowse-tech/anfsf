import * as fs from 'fs';

export interface CSVRow {
  [key: string]: string;
}

export async function readCSV(filePath: string): Promise<CSVRow[]> {
  const data: string = await fs.promises.readFile(filePath, 'utf-8');
  const lines: string[] = data.trim().split('\n');
  
  if (lines.length === 0) {
    return [];
  }

  const headers: string[] = lines[0].split(',').map(header => header.trim());
  const rows: CSVRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values: string[] = lines[i].split(',').map(value => value.trim());
    if (values.length !== headers.length) {
      throw new Error(`Row ${i + 1} has ${values.length} values, expected ${headers.length}`);
    }
    const row: CSVRow = {};
    headers.forEach((header, index) => {
      row[header] = values[index];
    });
    rows.push(row);
  }

  return rows;
}