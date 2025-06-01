import type { models } from '@epfml/discojs';
import fs from 'fs';
import * as readline from 'readline';

/**
 * Loads the entire HellaSwag dataset from a local file.
 * @returns A HellaSwagDataset containing all examples.
 */
export async function load(path: string): Promise<models.HellaSwagDataset> {
  const dataset: models.HellaSwagDataset = [];

  const fileStream = fs.createReadStream(path, 'utf-8');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  for await (const line of rl) {
    if (line.trim().length === 0) continue;
    try {
      const data = JSON.parse(line.trim()) as models.HellaSwagExample;
      dataset.push({ ctx: data.ctx, endings: data.endings, label: data.label });
    } catch (e) {
      console.error(`Failed to parse line:`, line);
      throw e;
    }
  }

  return dataset;
}