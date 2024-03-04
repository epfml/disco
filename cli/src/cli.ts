import { Range } from 'immutable'

import type { TrainerLog, data, Task } from '@epfml/discojs-core'
import { Disco, TrainingSchemes, aggregator as aggregators, client as clients } from '@epfml/discojs-core'
import { startServer } from '@epfml/disco-server'

import { saveLog } from './utils'
import { getTaskData } from './data'
import { args } from './args'

async function runUser (task: Task, url: URL, data: data.DataSplit): Promise<TrainerLog> {
  const client = new clients.federated.FederatedClient(url, task, new aggregators.MeanAggregator())

  // force the federated scheme
  const scheme = TrainingSchemes.FEDERATED
  const disco = new Disco(task, { scheme, client })

  await disco.fit(data)
  await disco.close()
  return await disco.logs()
}

async function main (task: Task, numberOfUsers: number): Promise<void> {
  console.log(`Started federated training of ${task.id}`)
  console.log({ args })

  const [server, url] = await startServer()

  const data = await getTaskData(task)

  const logs = await Promise.all(
    Range(0, numberOfUsers).map(async (_) => await runUser(task, url, data)).toArray()
  )

  if (args.save) {
    const fileName = `${task.id}_${numberOfUsers}users.csv`
    saveLog(logs, fileName)
  }
  console.log('Shutting down the server...')
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main(args.task, args.numberOfUsers).catch(console.error)
