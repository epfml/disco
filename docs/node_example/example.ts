import { data, Disco, fetchTasks, Task } from '@epfml/discojs-node'
import { loadTitanicData } from './data'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser (url: URL, task: Task, dataset: data.DataSplit): Promise<void> {
  // Start federated training
  const disco = new Disco(task, { url })
  await disco.fit(dataset)

  // Stop training and disconnect from the remote server
  await disco.close()
}

async function main (): Promise<void> {
  
  // First have a server instance running before running this script
  const serverUrl = new URL('http://localhost:8080/')

  const tasks = await fetchTasks(serverUrl)
  
  // Choose your task to train
  const task = tasks.get('titanic') as Task

  const dataset = await loadTitanicData(task)

  // Add more users to the list to simulate more clients
  await Promise.all([
    runUser(serverUrl, task, dataset),
    runUser(serverUrl, task, dataset),
    runUser(serverUrl, task, dataset),
  ])
}

main().catch(console.error)
