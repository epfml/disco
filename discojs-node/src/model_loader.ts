import fs from "node:fs/promises";

import type { models, DataType } from "@epfml/discojs";
import { serialization } from "@epfml/discojs";

export async function saveModelToDisk(
  model: models.Model<DataType>,
  modelFolder: string,
  modelFileName: string,
): Promise<void> {
  const encoded = await serialization.model.encode(model);

  await fs.mkdir(modelFolder, { recursive: true });
  await fs.writeFile(`${modelFolder}/${modelFileName}`, encoded);
}

export async function loadModelFromDisk(
  modelPath: string,
): Promise<models.Model<DataType>> {
  const content = await fs.readFile(modelPath);

  return await serialization.model.decode(content);
}
