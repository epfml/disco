import { models } from '@epfml/discojs';
import fetch from 'node-fetch';

/**
 * Loads the HellaSwag dataset from the remote URL in Node.js
 * 
 * @param limit - Maximum number of examples to load (-1 means all)
 * @returns A HellaSwagDataset containing the examples.
 */
export async function load(limit = -1): Promise<models.HellaSwagDataset> {
  const response = await fetch(models.HELLASWAG_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch dataset from ${models.HELLASWAG_URL}: ${response.statusText}`);
  }

  const text = await response.text();
  const lines = text.split('\n');

  const dataset: models.HellaSwagDataset = [];
  let count = 0;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    if (limit !== -1 && count >= limit) break;

    try {
      const data = JSON.parse(line.trim()) as models.HellaSwagExample;
      dataset.push(data);
      count++;
    } catch (e) {
      console.error(`Failed to parse line:`, line);
      throw e;
    }
  }

  return dataset;
}
