import { List } from "immutable";

export type StandardizationStats = {
  means: Record<string, number>;
  stds: Record<string, number>;
};

/**
 * Convert a string to a number
 *
 * @throws if it isn't written as a number
 */
export function convertToNumber(raw: string): number {
  const num = Number.parseFloat(raw);
  if (Number.isNaN(num)) throw new Error(`unable to parse "${raw}" as number`);
  return num;
}

/**
 * Return the named field of an object with string values
 *
 * @throws if the named field isn't there
 */
export function extractColumn(
  row: Partial<Record<string, string>>,
  column: string,
): string {
  const raw = row[column];
  if (raw === undefined) throw new Error(`${column} not found in row`);
  return raw;
}

/**
 * Return the index of the element in the given list
 *
 * @throws if not found
 */
export function indexInList(
  element: string,
  elements: List<string> | Array<string>,
): number {
  const ret = elements.indexOf(element);
  if (ret === -1) throw new Error(`${element} not found in list`);
  return ret;
}

/**
 * Return the mean, std value of each column
 */
export function computeStandardizationStats(
  rows: Array<Partial<Record<string, string>>>,
  columns: Array<string>,
): StandardizationStats{
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const col of columns){
    const values = rows.map((row)=> convertToNumber(extractColumn(row, col)));
    const mean = values.reduce((a, b)=> a+b, 0) / values.length;
    const variance = values.reduce((acc, val) => acc + (val-mean)**2, 0) / values.length;

    const std = Math.sqrt(variance);

    means[col] = mean;
    stds[col] = std;
  }

  return {means, stds};
}

/**
 * Apply standardization for a single value
 */
export function standardizeValue(
  value: number,
  mean: number,
  std: number,
): number{
  if (std == 0) return 0; // avoid divide by 0
  return (value - mean) / std;
}

/**
 * Apply standardization for a row
 * 
 * standardization function is called for each row in dataset
 */
export function standardizeRow(
  row: Partial<Record<string, string>>,
  columns: Array<string>,
  stats: StandardizationStats,
): Array<number>{
  return columns.map((col) => {
    const value = convertToNumber(extractColumn(row, col));
    const mean = stats.means[col];
    const std = stats.stds[col];
    return standardizeValue(value, mean, std);
  })
}