import { UserConfig } from '../config'
import { TrainerLog } from '../../../src/core/training/trainer/trainer_logger'

export type UserID = string

export interface User {
    id: UserID
    config: UserConfig

    start(): Promise<void>
    getLog(): TrainerLog

}
