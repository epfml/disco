import { tf } from '../../..'

type Tensor = tf.Tensor

const ENGINE = tf.engine()

function l2Loss(tensor: Tensor): Tensor {
    return tf.div(tf.sum(tf.square(tensor)), 2)
}

function globalNorm(tensors: Tensor[]): Tensor {
    const halfSquaredNorms: Tensor[] = []
    tensors.forEach((tensor: Tensor, ti: number) => {
        halfSquaredNorms.push(l2Loss(tensor))
    })
    const halfSquaredNorm: Tensor = tf.sum(tf.stack(halfSquaredNorms))
    const norm: Tensor = tf.sqrt(
        tf.mul(halfSquaredNorm, tf.scalar(2.0, halfSquaredNorm.dtype))
    )
    return norm
}

function clipByGlobalNorm(
    tensors: Tensor[],
    clipNorm: number,
    useNorm?: Tensor
): Tensor[] {
    useNorm = useNorm || globalNorm(tensors)
    const scale: Tensor = tf.mul(
        clipNorm,
        tf.minimum(
            tf.div(tf.scalar(1.0), useNorm),
            tf.div(tf.scalar(1.0, useNorm.dtype), clipNorm)
        )
    )
    const tensorsClipped: Tensor[] = []
    tensors.forEach((tensor: Tensor, ti: number) => {
        tensorsClipped.push(tf.clone(tf.mul(tensor, scale)))
    })
    return tensorsClipped
}

function clipByGlobalNormObj(
    tensorsObj: { [key: string]: Tensor },
    clipNorm: number,
    useNorm?: Tensor
): { [key: string]: Tensor } {
    const varNames: string[] = Object.keys(tensorsObj)
    const tensorsArr: Tensor[] = varNames.map((n: string) => tensorsObj[n])
    const tensorsArrClipped: Tensor[] = clipByGlobalNorm(
        tensorsArr,
        clipNorm,
        useNorm
    )
    const tensorsObjClipped: { [key: string]: Tensor } = {}
    tensorsArrClipped.forEach((t: Tensor, ti: number) => {
        tensorsObjClipped[varNames[ti]] = t
    })
    return tensorsObjClipped
}

class AdamW extends tf.AdamOptimizer {
    weightDecayRate: number
    includeInWeightDecay: string[]
    excludeFromWeightDecay: string[]
    gradientClipNorm: number

    constructor(params: {
        learningRate?: number
        beta1?: number
        beta2?: number
        epsilon?: number
        weightDecayRate?: number
        includeInWeightDecay?: string[]
        excludeFromWeightDecay?: string[]
        gradientClipNorm?: number
    }) {
        console.log('Using custom AdamW optimizer')
        const defaultParams = {
            learningRate: 0.1,
            beta1: 0.9,
            beta2: 0.999,
            epsilon: 1e-7,
            weightDecayRate: 0,
            includeInWeightDecay: [],
            excludeFromWeightDecay: [],
            gradientClipNorm: 1.0,
        }
        const p = Object.assign({}, defaultParams, params)
        super(p.learningRate, p.beta1, p.beta2, p.epsilon)
        this.weightDecayRate = p.weightDecayRate
        this.includeInWeightDecay = p.includeInWeightDecay
        this.excludeFromWeightDecay = p.excludeFromWeightDecay
        this.gradientClipNorm = p.gradientClipNorm
    }

    applyGradients(variableGradients: any): void {
        const varNames: string[] = Array.isArray(variableGradients)
            ? variableGradients.map((v: Tensor) => (v as any).name)
            : Object.keys(variableGradients)

        varNames.forEach((name: string, i: number) => {
            if (this.includeInWeightDecay.includes(name)) {
                const value: any = ENGINE.registeredVariables[name]
                const newValue: Tensor = tf.sub(
                    value,
                    tf.mul(
                        this.learningRate,
                        tf.mul(value, this.weightDecayRate)
                    )
                )
                value.assign(newValue)
            }
        })

        super.applyGradients(variableGradients as any)
    }
}

export { AdamW, clipByGlobalNorm, clipByGlobalNormObj }
