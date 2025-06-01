import { models } from "@epfml/discojs";

/**
 * Loads the HellaSwag dataset from a .jsonl file as a Blob
 *
 * @param file - A Blob representing the HellaSwag dataset (.jsonl format)
 * @returns A fully loaded HellaSwagDataset
 */
export async function load(file: Blob): Promise<models.HellaSwagDataset> {
  // Read the file as text
  const text = await file.text();

  const lines = text.split('\n');
  const dataset: models.HellaSwagDataset = [];

  for (const line of lines) {
    if (line.trim() === "") continue;

    try {
      const data = JSON.parse(line.trim()) as models.HellaSwagExample;
      dataset.push(data);
    } catch (e) {
      console.error("Failed to parse line:", line);
      throw e;
    }
  }

  return dataset;
}
