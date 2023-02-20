import * as path from 'node:path'

import { type Path, type TaskID } from '@epfml/discojs-node'
import * as url from 'url'

export class Config {
  public readonly serverUrl: URL
  public readonly useDatabase: boolean

  constructor (
    // File system saving scheme (URL-like).
    public readonly savingScheme: string,

    // Directory containing all the generated task models files.
    public readonly modelsDir: Path,

    // port to bind the server to
    public readonly serverPort: number
  ) {
    const url = new URL('http://localhost')
    url.port = `${serverPort}`
    this.serverUrl = url
    this.useDatabase = process.env.USE_DATABASE?.toLowerCase() === 'true' ?? true
  }

  // Directory for the given task
  public modelDir (taskID: TaskID): Path {
    return path.join(this.modelsDir, taskID)
  }

  // JSON file containing all model metadata.
  public modelFile (taskID: TaskID): Path {
    return path.join(this.modelDir(taskID), 'model.json')
  }

  // Bin file containing all model weights metadata.
  public modelWeights (taskID: TaskID): Path {
    return path.join(this.modelDir(taskID), 'weights.bin')
  }
}

const ROOT_DIR = path.join(url.fileURLToPath(import.meta.url), '..', '..', '..')

export const CONFIG = new Config(
  'file://',
  path.join(ROOT_DIR, 'server', 'models'),
  8080
)
