import { SaveConfig } from './result_io'

export interface UserConfig {
    trainingScheme: string // TODO: @Nacho114, change typo to training scheme
}

export interface BenchmarkConfig {
    numberOfUsers: number
    userConfig: UserConfig
    saveConfig: SaveConfig
}
