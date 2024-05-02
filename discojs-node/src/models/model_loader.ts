import fs from 'node:fs/promises'
import { serialization, models } from '@epfml/discojs'

export async function saveModelToDisk(model: models.Model, modelFolder: string, modelFileName: string): Promise<void> {
  try {
    await fs.access(modelFolder)
  } catch {
    await fs.mkdir(modelFolder)
  }
  const encoded = await serialization.model.encode(model)
  await fs.writeFile(`${modelFolder}/${modelFileName}`, encoded)
}

export async function loadModelFromDisk(modelPath: string): Promise<models.Model> {
  const content = await fs.readFile(modelPath)
  return await serialization.model.decode(content) as models.GPT
}
