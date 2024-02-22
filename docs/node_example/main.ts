import { data, Disco, fetchTasks, Task, TrainingSchemes } from '@epfml/discojs-node'
import { loadTitanicData } from './data'
import { startServer } from './server'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser (url: URL, task: Task, dataset: data.DataSplit): Promise<void> {
  // Create Disco object associated with the server url, the training scheme
  const disco = new Disco(task, { url, scheme: TrainingSchemes.FEDERATED })
  await disco.fit(dataset) // Start training on the dataset

  // Stop training and disconnect from the remote server
  await disco.close()
}

async function main (): Promise<void> {
  // Launch a server instance
  const [server, serverUrl] = await startServer()
  // Get all pre-defined tasks
  const tasks = await fetchTasks(serverUrl)
  // Choose the task and load local data
  const task = tasks.get('titanic') as Task // Choose the Titanic task to train
  const dataset = await loadTitanicData(task) // Make sure you first ran ./get_training_data
  // Alternatively:
  // const task = tasks.get('simple_face') as Task
  // const dataset = await loadSimpleFace(task) // you will have to import { loadSimpleFace} from './data'

  // Add more users to the list to simulate more than 3 clients
  await Promise.all([
    runUser(serverUrl, task, dataset),
    runUser(serverUrl, task, dataset),
    runUser(serverUrl, task, dataset)
  ])

  console.log('Shutting down the server...')
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
