import fs from 'fs'
import http from 'node:http'
import { node, data, Disco, fetchTasks, Task, TrainingSchemes, defaultTasks } from '@epfml/discojs-node'
import { Disco as DiscoServer } from '@epfml/disco-server'

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

function filesFromFolder (dir: string, folder: string): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.map(file => dir + folder + '/' + file)
}

async function loadSimpleFaceData (task: Task): Promise<data.DataSplit> {
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

async function loadTitanicData (task: Task): Promise<data.DataSplit> {
  const files = ['../../example_training_data/titanic_train.csv']
  const titanicTask = defaultTasks.titanic.getTask()
  return await new node.data.NodeTabularLoader(task, ',').loadAll(files, {
    features: titanicTask.trainingInformation.inputColumns,
    labels: titanicTask.trainingInformation.outputColumns,
    shuffle: false
  })
}

async function startServer (): Promise<[http.Server, URL]> {
  const uninit_server = new DiscoServer()
  await uninit_server.addDefaultTasks()

  const server: http.Server = uninit_server.serve(8000)
  await new Promise((resolve, reject) => {
    server.once('listening', resolve)
    server.once('error', reject)
    server.on('error', console.error)
  })

  let addr: string
  const rawAddr = server.address()
  if (rawAddr === null) {
    throw new Error('unable to get server address')
  } else if (typeof rawAddr === 'string') {
    addr = rawAddr
  } else if (typeof rawAddr === 'object') {
    if (rawAddr.family === '4') {
      addr = `${rawAddr.address}:${rawAddr.port}`
    } else {
      addr = `[${rawAddr.address}]:${rawAddr.port}`
    }
  } else {
    throw new Error('unable to get address to server')
  }

  return [server, new URL('', `http://${addr}`)]
}


// You can run this example with "npm start" from this folder
main().catch(console.error)
