import { SaveConfig } from './result_io'
import { Platform } from '../../src/platforms/platform'
export interface TrainConfig {
    epochs: number
}
export interface UserConfig {
    trainDir: string
    validDir: string
    trainConfig: TrainConfig
}

export interface BenchmarkConfig {
    platform: Platform
    usersConfig: UserConfig[]
    saveConfig: SaveConfig
}
