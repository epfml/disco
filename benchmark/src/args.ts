// eslint-disable-file @typescript-eslint/prefer-ts-expect-error

import {parse} from 'ts-command-line-args'

interface BenchmarkArguments {
  numberOfUsers: number
  epochs: number
  roundDuration: number
  batchSize: number
  save: boolean
  help?: boolean
}

const argExample = 'e.g. npm run benchmark -- -u 2 -e 3, runs 2 users for 3 epochs'

const unsafeArgs = parse<BenchmarkArguments>(
  {
    // @ts-ignore
    numberOfUsers: {type: Number, alias: 'u', description: 'Number of users', optional: true},
    // @ts-ignore
    epochs: {type: Number, alias: 'e', description: 'Number of epochs', optional: true},
    // @ts-ignore
    roundDuration: {type: Number, alias: 'r', description: 'Round duration', optional: true},
    // @ts-ignore
    batchSize: {type: Number, alias: 'b', description: 'Round duration', optional: true},
    // @ts-ignore
    save: {type: Boolean, alias: 's', description: 'Save logs of benchmark', default: false},
    help: {type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide'}
  },
  {
    helpArg: 'help',
    headerContentSections: [{header: 'Disco benchmark', content: 'npm run benchmark -- [Options]\n' + argExample}]
  }
)

// TODO: Default args for non boolean did not seem to work
const numberOfUsers = unsafeArgs.numberOfUsers === undefined ? 1 : unsafeArgs.numberOfUsers
const roundDuration = unsafeArgs.roundDuration === undefined ? 10 : unsafeArgs.roundDuration
const epochs = unsafeArgs.epochs === undefined ? 10 : unsafeArgs.epochs
const batchSize = unsafeArgs.batchSize === undefined ? 10 : unsafeArgs.batchSize

export const args: BenchmarkArguments = {
  numberOfUsers,
  epochs,
  roundDuration,
  batchSize,
  save: unsafeArgs.save,
  help: false
}
