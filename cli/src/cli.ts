import { Range } from 'immutable'
import type { Server } from 'node:http'

import type { TrainerLog, data, Task } from '@epfml/discojs-core'
import { Disco, TrainingSchemes, aggregator as aggregators, client as clients } from '@epfml/discojs-core'
import { getClient, startServer } from '@epfml/disco-server'

import { saveLog } from './utils'
import { getTaskData } from './data'
import { args } from './args'

const NUMBER_OF_USERS = args.numberOfUsers
const TASK = args.task

const infoText = `\nStarted federated training of ${TASK.id}`
console.log(infoText)

console.log({ args })

async function runUser (task: Task, server: Server, data: data.DataSplit): Promise<TrainerLog> {
  const client = await getClient(clients.federated.FederatedClient, server, task, new aggregators.MeanAggregator(TASK))

  // force the federated scheme
  const scheme = TrainingSchemes.FEDERATED
  const disco = new Disco(task, { scheme, client })

  await disco.fit(data)
  await disco.close()
  return await disco.logs()
}

async function main (): Promise<void> {
  const server = await startServer()

  const data = await getTaskData(TASK)

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS).map(async (_) => await runUser(TASK, server, data)).toArray()
  )

  if (args.save) {
    const fileName = `${TASK.id}_${NUMBER_OF_USERS}users.csv`
    saveLog(logs, fileName)
  }
  console.log('Shutting down the server...')
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main().catch(console.error)
