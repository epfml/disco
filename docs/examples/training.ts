import fs from 'node:fs/promises'

import type { data, Task } from '@epfml/discojs'
import { Disco, fetchTasks, defaultTasks } from '@epfml/discojs'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'
import { startServer } from 'server'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser (url: URL, task: Task, dataset: data.DataSplit): Promise<void> {
  // Create Disco object associated with the server url, the training scheme
  const disco = new Disco(task, { url, scheme: 'federated' })

  // Run training on the dataset
  for await (const round of disco.fit(dataset))
    for await (const epoch of round)
      for await (const _ of epoch);

  // Disconnect from the remote server
  await disco.close()
}

async function main (): Promise<void> {
  // Arbitrary chosen Task ID
  const NAME: string = 'titanic'

  // Launch a server instance
  const [server, url] = await startServer()

  // Get all pre-defined tasks
  const tasks = await fetchTasks(url)

  // Choose the task and load local data
  // Make sure you first ran ./get_training_data
  let task: Task | undefined
  let dataset: data.DataSplit
  switch (NAME) {
    case 'titanic': {
      task = tasks.get('titanic')
      if (task === undefined) { throw new Error('task not found') }
      dataset = await loadTitanicData(task)
      break
    }
    case 'simple_face': {
      task = tasks.get('simple_face')
      if (task === undefined) { throw new Error('task not found') }
      dataset = await loadSimpleFaceData(task)
      break
    }
    default:
      throw new Error('task id not found')
  }

  // Add more users to the list to simulate more than 3 clients
  await Promise.all([
    runUser(url, task, dataset),
    runUser(url, task, dataset),
    runUser(url, task, dataset)
  ])

  // Close server
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

async function filesFromFolder (dir: string, folder: string): Promise<string[]> {
  const f = await fs.readdir(dir + folder)
  return f.map(file => dir + folder + '/' + file)
}

async function loadSimpleFaceData (task: Task): Promise<data.DataSplit> {
  const dir = '../../datasets/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  const youngFiles = (await Promise.all(youngFolders.map(async folder => await filesFromFolder(dir, folder)))).flat()
  const oldFiles = (await Promise.all(oldFolders.map(async folder => await filesFromFolder(dir, folder)))).flat()

  const filesPerFolder = [youngFiles, oldFiles]

  const labels = filesPerFolder.flatMap((files, index) => Array<string>(files.length).fill(`${index}`))
  const files = filesPerFolder.flat()

  return await new NodeImageLoader(task).loadAll(files, { labels })
}

async function loadTitanicData (task: Task): Promise<data.DataSplit> {
  const files = ['../../datasets/titanic_train.csv']
  const titanicTask = defaultTasks.titanic.getTask()
  return await new NodeTabularLoader(task, ',').loadAll(files, {
    features: titanicTask.trainingInformation.inputColumns,
    labels: titanicTask.trainingInformation.outputColumns,
    shuffle: false
  })
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
