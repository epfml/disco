import { data, Disco, fetchTasks, Task } from '@epfml/discojs-node'

import { startServer } from './start_server'
import { loadData } from './birds_data'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser (url: URL, task: Task, dataset: data.DataSplit): Promise<void> {
  // Start federated training
  const disco = new Disco(task, { url })
  // const data = dataset.train.preprocess().batch()
  // const subsetGen = data.dataset.take(5)
  // const subsetArr = await subsetGen.toArray() 
  await disco.fit(dataset)

  // Stop training and disconnect from the remote server
  await disco.close()
}

async function main (): Promise<void> {
  
  const [server, serverUrl] = await startServer()
  const tasks = await fetchTasks(serverUrl)
  
  // Choose your task to train
  const task = tasks.get('ppnet') as Task

  const dataset = await loadData(task)

  // const data = dataset.train.preprocess().batch()
  // const subsetGen = data.dataset.take(5)
  // const subsetArr = await subsetGen.toArray()
  // Add more users to the list to simulate more clients
  await Promise.all([
    runUser(serverUrl, task, dataset),
    runUser(serverUrl, task, dataset)
  ])

  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main().catch(console.error)
