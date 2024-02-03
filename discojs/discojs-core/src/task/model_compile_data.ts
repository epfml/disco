export function isModelCompileData(raw: unknown): raw is ModelCompileData {
    if (typeof raw !== 'object') {
        return false
    }
    if (raw === null) {
        return false
    }

    const { optimizer, loss, metrics } = raw as Record<
        'optimizer' | 'loss' | 'metrics',
        unknown | undefined
    >

    if (typeof optimizer !== 'string' || typeof loss !== 'string') {
        return false
    }

    if (
        !(Array.isArray(metrics) && metrics.every((e) => typeof e === 'string'))
    ) {
        return false
    }

    return true
}

// TODO: Use this instead of the original ModelCompileData ?
// Since tf.ModelCompileArgs is unavailable, the following is a way to retrieve it
// as the first parameter of tf.LayersModel.compile()
// type TypeOfClassMethod<T, M extends keyof T> = T[M] extends Function
//     ? T[M]
//     : never
// type CompileMethod = TypeOfClassMethod<tf.LayersModel, 'compile'>
// export type ModelCompileData = Parameters<CompileMethod>[0]

export interface ModelCompileData {
    optimizer: string
    loss: string
    metrics: string[]
}
