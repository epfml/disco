import * as tf from '@tensorflow/tfjs'
import type { GPTConfig } from './config.js'
import type { ModelSize } from './config.js'

/**
 * Defines a range, from 0 to T, that is used to create positional embeddings
 */
class Range extends tf.layers.Layer {
  static readonly className = 'Range'

  override computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
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
tf.serialization.registerClass(Range)

class LogLayer extends tf.layers.Layer {
  static readonly className = 'LogLayer'

  override computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) {
        input = input[0]
      }
      this.invokeCallHook(input, kwargs)
      return input
    })
  }
}
tf.serialization.registerClass(LogLayer)

type CausalSelfAttentionConfig =
    ConstructorParameters<typeof tf.layers.Layer>[0]
    & Record<'blockSize' | 'nHead' | 'nEmbd' | 'dropout', number>
    & { bias: boolean }

class CausalSelfAttention extends tf.layers.Layer {
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

    // mask is a lower triangular matrix filled with 1
    // calling bandPart zero out the upper triangular part of the all-ones matrix
    // from the doc: tf.linalg.band_part(input, -1, 0) ==> Lower triangular part
    this.mask = tf.linalg.bandPart(tf.ones([config.blockSize, config.blockSize]), -1, 0)
  }

  override build (): void {
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

  override computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override getConfig (): tf.serialization.ConfigDict {
    const config = super.getConfig()
    return Object.assign({}, config, this.config)
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
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
      // Apply attention weights to inputs as one big matrix which is then split into the
      // query, key and value submatrices
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

      // Scaled self attention: query @ key / sqrt(n_heads)
      let att = tf.mul(
        tf.matMul(q, k, false, true),
        tf.div(
          1,
          tf.sqrt(tf.cast(k.shape[k.shape.length - 1], 'float32'))
        )
      )

      // The next operations apply attention to the past tokens, which is
      // essentially a weighted average of the past tokens with complicated weights,
      // and makes sure to not pay any attention to future tokens

      // mask is lower triangular matrix filled with 1
      const mask = this.mask.slice([0, 0], [T, T])
      // 1 - mask                   => upper triangular matrix filled with 1
      // (1 - mask) * -10^9         => upper triangular matrix filled with -inf
      // att + ((1 - mask) * -10^9) => lower triangular part is the same as the `att` matrix
      //                               upper triangular part is -inf
      att = tf.add(att, tf.mul(tf.sub(1, mask), -1e9))
      // applying softmax zeros out the upper triangular part 
      //(which are the attention weights of future tokens)
      // and creates a probability distribution for the lower triangular
      // (attention weights of past tokens). The probability distribution ensures
      // that the attention weights of past tokens for a particular token sum to one
      att = tf.softmax(att, -1)
      att = kwargs.training === true ? tf.dropout(att, this.dropout) : att

      // This is where the (attention-)weighted sum of past values is performed
      let y = tf.matMul(att, v)
      y = tf.transpose(y, [0, 2, 1, 3])
      y = tf.reshape(y, [B, T, C])
      y = dense(y, this.cProjKernel, this.cProjBias)
      y = kwargs.training === true ? tf.dropout(y, this.dropout) : y
      return y
    })
  }
}
tf.serialization.registerClass(CausalSelfAttention)

class GELU extends tf.layers.Layer {
  static readonly className = 'GELU'

  constructor () {
    super({})
  }

