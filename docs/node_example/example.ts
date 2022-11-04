import { Disco, tasks } from '@epfml/discojs-node'

import { loadData } from './data'
import { startServer } from './start_server'

const TASK = tasks.simple_face.task

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser (url: URL): Promise<void> {
  // Load the data, the dataset must be of type dataset.Data, see discojs import above.
  const data = await loadData(TASK)

  // Start federated training
  const disco = new Disco(TASK, { url })
  await disco.fit(data)

  // Stop training and disconnect from the remote server
  await disco.close()
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
