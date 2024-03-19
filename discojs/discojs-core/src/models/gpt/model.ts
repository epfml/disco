import tf, { LayersModel, layers, serialization } from '@tensorflow/tfjs'

import type { GPTConfig } from './config'
import { getModelSizes, DEFAULT_CONFIG } from './config'
import { train } from './train'
import type { TrainingCallbacks } from './types'

class Range extends layers.Layer {
  static readonly className = 'Range'

  computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, any>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) {
        // TODO support multitensor
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)
      const T = input.shape[1]
      if (T === undefined) throw new Error('unexpected shape')
      return tf.reshape(tf.range(0, T, 1, 'int32'), [1, T])
    })
  }
}
serialization.registerClass(Range)

class LogLayer extends layers.Layer {
  static readonly className = 'LogLayer'

  computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, any>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) {
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)
      return input
    })
  }
}
serialization.registerClass(LogLayer)

class CausalSelfAttentionBase extends layers.Layer {
  static readonly className = 'CausalSelfAttentionBase'

  private readonly blockSize: number
  private readonly nHead: number
  private readonly nEmbd: number
  private readonly dropout: number
  private readonly mask: tf.Tensor

  constructor (
    private readonly config: ConstructorParameters<typeof tf.layers.Layer>[0] & Record<'blockSize' | 'nHead' | 'nEmbd' | 'dropout', number>
  ) {
    super(config)

    this.blockSize = config.blockSize
    this.nEmbd = config.nEmbd
    this.nHead = config.nHead
    this.dropout = config.dropout

    this.mask = tf.linalg.bandPart(tf.ones([this.blockSize, this.blockSize]), -1, 0)
  }

  computeOutputShape (): tf.Shape | tf.Shape[] {
    // TODO doesn't take input shape in account
    return [null, this.blockSize, this.nEmbd]
  }

  getConfig (): serialization.ConfigDict {
    const config = super.getConfig()
    return Object.assign({}, config, this.config)
  }

  call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, any>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) {
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)

      let [q, k, v] = input.split(3, -1) as [tf.Tensor, tf.Tensor, tf.Tensor]
      const [B, T, C] = k.shape
      const splitHeads = (x: tf.Tensor): tf.Tensor4D =>
        x.reshape([B, T, this.nHead, C / this.nHead]).transpose([0, 2, 1, 3])
      q = splitHeads(q)
      k = splitHeads(k)
      v = splitHeads(v)

      let att = tf.mul(
        tf.matMul(q, k, false, true),
        tf.div(
          1,
          tf.sqrt(tf.cast(k.shape[k.shape.length - 1], 'float32'))
        )
      )
      att = tf.add(att, tf.mul(tf.sub(1, this.mask), -1e9))
      att = tf.softmax(att, -1)
      att = kwargs.training === true ? tf.dropout(att, this.dropout) : att

      let y = tf.matMul(att, v)
      y = tf.transpose(y, [0, 2, 1, 3])
      y = tf.reshape(y, [B, T, C])

      return y
    })
  }
}
serialization.registerClass(CausalSelfAttentionBase)

type CausalSelfAttentionConfig =
    ConstructorParameters<typeof tf.layers.Layer>[0]
    & Record<'blockSize' | 'nHead' | 'nEmbd' | 'dropout', number>
    & { bias: boolean }

class CausalSelfAttention extends layers.Layer {
  static readonly className = 'CausalSelfAttention'

  private readonly nHead: number
  private readonly nEmbd: number
  private readonly dropout: number
  private readonly bias: boolean
  private readonly mask: tf.Tensor2D

  cAttnKernel?: tf.LayerVariable
  cAttnBias?: tf.LayerVariable
  cProjKernel?: tf.LayerVariable
  cProjBias?: tf.LayerVariable

  constructor (private readonly config: CausalSelfAttentionConfig) {
    super(config)

    this.nEmbd = config.nEmbd
    this.nHead = config.nHead
    this.dropout = config.dropout
    this.bias = config.bias

    this.mask = tf.linalg.bandPart(tf.ones([config.blockSize, config.blockSize]), -1, 0)
  }

  build (): void {
    this.cAttnKernel = this.addWeight(
      'c_attn/kernel',
      [this.nEmbd, 3 * this.nEmbd],
      'float32',
      tf.initializers.glorotNormal({})
    )
    this.cAttnBias = this.addWeight(
      'c_attn/bias',
      [3 * this.nEmbd],
      'float32',
      tf.initializers.zeros()
    )
    this.cProjKernel = this.addWeight(
      'c_proj/kernel',
      [this.nEmbd, this.nEmbd],
      'float32',
      tf.initializers.glorotNormal({})
    )
    this.cProjBias = this.addWeight(
      'c_proj/bias',
      [this.nEmbd],
      'float32',
      tf.initializers.zeros()
    )
  }

  computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  getConfig (): serialization.ConfigDict {
    const config = super.getConfig()
    return Object.assign({}, config, this.config)
  }

  call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, any>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (this.cAttnKernel === undefined ||
        this.cAttnBias === undefined ||
        this.cProjKernel === undefined ||
        this.cProjBias === undefined
      ) { throw new Error('not built') }

