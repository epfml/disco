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
): StandardizationStats {
  const means: Record<string, number> = {};
  const stds: Record<string, number> = {};

  for (const col of columns) {
    const values = rows.map((row) => {
      const rawValue = extractColumn(row, col);
      return convertToNumber(rawValue !== "" ? rawValue : "0");
    });
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance =
      values.reduce((acc, val) => acc + (val - mean) ** 2, 0) / values.length;

    const std = Math.sqrt(variance);

    means[col] = mean;
    stds[col] = std;
  }

  return { means, stds };
}

/**
 * Apply standardization for a single value
 */
export function standardizeValue(
  value: number,
  mean: number,
  std: number,
): number {
  if (std == 0) return 0; // avoid divide by 0
  return (value - mean) / std;
}

/**
 * Apply one hot encoding for a row
 *
 * One hot encoding function is called for each row in dataset
 */
export function oneHotEncode(
  value: string,
  categories: Array<string>,
): Array<number> {
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
    const raw = extractColumn(row, column);
    const categories = categoricalColumns[column];

    // If the column exists in the list of categorical columns, apply one hot encoding
    if (categories !== undefined) {
      return oneHotEncode(raw, categories);
    }

    // If the column is numerical column, apply standardization
    const value = convertToNumber(raw !== "" ? raw : "0");

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
