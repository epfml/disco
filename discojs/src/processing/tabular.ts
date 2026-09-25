import type { List } from "immutable";

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
 * Whether a CSV cell should be considered as missing data
 *
 * Absent, blank and "NaN" cells are missing.
 */
export function isMissingValue(raw: string | undefined): boolean {
  if (raw === undefined) return true;

  const trimmed = raw.trim();
  return trimmed === "" || trimmed.toLowerCase() === "nan";
}

/**
 * Return the named field of an object with string values
 *
 * @throws if the named field isn't there or is missing data
 */
export function extractValue(
  row: Partial<Record<string, string>>,
  column: string,
): string {
  const raw = extractColumn(row, column);
  if (isMissingValue(raw))
    throw new Error(`missing value in column "${column}"`);
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
 *
 * Rows are streamed in a single pass (Welford's algorithm)
 * so that the dataset doesn't need to fit in memory.
 *
 * @throws if there is no row or a value is missing
 */
export async function computeStandardizationStats(
  rows: AsyncIterable<Partial<Record<string, string>>>,
  columns: Array<string>,
): Promise<StandardizationStats> {
  // running mean of each column
  const means: Record<string, number> = {};
  // running sum of squared differences from the mean of each column
  const squaredDiffSums: Record<string, number> = {};
  for (const col of columns) {
    means[col] = 0;
    squaredDiffSums[col] = 0;
  }

  let count = 0;
  for await (const row of rows) {
    count++;

    for (const col of columns) {
      const value = convertToNumber(extractValue(row, col));
      const mean = means[col] ?? 0;
      // m_n = m_{n-1} + (x_n - m_{n-1}) / n
      // each value moves the mean towards itself by 1/n of the gap
      const delta = value - mean;
      const updatedMean = mean + delta / count;

      means[col] = updatedMean;
      // gap to the previous mean times gap to the updated mean,
      // summed over the rows it equals the sum of (x - final mean)²
      squaredDiffSums[col] =
        (squaredDiffSums[col] ?? 0) + delta * (value - updatedMean);
    }
  }

  // mean and std are undefined without any row
  if (count === 0)
    throw new Error("unable to compute standardization statistics: no rows");

  const stds: Record<string, number> = {};
  for (const col of columns)
    stds[col] = Math.sqrt((squaredDiffSums[col] ?? 0) / count);

  return { means, stds };
}

/**
 * Apply standardization for a single value
 */
function standardizeValue(value: number, mean: number, std: number): number {
  if (std == 0) return 0; // avoid divide by 0
  return (value - mean) / std;
}

/**
 * Apply one hot encoding for a row
 *
 * One hot encoding function is called for each row in dataset
 */
function oneHotEncode(value: string, categories: Array<string>): Array<number> {
  // Get the index of the value among the possible categories
  const index = categories.indexOf(value);

  // If the value does not exist, raise an error
  if (index === -1) {
    throw new Error(`"${value}" is not a valid category for this column`);
  }

  return categories.map((_, categoryIndex) =>
    categoryIndex === index ? 1 : 0,
  );
}

/**
 * Apply standardization for numerical columns and
 * apply one hot encoding for categorical columns and return the final row
 */
export function encodeTabularRow(
  row: Partial<Record<string, string>>,
  inputColumns: Array<string>,
  categoricalColumns: Record<string, Array<string>>,
  stats?: StandardizationStats,
): Array<number> {
  const outputRow = inputColumns.flatMap((column) => {
    const raw = extractValue(row, column);
    const categories = categoricalColumns[column];

    // If the column exists in the list of categorical columns, apply one hot encoding
    if (categories !== undefined) {
      return oneHotEncode(raw, categories);
    }

    // If the column is numerical column, apply standardization
    const value = convertToNumber(raw);

    if (stats === undefined) {
      return [value];
    }

    const mean = stats.means[column];
    const std = stats.stds[column];

    // Raise an error when stats is not defined
    if (mean === undefined || std === undefined) {
      throw new Error(
        `Standardization statistics is not defined for column ${column}`,
      );
    }

    return [standardizeValue(value, mean, std)];
  });

  return outputRow;
}
