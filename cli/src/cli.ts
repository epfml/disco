import { Range } from 'immutable'

import type { TrainerLog, data, Task } from '@epfml/discojs-core'
import { Disco, TrainingSchemes } from '@epfml/discojs-core'

import { startServer, saveLog } from './utils'
import { getTaskData } from './data'
import { args } from './args'

const NUMBER_OF_USERS = args.numberOfUsers
const TASK = args.task

const infoText = `\nStarted federated training of ${TASK.id}`
console.log(infoText)

console.log({ args })

async function runUser (task: Task, url: URL, data: data.DataSplit): Promise<TrainerLog> {
  // force the federated scheme
  const scheme = TrainingSchemes.FEDERATED
  const disco = new Disco(task, { scheme, url })

  await disco.fit(data)
  await disco.close()
  return await disco.logs()
}

async function main (): Promise<void> {
  const [server, serverUrl] = await startServer()

  const data = await getTaskData(TASK)

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS).map(async (_) => await runUser(TASK, serverUrl, data)).toArray()
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