      if (Array.isArray(input)) {
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)

      const dense = (x: tf.Tensor, kernel: tf.LayerVariable, bias: tf.LayerVariable): tf.Tensor => {
        const k = kernel.read().expandDims(0).tile([x.shape[0], 1, 1])
        const m = x.matMul(k)
        if (this.bias) {
          return tf.add(m, bias.read())
        } else {
          return m
        }
      }

      const cAttn = dense(input, this.cAttnKernel, this.cAttnBias)

      let [q, k, v] = tf.split(cAttn, 3, -1) as [tf.Tensor, tf.Tensor, tf.Tensor]
      const [B, T, C] = k.shape

      const splitHeads = (x: tf.Tensor): tf.Tensor =>
        tf.transpose(
          tf.reshape(x, [B, T, this.nHead, C / this.nHead]),
          [0, 2, 1, 3]
        )

      q = splitHeads(q)
      k = splitHeads(k)
      v = splitHeads(v)

      let att = tf.mul(
        tf.matMul(q, k, false, true),
        tf.div(
          1,
          tf.sqrt(tf.cast(k.shape[k.shape.length - 1], 'float32'))
        )
      )

      const mask = this.mask.slice([0, 0], [T, T])
      att = tf.add(att, tf.mul(tf.sub(1, mask), -1e9))
      att = tf.softmax(att, -1)
      att = kwargs.training === true ? tf.dropout(att, this.dropout) : att

      let y = tf.matMul(att, v)
      y = tf.transpose(y, [0, 2, 1, 3])
      y = tf.reshape(y, [B, T, C])
      y = dense(y, this.cProjKernel, this.cProjBias)
      y = kwargs.training === true ? tf.dropout(y, this.dropout) : y

      return y
    })
  }
}
serialization.registerClass(CausalSelfAttention)

class GELU extends layers.Layer {
  static readonly className = 'GELU'

  constructor () {
    super({})
  }

  computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, any>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) {
        // TODO support multitensor
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)
      const cdf = tf.mul(
        0.5,
        tf.add(
          1,
          tf.tanh(
            tf.mul(
              tf.sqrt(tf.div(2, Math.PI)),
              tf.add(input, tf.mul(0.044715, tf.pow(input, 3)))
            )
          )
        )
      )
      return tf.mul(input, cdf)
    })
  }
}
serialization.registerClass(GELU)

function MLP (conf: any): LayersModel {
  const config = Object.assign({ name: 'mlp' }, conf)
  const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
  let x
  x = tf.layers
    .dense({
      name: config.name + '/c_fc',
      units: 4 * config.nEmbd,
      inputDim: config.nEmbd,
      inputShape: [config.blockSize, config.nEmbd]
    })
    .apply(inputs)
  x = new GELU().apply(x)
  x = tf.layers
    .dense({
      name: config.name + '/c_proj',
      units: config.nEmbd,
      inputDim: 4 * config.nEmbd,
      inputShape: [config.blockSize, 4 * config.nEmbd]
    })
    .apply(x)
  x = tf.layers
    .dropout({
      name: config.name + '/drop',
      rate: config.residDrop
    })
    .apply(x)
  return tf.model({ inputs, outputs: x as any })
}

function Block (conf: CausalSelfAttentionConfig & { debug: boolean }): LayersModel {
  const config = Object.assign({ name: 'h' }, conf)
  const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
  let x1, x2
  x1 = tf.layers
    .layerNormalization({ name: config.name + '/ln_1', epsilon: 1e-5 })
    .apply(inputs)
  if (config.debug) {
    x1 = new LogLayer({ name: config.name + '/ln_1_log' }).apply(x1)
  }
  x1 = new CausalSelfAttention(
    Object.assign({}, config, { name: config.name + '/attn' })
  ).apply(x1)
  x1 = tf.layers.add().apply([inputs, x1 as any])
  x2 = tf.layers
    .layerNormalization({ name: config.name + '/ln_2', epsilon: 1e-5 })
    .apply(x1)
  x2 = MLP(Object.assign({}, config, { name: config.name + '/mlp' })).apply(
    x2
  )
  x2 = tf.layers.add().apply([x1 as any, x2 as any])
  return tf.model({ name: config.name, inputs, outputs: x2 as any })
}

