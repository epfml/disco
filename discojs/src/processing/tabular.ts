import { List } from "immutable";

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
