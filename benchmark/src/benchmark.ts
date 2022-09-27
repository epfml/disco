import { Range } from 'immutable'
import {
  tf,
  client,
  ConsoleLogger,
  training,
  TrainingSchemes,
  EmptyMemory,
  informant,
  TrainerLog,
  exampleData
} from '@epfml/discojs'

import { getClient, saveLog } from './utils'
import { args } from './args'

const NUMBER_OF_USERS = args.numberOfUsers
let TASK = args.task

const infoText = `\nRunning federated benchmark of ${TASK.taskID}`
console.log(infoText)

console.log({ args })

async function runUser(): Promise<TrainerLog> {
  const data= await exampleData.getTaskData(TASK)

  const logger = new ConsoleLogger()
  const memory = new EmptyMemory()

  const inf = new informant.FederatedInformant(TASK.taskID, 10)
  const cli = await getClient(client.federated.Client, TASK)
  await cli.connect()
  const disco = new training.Disco(
    TASK,
    logger,
    memory,
    TrainingSchemes.FEDERATED,
    inf,
    cli,
  )

  console.log('runUser>>>>')
  await disco.startTraining(data)
  console.log('runUser<<<<')
  await cli.disconnect()
  return await disco.getTrainerLog()
}

async function main(): Promise<void> {
  await tf.ready()
  console.log(`Loaded ${tf.getBackend()} backend`)

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS)
      .map(async (_) => await runUser())
      .toArray(),
  )

  if (args.save) {
    const fileName = `${TASK.taskID}_${NUMBER_OF_USERS}users.csv`
    saveLog(logs, fileName)
  }
}

main().catch(console.error)
