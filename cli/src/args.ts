import { parse } from 'ts-command-line-args'
import { Map } from 'immutable'

import { defaultTasks, Task } from '@epfml/discojs-node'

interface BenchmarkUnsafeArguments {
  task: string
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  save: boolean
  help?: boolean
}

const argExample = 'e.g. npm start -- -u 2 -e 3 # runs 2 users for 3 epochs'

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    // @ts-expect-error
    task: { type: String, alias: 't', description: 'Task: titanic, simple_face, cifar10', optional: true },
    // @ts-expect-error
    numberOfUsers: { type: Number, alias: 'u', description: 'Number of users', optional: true },
    // @ts-expect-error
    epochs: { type: Number, alias: 'e', description: 'Number of epochs', optional: true },
    // @ts-expect-error
    roundDuration: { type: Number, alias: 'r', description: 'Round duration', optional: true },
    // @ts-expect-error
    batchSize: { type: Number, alias: 'b', description: 'Training batch size', optional: true },
    // @ts-expect-error
    save: { type: Boolean, alias: 's', description: 'Save logs of benchmark', default: false },
    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
  },
  {
    helpArg: 'help',
    headerContentSections: [{ header: 'DISCO CLI', content: 'npm start -- [Options]\n' + argExample }]
  }
)

const taskID = unsafeArgs.task === undefined ? 'simple_face' : unsafeArgs.task
let task = defaultTasks.simpleFace.getTask()

let supportedTasks: Map<string, Task> = Map()
supportedTasks = supportedTasks.set(defaultTasks.simpleFace.getTask().taskID, defaultTasks.simpleFace.getTask())
supportedTasks = supportedTasks.set(defaultTasks.titanic.getTask().taskID, defaultTasks.titanic.getTask())
supportedTasks = supportedTasks.set(defaultTasks.cifar10.getTask().taskID, defaultTasks.cifar10.getTask())

const task_ = supportedTasks.get(taskID)

if (task_ !== undefined) {
  task = task_
} else {
  throw Error(`${unsafeArgs.task} not implemented.`)
}

// TODO: Default args for non boolean did not seem to work
const numberOfUsers = unsafeArgs.numberOfUsers === undefined ? 1 : unsafeArgs.numberOfUsers
const roundDuration = unsafeArgs.roundDuration === undefined ? 10 : unsafeArgs.roundDuration
const epochs = unsafeArgs.epochs === undefined ? 10 : unsafeArgs.epochs
const batchSize = unsafeArgs.batchSize === undefined ? 10 : unsafeArgs.batchSize

// Override training information
if (task.trainingInformation !== undefined) {
  task.trainingInformation.batchSize = batchSize
  task.trainingInformation.roundDuration = roundDuration
  task.trainingInformation.epochs = epochs
  // For DP
  // TASK.trainingInformation.clippingRadius = 10000000
  // TASK.trainingInformation.noiseScale = 0
}

interface BenchmarkArguments {
  task: Task
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  save: boolean
}

export const args: BenchmarkArguments = {
  task,
  numberOfUsers,
  epochs,
  roundDuration,
  batchSize,
  save: unsafeArgs.save
}
