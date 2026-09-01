import fs from "node:fs/promises";

import type { Model, DataType } from "@epfml/discojs";
import { modelEncode, modelDecode } from "@epfml/discojs";

export async function saveModelToDisk(
  model: Model<DataType>,
  modelFolder: string,
  modelFileName: string,
): Promise<void> {
  const encoded = await modelEncode(model);

  await fs.mkdir(modelFolder, { recursive: true });
  await fs.writeFile(`${modelFolder}/${modelFileName}`, encoded);
}

export async function loadModelFromDisk(
  modelPath: string,
): Promise<Model<DataType>> {
  const content = await fs.readFile(modelPath);

  return await modelDecode(content);
}
