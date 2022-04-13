// import { UserConfig } from '../core/config'
// import { TrainerLogger, TrainerLog } from '../../src/core/training/trainer/trainer_logger'
// import { List } from 'immutable'
// import { UserID, User } from '../core/users/user'

// export function MockUserGenerator (config: UserConfig): List<MockUser> {
//   let users = List<MockUser>()
//   let count = config.numberOfUsers
//   while (count--) {
//     const id = count.toString()
//     users = users.push(new MockUser(id, config))
//   }

//   return users
// }
// export class MockUser implements User {
//     readonly id: UserID
//     readonly config: UserConfig
//     readonly logger: TrainerLogger

//     constructor (id: UserID, config: UserConfig) {
//       this.id = id
//       this.config = config
//       this.logger = new TrainerLogger(true)
//     }

//     async start (): Promise<void> {
//       this.simulateTraining()
//     }

//     private simulateEpoch (): void {
//       const log = {
//         acc: 0.5,
//         val_acc: 0.5,
//         loss: 0.5
//       }
//       this.logger.onEpochEnd(1, log)
//     }

//     private simulateTraining (): void {
//       this.simulateEpoch()
//       this.simulateEpoch()
//       this.simulateEpoch()
//     }

//     getLog (): TrainerLog {
//       return this.logger.log
//     }
// }