  override computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
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
tf.serialization.registerClass(GELU)

type MLPConfig = ConstructorParameters<typeof tf.layers.Layer>[0] &
  Required<ModelSize> & Record<'blockSize' | 'residDrop', number>

function MLP(config: MLPConfig): tf.LayersModel {
  return tf.sequential({ layers: [
    tf.layers.dense({
      name: config.name + `/mlp/c_fc`,
      units: 4 * config.nEmbd,
      inputDim: config.nEmbd,
      inputShape: [config.blockSize, config.nEmbd]
    }),
    new GELU(),
  tf.layers.dense({
      name: config.name + '/mlp/c_proj',
      units: config.nEmbd,
      inputDim: 4 * config.nEmbd,
      inputShape: [config.blockSize, 4 * config.nEmbd]
    }),
    tf.layers.dropout({
      name: config.name + '/mlp/drop',
      rate: config.residDrop
    }),
  ]})
}

type BlockConfig = CausalSelfAttentionConfig & MLPConfig & { debug: boolean }

function TransformerBlock (conf: BlockConfig): tf.LayersModel {
  const config = Object.assign({ name: 'h' }, conf)
  const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
  let x1, x2
  // input normalization
  x1 = tf.layers.layerNormalization({ name: config.name + '/ln_1', epsilon: 1e-5 })
    .apply(inputs)
  if (config.debug) {
    x1 = new LogLayer({ name: config.name + '/ln_1_log' }).apply(x1)
  }
  // self attention layer
  x1 = new CausalSelfAttention(
    Object.assign({}, config, { name: config.name + '/attn' }),
  ).apply(x1)
  // Residual connection
  x1 = tf.layers.add().apply([inputs, x1 as tf.SymbolicTensor])
  // normalization 
  x2 = tf.layers
    .layerNormalization({ name: config.name + '/ln_2', epsilon: 1e-5 })
    .apply(x1)
  
  // MLP 
  x2 = MLP(Object.assign({}, config, { name: config.name })).apply(x2)
  // add attention output to mlp output
  x2 = tf.layers.add().apply([x1 as tf.SymbolicTensor, x2 as tf.SymbolicTensor])

  return tf.model({ name: config.name, inputs, outputs: x2 as tf.SymbolicTensor })
}


/**
 * The GPTArchitecture specifically defines a GPT forward pass, i.e.,
 * what are the inputs, the successive transformer blocks and the outputs. It is then 
 * used to create a GPTModel
 * 
 * @param conf GPTConfig
 * @returns model, tf.LayersModel, which supports model(inputs), model.predict and model.apply
 */
export function GPTArchitecture(config: Required<GPTConfig>): tf.LayersModel {
  const inputs = tf.input({ shape: [null] })

  //Token embedding
  const tokEmb = config.tokEmb
    ? tf.layers.embedding({
      name: config.name + '/wte',
      inputDim: config.vocabSize,
      outputDim: config.nEmbd,
      embeddingsInitializer: 'zeros',
      embeddingsRegularizer: undefined,
      activityRegularizer: undefined
    }).apply(inputs) as tf.SymbolicTensor
    : inputs

  // Positional embedding
  const range = new Range({}).apply(inputs)
  let posEmb = tf.layers.embedding({
    name: config.name + '/wpe',
    inputDim: config.blockSize,
    outputDim: config.nEmbd,
    embeddingsInitializer: 'zeros'
  }).apply(range) as tf.SymbolicTensor
  
  if (config.debug) {
    posEmb = new LogLayer({ name: 'posEmb' }).apply(posEmb) as tf.SymbolicTensor
  }

  // token and positional embeddings are added together
  let x = tf.layers.add().apply([tokEmb, posEmb])
  // dropout
  x = tf.layers.dropout({name: 'drop', rate: config.embdDrop}).apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'dropadd' }).apply(x)
  }

  //Apply successively transformer blocks, attention and dense layers
  for (let i = 0; i < config.nLayer; i++) {
    x = TransformerBlock(
      Object.assign({}, config, { name: config.name + '/h/' + i }),
    ).apply(x)
  }
  // Normalization
  x = tf.layers.layerNormalization({ name: config.name + '/ln_f', epsilon: 1e-5 })
    .apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'fin/ln' }).apply(x)
  }

  // Append a language modeling head if specified
  if (config.lmHead) {
    x = tf.layers.dense({
      name: 'lm_head',
      units: config.vocabSize,
      inputDim: config.nEmbd,
      inputShape: [config.blockSize, config.nEmbd],
      useBias: false
    }).apply(x)
  }

  return tf.model({ inputs, outputs: x as tf.SymbolicTensor })
}
