import { Path, TaskID } from 'discojs'
import path from 'path'

export class Config {
  public readonly serverUrl: URL

  constructor (
    // File system saving scheme (URL-like).
    public readonly savingScheme: string,

    // Directory containing all task definition files.
    public readonly tasksDir: Path,

    // JSON file containing all tasks metadata.
    public readonly tasksFile: Path,
    // Directory containing all the generated task models files.
    public readonly modelsDir: Path,

    // port to bind the server to
    public readonly serverPort: number
  ) {
    const url = new URL('http://localhost')
    url.port = `${serverPort}`
    this.serverUrl = url
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

const ROOT_DIR = path.join(__filename, '..', '..', '..')

export const CONFIG = new Config(
  'file://',
  path.join(ROOT_DIR, 'discojs', 'tasks'),
  path.join(ROOT_DIR, 'discojs', 'tasks', 'tasks.json'),
  path.join(ROOT_DIR, 'server', 'models'),
  8080
)
