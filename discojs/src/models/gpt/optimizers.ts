import * as tf from '@tensorflow/tfjs'

function l2Loss (tensor: tf.Tensor): tf.Tensor {
  return tf.div(tf.sum(tf.square(tensor)), 2)
}

function globalNorm (tensors: tf.Tensor[]): tf.Tensor {
  const halfSquaredNorms: tf.Tensor[] = []
  tensors.forEach((tensor: tf.Tensor) => {
    halfSquaredNorms.push(l2Loss(tensor))
  })
  const halfSquaredNorm: tf.Tensor = tf.sum(tf.stack(halfSquaredNorms))
  const norm: tf.Tensor = tf.sqrt(
    tf.mul(halfSquaredNorm, tf.scalar(2.0, halfSquaredNorm.dtype))
  )
  return norm
}

function clipByGlobalNorm (
  tensors: tf.Tensor[],
  clipNorm: number,
  useNorm?: tf.Tensor
): tf.Tensor[] {
  return tf.tidy(() => {
    useNorm = useNorm ?? globalNorm(tensors)
    const scale: tf.Tensor = tf.mul(
      clipNorm,
      tf.minimum(
        tf.div(tf.scalar(1.0), useNorm),
        tf.div(tf.scalar(1.0, useNorm.dtype), clipNorm)
      )
    )
    const tensorsClipped: tf.Tensor[] = []
    tensors.forEach((tensor: tf.Tensor) => {
      tensorsClipped.push(tf.clone(tf.mul(tensor, scale)))
    })
    return tensorsClipped
  })
}

function clipByGlobalNormObj (
  tensorsObj: Record<string, tf.Tensor>,
  clipNorm: number,
  useNorm?: tf.Tensor
): Record<string, tf.Tensor> {
  const varNames: string[] = Object.keys(tensorsObj)
  const tensorsArr: tf.Tensor[] = varNames.map((n: string) => tensorsObj[n])
  const tensorsArrClipped: tf.Tensor[] = clipByGlobalNorm(
    tensorsArr,
    clipNorm,
    useNorm
  )
  const tensorsObjClipped: Record<string, tf.Tensor> = {}
  tensorsArrClipped.forEach((t: tf.Tensor, ti: number) => {
    tensorsObjClipped[varNames[ti]] = t
  })
  return tensorsObjClipped
}

class AdamW extends tf.AdamOptimizer {
  weightDecayRate: number
  includeInWeightDecay: string[]
  excludeFromWeightDecay: string[]
  gradientClipNorm: number

  constructor (params: {
    learningRate?: number
    beta1?: number
    beta2?: number
    epsilon?: number
    weightDecayRate?: number
    includeInWeightDecay?: string[]
    excludeFromWeightDecay?: string[]
    gradientClipNorm?: number
  }) {
    const defaultParams = {
      learningRate: 0.1,
      beta1: 0.9,
      beta2: 0.999,
      epsilon: 1e-7,
      weightDecayRate: 0,
      includeInWeightDecay: [],
      excludeFromWeightDecay: [],
      gradientClipNorm: 1.0
    }
    const p = Object.assign({}, defaultParams, params)
    super(p.learningRate, p.beta1, p.beta2, p.epsilon)
    this.weightDecayRate = p.weightDecayRate
    this.includeInWeightDecay = p.includeInWeightDecay
    this.excludeFromWeightDecay = p.excludeFromWeightDecay
    this.gradientClipNorm = p.gradientClipNorm
  }

  override applyGradients (variableGradients: Record<string, tf.Variable> | Array<{ name: string, tensor: tf.Tensor }>): void {
    const varNames: string[] = Array.isArray(variableGradients)
      ? variableGradients.map((v) => v.name)
      : Object.keys(variableGradients)

    varNames.forEach((name: string) => {
      if (this.includeInWeightDecay.includes(name)) {
        const value = tf.engine().registeredVariables[name]
        const newValue: tf.Tensor = tf.sub(
          value,
          tf.mul(
            this.learningRate,
            tf.mul(value, this.weightDecayRate)
          )
        )
        value.assign(newValue)
      }
    })

    super.applyGradients(variableGradients)
  }
}

function getCustomAdam (model: tf.LayersModel, lr: number, weightDecay: number): tf.Optimizer {
  const includeInWeightDecay: string[] = []
  const excludeFromWeightDecay: string[] = []

  // TODO unsafe cast
  const namedWeights = (model as unknown as Record<'getNamedWeights', () => Array<{ name: string, tensor: tf.Tensor }>>).getNamedWeights()

  namedWeights.forEach((v) => {
    if (
      v.name.includes('bias') ||
            v.name.includes('normalization') ||
            v.name.includes('emb')
    ) {
      excludeFromWeightDecay.push(v.name)
    } else {
      includeInWeightDecay.push(v.name)
    }
  })

  return new AdamW({
    learningRate: lr,
    weightDecayRate: weightDecay,
    includeInWeightDecay,
    excludeFromWeightDecay
  })
}

export { getCustomAdam, clipByGlobalNormObj }
