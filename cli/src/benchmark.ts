import { Range } from 'immutable'

import { Disco, TrainingSchemes, TrainerLog, data, Task, TrainingFunction, tf} from '@epfml/discojs-node'

import { startServer, saveLog } from './utils'
import { getTaskData } from './data'
import { args } from './args'

const NUMBER_OF_USERS = args.numberOfUsers
const TASK = args.task

const infoText = `\nRunning federated benchmark of ${TASK.taskID}`
console.log(infoText)

console.log({ args })

const prototypicalTraining: TrainingFunction = async (model, trainingInfomation, dataset, valDataset, onEpochEnd, onbBatchEnd, onTrainEnd) => {
  const { epochs, batchSize} = trainingInfomation

  console.log('congrats on training for', epochs, 'epochs')

  onTrainEnd()
}

async function runUser (task: Task, url: URL, data: data.DataSplit): Promise<TrainerLog> {
  // force the federated scheme
  const scheme = TrainingSchemes.FEDERATED
  const disco = new Disco(task, { scheme: scheme, url: url, customTrainingFunction: prototypicalTraining }, )

  console.log('runUser>>>>')
  await disco.fit(data)
  console.log('runUser<<<<')
  await disco.close()
  return await disco.logs()
}

async function main (): Promise<void> {
  const [server, serverUrl] = await startServer()

  const data = await getTaskData(TASK)
  //console.log(data.train.dataset.take(1))
  //data.train.dataset.take(2).forEachAsync(e => console.log(e));

  const logs = await Promise.all(
    Range(0, NUMBER_OF_USERS).map(async (_) => await runUser(TASK, serverUrl, data)).toArray()
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
