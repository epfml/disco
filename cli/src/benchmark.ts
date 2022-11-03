import { Range } from 'immutable'
import { Server } from 'node:http'
import { tf, client as clients, Disco, TrainingSchemes, TrainerLog } from '@epfml/discojs-node'

import { startServer, getClient, saveLog } from './utils'
import { getTaskData } from './data'
import { args } from './args'

const NUMBER_OF_USERS = args.numberOfUsers
const TASK = args.task

const infoText = `\nRunning federated benchmark of ${TASK.taskID}`
console.log(infoText)

console.log({ args })

async function runUser (server: Server): Promise<TrainerLog> {
  const data = await getTaskData(TASK)

  // force the federated scheme
  const scheme = TrainingSchemes.FEDERATED
  const client = await getClient(clients.federated.Client, server, TASK)
  const disco = new Disco(TASK, { scheme, client })

  console.log('runUser>>>>')
  await disco.fit(data)
  console.log('runUser<<<<')
  await disco.close()
  return await disco.logs()
}

async function main (): Promise<void> {
  await tf.ready()
  console.log(`Loaded ${tf.getBackend()} backend`)
  const server = await startServer()

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS).map(async (_) => await runUser(server)).toArray()
  )

  if (args.save) {
    const fileName = `${TASK.taskID}_${NUMBER_OF_USERS}users.csv`
    saveLog(logs, fileName)
  }

  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main().catch(console.error)