function GPT (conf: GPTConfig): LayersModel {
  const configDefaults = {
    name: 'transformer',
    ...DEFAULT_CONFIG
  }

  const modelSizes = getModelSizes(conf.modelType)
  const config = Object.assign({}, configDefaults, conf, modelSizes)

  const inputs = tf.input({ shape: [null] })

  const tokEmb = config.tokEmb
    ? tf.layers
      .embedding({
        name: config.name + '/wte',
        inputDim: config.vocabSize,
        outputDim: config.nEmbd,
        embeddingsInitializer: 'zeros',
        embeddingsRegularizer: undefined,
        activityRegularizer: undefined
      })
      .apply(inputs)
    : inputs

  const range = new Range({}).apply(inputs)
  let posEmb = tf.layers
    .embedding({
      name: config.name + '/wpe',
      inputDim: config.blockSize,
      outputDim: config.nEmbd,
      embeddingsInitializer: 'zeros'
    })
    .apply(range)
  if (config.debug) {
    posEmb = new LogLayer({ name: 'posEmb' }).apply(posEmb)
  }

  let x
  x = tf.layers.add().apply([tokEmb as any, posEmb as any])
  x = tf.layers
    .dropout({
      name: 'drop',
      rate: config.embdDrop
    })
    .apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'dropadd' }).apply(x)
  }

  for (let i = 0; i < config.nLayer; i++) {
    x = Block(
      Object.assign({}, config, { name: config.name + '/h/' + i })
    ).apply(x)
  }
  x = tf.layers
    .layerNormalization({ name: config.name + '/ln_f', epsilon: 1e-5 })
    .apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'fin/ln' }).apply(x)
  }

  if (config.lmHead) {
    x = tf.layers
      .dense({
        name: 'lm_head',
        units: config.vocabSize,
        inputDim: config.nEmbd,
        inputShape: [config.blockSize, config.nEmbd],
        useBias: false
      })
      .apply(x)
  }
  return tf.model({ inputs, outputs: x as any })
}

interface GenerateConfig {
  maxNewTokens: number
  temperature: number
  doSample: boolean
}

const defaultGenerateConfig: GenerateConfig = {
  maxNewTokens: 20,
  temperature: 1.0,
  doSample: false
}

function prepareIdx (idx: tf.TensorLike): tf.Tensor2D {
  return tf.tidy(() => {
    let ret: tf.Tensor
    if (idx instanceof tf.Tensor) {
      ret = idx.clone()
    } else {
      ret = tf.tensor(idx)
    }
    if (ret.dtype !== 'int32') {
      ret = ret.toInt()
    }
    switch (ret.shape.length) {
      case 1:
        return ret.expandDims(0)
      case 2:
        return ret as tf.Tensor2D
      default:
        throw new Error('unexpected shape')
    }
  })
}

/**
 * tfjs does not export LazyIterator and Dataset...
 */
declare abstract class LazyIterator<T> {
  abstract next (): Promise<IteratorResult<T>>
}

declare abstract class Dataset<T> {
  abstract iterator (): Promise<LazyIterator<T>>
  size: number
}

class GPTModel extends LayersModel {
  constructor (protected readonly config: GPTConfig) {
    const gpt = GPT(config)
    const { inputs, outputs, name } = gpt
    super({ inputs, outputs, name })
    Object.assign(this, gpt)
  }

  async fitDataset<T> (
    dataset: Dataset<T>,
    args: tf.ModelFitDatasetArgs<T>
  ): Promise<tf.History> {
    const config = { ...this.config, ...args }

    await train(
      this,
      dataset as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>,
      config,
      args.epochs,
      args.callbacks as TrainingCallbacks,
      args.validationData as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
    )

    return new tf.History()
  }
}

interface GenerateOutput { idxNext: tf.Tensor2D, timePerToken: number }

class GPTLMHeadModel extends GPTModel {
  async generate (idxRaw: tf.TensorLike, conf: GenerateConfig, act?: (_: GenerateOutput) => Promise<void>): Promise<number[][]> {
    const config = Object.assign({}, defaultGenerateConfig, conf)
    let idx = prepareIdx(idxRaw)
    for (let step = 0; step < config.maxNewTokens; step++) {
      const { idxNext, timePerToken } = this.generateOnce(this, idx, config)
      const idxNew = idx.concat(idxNext, 1)
      tf.dispose(idx)
      idx = idxNew
      const idxNextArr = await (idxNext as any).array()
      tf.dispose(idxNext)
      if (act !== undefined) {
        await act({ idxNext: idxNextArr, timePerToken })
      }
    }
    const idxArr = await idx.array()
    tf.dispose(idx)
    return idxArr
  }

  private generateOnce (model: tf.LayersModel, idx: tf.Tensor2D, config: GenerateConfig): GenerateOutput {
    let timePerToken = performance.now()

    const idxNext = tf.tidy(() => {
      const blockSize: any = model.inputs[0].shape[1]
      const idxCond =
              idx.shape[1] <= blockSize
                ? idx
                : idx.slice([0, -blockSize], [-1, -1])
      const outputed = model.predict(idxCond)
      if (Array.isArray(outputed)) throw new Error('model outputed multiple values')
      if (outputed.shape.length !== 3) throw new Error('model outputed weird shape')
      const logits = outputed as tf.Tensor3D

      timePerToken = performance.now() - timePerToken
      const logitsScaled = logits
        .slice([0, idx.shape[1] - 1, 0])
        .reshape([logits.shape[0], logits.shape[2]])
        .div<tf.Tensor2D>(tf.scalar(config.temperature))
      const probs = logitsScaled.softmax(-1)
      if (config.doSample) {
        return tf.multinomial(probs, 1) as tf.Tensor2D
      } else {
        return probs.argMax(-1).expandDims<tf.Tensor2D>(1)
      }
    })

    return {
      idxNext,
      timePerToken
    }
  }
}

export { GPT, GPTModel, GPTLMHeadModel }
