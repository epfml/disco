import { Range } from 'immutable'
import { Server } from 'node:http'
import { client, tasks, ConsoleLogger, training, TrainingSchemes, EmptyMemory, TrainingInformant, TrainerLog } from 'discojs'

import { startServer, getClient } from './utils'
import { loadData, saveLog } from './data'
import { args } from './args'

const TASK = tasks.simple_face.task

const NUMBER_OF_USERS = args.numberOfUsers

const infoText = `\nRunning federated benchmark of ${TASK.taskID}`
console.log(infoText)

console.log({ args })

// Override training information here
if (TASK.trainingInformation !== undefined) {
  TASK.trainingInformation.batchSize = 10
  TASK.trainingInformation.roundDuration = args.roundDuration
  TASK.trainingInformation.epochs = args.epochs
}

async function runUser (server: Server): Promise<TrainerLog> {
  const data = await loadData(TASK)

  const logger = new ConsoleLogger()
  const memory = new EmptyMemory()

  const informant = new TrainingInformant(10, TASK.taskID, TrainingSchemes.FEDERATED)
  const cli = await getClient(client.Federated, server, TASK)
  await cli.connect()
  const disco = new training.Disco(TASK, logger, memory, TrainingSchemes.FEDERATED, informant, cli)

  console.log('runUser>>>>')
  await disco.startTraining(data)
  console.log('runUser<<<<')
  return await disco.getTrainerLog()
}

async function main (): Promise<void> {
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
