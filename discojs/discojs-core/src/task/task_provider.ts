import { Task, training } from '..'

export type TaskProvider<ModelConfig = unknown> = {
    getTask: () => Task<ModelConfig>
    getModel: () => Promise<training.model.Model>
}

export function isTaskProvider(obj: any): obj is TaskProvider {
    if (
        'getModel' in obj &&
        typeof obj.getModel === 'function' &&
        'getTask' in obj &&
        typeof obj.getTask === 'function'
    ) {
        return true
    } else {
        return false
    }
}
