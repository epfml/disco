import { SaveConfig } from './result_io'
export interface UserConfig {
    trainingScheme: string // TODO: @Nacho114, change type to training scheme
    numberOfUsers: number
}

export interface BenchmarkConfig {
    userConfig: UserConfig
    saveConfig: SaveConfig
}
