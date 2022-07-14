import { parse } from 'ts-command-line-args'

interface BenchmarkArguments {
  numberOfUsers: number
  epochs: number
  roundDuration: number
  save: boolean
  help?: boolean
}

const USERS = 1
const EPOCHS = 2
const ROUND_DURATION = 10

export const args = parse<BenchmarkArguments>(
  {
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    numberOfUsers: { type: Number, alias: 'u', description: `Number of users, default: ${USERS}`, default: USERS, optional: true },
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    epochs: { type: Number, alias: 'e', description: `Number of epochs, default: ${EPOCHS}`, default: EPOCHS, optional: true },
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    roundDuration: { type: Number, alias: 'r', description: `Round duration, default: ${ROUND_DURATION}`, default: ROUND_DURATION, optional: true },
    // eslint-disable-next-line @typescript-eslint/prefer-ts-expect-error
    // @ts-ignore
    save: { type: Boolean, alias: 's', description: 'Save logs of benchmark', default: false },
    help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' }
  },
  {
    helpArg: 'help',
    headerContentSections: [{ header: 'Disco benchmark', content: 'npx ts-node benchmark/benchmark.ts [Options]' }]
  }
)
