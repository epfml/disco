import {Range} from 'immutable'
import {Server} from 'node:http'
import {tf, client, ConsoleLogger, training, TrainingSchemes, EmptyMemory, informant, TrainerLog} from '@epfml/discojs'
import '@tensorflow/tfjs-node'

import {startServer, getClient, saveLog} from './utils'
import {getTaskData} from './data'
import {args} from './args'

const NUMBER_OF_USERS = args.numberOfUsers
let TASK = args.task

const infoText = `\nRunning federated benchmark of ${TASK.taskID}`
console.log(infoText)

console.log({args})


async function runUser(server: Server): Promise<TrainerLog> {
  const data = await getTaskData(TASK)

  const logger = new ConsoleLogger()
  const memory = new EmptyMemory()

  const inf = new informant.FederatedInformant(TASK.taskID, 10)
  const cli = await getClient(client.federated.Client, server, TASK)
  await cli.connect()
  const disco = new training.Disco(TASK, logger, memory, TrainingSchemes.FEDERATED, inf, cli)

  console.log('runUser>>>>')
  await disco.startTraining(data)
  await cli.disconnect()
  console.log('runUser<<<<')
  return await disco.getTrainerLog()
}

async function main(): Promise<void> {
  await tf.ready()
  console.log(`Loaded ${tf.getBackend()} backend`)
  const server = await startServer()

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS).map(async (_) => await runUser(server)).toArray()
  )

  console.log('Benchmark terminated')

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
