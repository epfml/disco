import { UserConfig } from '../config'
import { TrainerLogger, TrainerLog } from '../../../src/core/training/trainer/trainer_logger'

export type UserID = string

export interface User {
    id: UserID
    config: UserConfig
    logger: TrainerLogger

    start(): Promise<void>
    getLog(): TrainerLog

}
