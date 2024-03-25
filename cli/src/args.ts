import { parse } from 'ts-command-line-args'
import { Map } from 'immutable'

import type { Task } from '@epfml/discojs-core'
import { defaultTasks } from '@epfml/discojs-core'

interface BenchmarkArguments {
  task: Task
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  save: boolean
}

type BenchmarkUnsafeArguments = {
  [K in keyof BenchmarkArguments as Exclude<K, 'task'>]: BenchmarkArguments[K]
} & {
  task: string
  help?: boolean
}

const argExample = 'e.g. npm start -- -u 2 -e 3 # runs 2 users for 3 epochs'

const unsafeArgs = parse<BenchmarkUnsafeArguments>(
  {
    task: { type: String, alias: 't', description: 'Task: titanic, simple_face or cifar10', defaultValue: 'simple_face' },
    numberOfUsers: { type: Number, alias: 'u', description: 'Number of users', defaultValue: 1 },
    epochs: { type: Number, alias: 'e', description: 'Number of epochs', defaultValue: 10 },
    roundDuration: { type: Number, alias: 'r', description: 'Round duration', defaultValue: 10 },
    batchSize: { type: Number, alias: 'b', description: 'Training batch size', defaultValue: 10 },
    save: { type: Boolean, alias: 's', description: 'Save logs of benchmark', defaultValue: false },
    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
  },
  {
    helpArg: 'help',
    headerContentSections: [{ header: 'DISCO CLI', content: 'npm start -- [Options]\n' + argExample }]
  }
)

let supportedTasks: Map<string, Task> = Map()
supportedTasks = supportedTasks.set(defaultTasks.simpleFace.getTask().id, defaultTasks.simpleFace.getTask())
supportedTasks = supportedTasks.set(defaultTasks.titanic.getTask().id, defaultTasks.titanic.getTask())
supportedTasks = supportedTasks.set(defaultTasks.cifar10.getTask().id, defaultTasks.cifar10.getTask())

const task = supportedTasks.get(unsafeArgs.task)
if (task === undefined) {
  throw Error(`${unsafeArgs.task} not implemented.`)
}

// Override training information
if (task.trainingInformation !== undefined) {
  task.trainingInformation.batchSize = unsafeArgs.batchSize
  task.trainingInformation.roundDuration = unsafeArgs.roundDuration
  task.trainingInformation.epochs = unsafeArgs.epochs
  // For DP
  // TASK.trainingInformation.clippingRadius = 10000000
  // TASK.trainingInformation.noiseScale = 0
}

export const args: BenchmarkArguments = { ...unsafeArgs, task }
