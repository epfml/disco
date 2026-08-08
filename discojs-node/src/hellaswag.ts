import path from "node:path";
import fetch from "node-fetch";
import fs from "node:fs/promises";

import type {
  HellaSwagExample,
  HellaSwagDataset} from "@epfml/discojs";
import {
  HELLASWAG_URL
} from "@epfml/discojs";

import { dirname } from "path";
import { fileURLToPath } from "url";
const __dirname = dirname(fileURLToPath(import.meta.url));

const DATASET_DIR = path.join(__dirname, "..", "..", "datasets");
const hellaswag_filepath = path.join(DATASET_DIR, "hellaswag_val.jsonl");

/**
 * Loads the HellaSwag dataset from the remote URL in Node.js
 *
 * @param limit - Maximum number of examples to load (-1 means all)
 * @returns A HellaSwagDataset containing the examples.
 */
export async function load(limit = -1): Promise<HellaSwagDataset> {
  let text: string;
  try {
    // Reads the file if it exists locally
    text = (await fs.readFile(hellaswag_filepath)).toString();
  } catch {
    console.log("Downloading the Hellaswag benchmark");
    // Otherwise fetch it
    const response = await fetch(HELLASWAG_URL);
    if (!response.ok) {
      throw new Error(
        `Failed to fetch dataset from ${HELLASWAG_URL}: ${response.statusText}`,
      );
    }

    text = await response.text();
    // Save the file locally
    await fs.writeFile(hellaswag_filepath, text);
  }

  const lines = text.split("\n");

  const dataset: HellaSwagDataset = [];
  let count = 0;
  for (const line of lines) {
    if (line.trim().length === 0) continue;
    if (limit !== -1 && count >= limit) break;

    try {
      const data = JSON.parse(line.trim()) as HellaSwagExample;
      dataset.push(data);
      count++;
    } catch (e) {
      console.error(`Failed to parse line:`, line);
      throw e;
    }
  }

  return dataset;
}
