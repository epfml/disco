import fs from 'fs'
import { node, data, Task, defaultTasks } from '@epfml/discojs-node'

function filesFromFolder (dir: string, folder: string): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.map(file => dir + folder + '/' + file)
}

export async function loadSimpleFaceData (task: Task): Promise<data.DataSplit> {
  const dir = '../../example_training_data/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  const youngFiles = youngFolders.flatMap(folder => {
    return filesFromFolder(dir, folder)
  })

  const oldFiles = oldFolders.flatMap(folder => {
    return filesFromFolder(dir, folder)
  })

  const filesPerFolder = [youngFiles, oldFiles]

  const labels = filesPerFolder.flatMap((files, index) => Array(files.length).fill(index))
  const files = filesPerFolder.flat()

  return await new node.data.NodeImageLoader(task).loadAll(files, { labels: labels })
}

export async function loadTitanicData (task: Task): Promise<data.DataSplit> {
  const files = ['../../example_training_data/titanic_train.csv']
  const titanicTask = defaultTasks.titanic.getTask()
  return await new node.data.NodeTabularLoader(task, ',').loadAll(files, {
    features: titanicTask.trainingInformation.inputColumns,
    labels: titanicTask.trainingInformation.outputColumns,
    shuffle: false
  })
}
