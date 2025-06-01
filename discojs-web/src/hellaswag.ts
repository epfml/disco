import { models } from "@epfml/discojs";

/**
 * Loads the HellaSwag dataset from a .jsonl file as a Blob (browser version).
 *
 * @param file - A Blob representing the HellaSwag dataset (.jsonl format)
 * @returns A fully loaded HellaSwagDataset
 */
/**
 * Loads the HellaSwag dataset from a .jsonl file as a Blob or Buffer.
 *
 * @param file - A Blob or Buffer representing the HellaSwag dataset (.jsonl format)
 * @returns A fully loaded HellaSwagDataset
 */
export async function load(file: Blob | Buffer): Promise<models.HellaSwagDataset> {
  console.log("loader got file:", file);
  console.log("Has .text() method?", typeof (file as any).text);

  let text: string;

  if (typeof (file as Blob).text === 'function') {
    // Browser Blob
    text = await (file as Blob).text();
  } else if (file instanceof Buffer) {
    // Node.js Buffer
    text = file.toString('utf-8');
  } else {
    throw new Error("Unsupported file type provided to load() function");
  }

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