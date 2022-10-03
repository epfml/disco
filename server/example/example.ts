import { node, client as clients, informant, ConsoleLogger, training, TrainingSchemes, EmptyMemory } from '@epfml/discojs-node'

import { loadData } from './data'
import { startServer } from './start_server'

const TASK = node.tasks.simple_face.task

/*  Example of discojs API, we load data, build the appropriate loggers, the disco object
  *  and finally start training.
  */
async function runUser (url: URL): Promise<void> {
  // Load the data, the dataset must be of type dataset.Data, see discojs import above.
  const data = await loadData(TASK)

  // Build a logger
  const logger = new ConsoleLogger()

  // Build empty memory (if in browser discojs can leverage IndexDB)
  const memory = new EmptyMemory()
  // Training information logger
  const ti = new informant.FederatedInformant(TASK.taskID, 10)

  // Build federated client (add server URL and TASK object specific to training task)
  const client = new clients.federated.Client(url, TASK)
  await client.connect()

  // Build disco object, other available training schemes: TrainingSchemes.DECENTRALIZED, TrainingSchemes.LOCAL
  const disco = new training.Disco(TASK, logger, memory, TrainingSchemes.FEDERATED, ti, client)

  // Start training
  await disco.startTraining(data)
}

async function main (): Promise<void> {
  const [server, addr] = await startServer()
  const url = new URL('', `http://${addr}`)

  // Add more users to the list to simulate more clients
  await Promise.all([
    runUser(url),
    runUser(url)
  ])

  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main().catch(console.error)
