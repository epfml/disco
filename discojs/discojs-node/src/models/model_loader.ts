import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import { serialization, models } from '@epfml/discojs-core'

export async function saveModelToDisk(model: models.Model, modelFolder: string, modelFileName: string): Promise<void> {
  try {
    if (!fs.existsSync(modelFolder)) {
      await fs.mkdirSync(modelFolder)
    }
  } catch (err) {
    console.error(err);
  }
  const encoded = await serialization.model.encode(model)
  await fsPromises.writeFile(`${modelFolder}/${modelFileName}`, encoded)
}

export async function loadModelFromDisk(modelPath: string): Promise<models.Model> {
  if (!fs.existsSync(modelPath)) {
    throw new Error(`File ${modelPath} doesn't exist`)
  }
  const content = await fsPromises.readFile(modelPath)
  return await serialization.model.decode(content) as models.GPT
}