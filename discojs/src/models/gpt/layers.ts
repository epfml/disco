import createDebug from "debug";
import * as tf from '@tensorflow/tfjs'
import type { GPTConfig } from './config.js'
import type { ModelSize } from './config.js'

const debug = createDebug("discojs:models:gpt:layers");

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
      if (Array.isArray(input)) input = input[0]
      this.invokeCallHook(input, kwargs)

      const T = input.shape[1]
      if (T === undefined) throw new Error('unexpected shape')
      return tf.reshape(tf.range(0, T, 1, 'int32'), [1, T])
    })
  }
}
tf.serialization.registerClass(Range)

/**
 * LogLayer is a layer that allows debugging the input that is fed to this layer
 * This layer allows to inspect the input tensor at a specific point 
 * in the model by adding a log layer in the model definition
 */
class LogLayer extends tf.layers.Layer {
  static readonly className = 'LogLayer'

  override computeOutputShape (inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    return inputShape
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (Array.isArray(input)) input = input[0]
      this.invokeCallHook(input, kwargs)

      const logs = {
        // 'shape': input.shape,
        // 'is_only_zero': !!input.equal(tf.tensor(0)).all().dataSync()[0],
        // 'has_some_NaN': !!input.isNaN().any().dataSync()[0],
        'min': +input.min().dataSync()[0].toPrecision(3),
        'max': +input.max().dataSync()[0].toPrecision(3),
      }
      debug("%s logged: %o", this.name, logs)
      return input
    })
  }
}
tf.serialization.registerClass(LogLayer)

type CausalSelfAttentionConfig =
    ConstructorParameters<typeof tf.layers.Layer>[0]
    & Record<'blockSize' | 'nHead' | 'nEmbd' | 'dropout', number>

class CausalSelfAttention extends tf.layers.Layer {
  static readonly className = 'CausalSelfAttention'

  private readonly nHead: number
  private readonly nEmbd: number
  private readonly dropout: number
  private readonly mask: tf.Tensor2D
  cAttnKernel?: tf.LayerVariable
  cAttnBias?: tf.LayerVariable
  cProjKernel?: tf.LayerVariable
  cProjBias?: tf.LayerVariable

  constructor (private readonly config: CausalSelfAttentionConfig) {
    super(config)
    if (config.nEmbd % config.nHead !== 0)
      throw new Error('The embedding dimension `nEmbd` must be divisible by the number of attention heads `nHead`')

    this.nEmbd = config.nEmbd
    this.nHead = config.nHead
    this.dropout = config.dropout

    // mask is a lower triangular matrix filled with 1
    // calling bandPart zero out the upper triangular part of the all-ones matrix
    // from the doc: tf.linalg.band_part(input, -1, 0) ==> Lower triangular part
    this.mask = tf.linalg.bandPart(tf.ones([config.blockSize, config.blockSize]), -1, 0)
  }

  override build (): void {
    // key, query, value projections for all heads, but in a batch
    this.cAttnKernel = this.addWeight(
      'c_attn.weight',
      [this.nEmbd, 3 * this.nEmbd],
      'float32',
      tf.initializers.glorotNormal({})
    )
    this.cAttnBias = this.addWeight(
      'c_attn.bias',
      [3 * this.nEmbd],
      'float32',
      tf.initializers.zeros()
    )
    // output projection
    this.cProjKernel = this.addWeight(
      'c_proj.kernel',
      [this.nEmbd, this.nEmbd],
      'float32',
      tf.initializers.glorotNormal({})
    )
    this.cProjBias = this.addWeight(
      'c_proj.bias',
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

      if (Array.isArray(input)) input = input[0]
      this.invokeCallHook(input, kwargs)

      const dense = (x: tf.Tensor, kernel: tf.LayerVariable, bias: tf.LayerVariable): tf.Tensor => {
        // TODO: use broadcasting when tfjs will support backpropagating through broadcasting
        const k = kernel.read().expandDims(0).tile([x.shape[0], 1, 1])
        const m = x.matMul(k)
        return tf.add(m, bias.read())
      }
      // Apply attention weights to inputs as one big matrix which is then split into the
      // query, key and value submatrices
      // nHead is "number of heads", hs is "head size", and C (number of channels) = n_embd = nHead * hs
      // e.g. in GPT-2 (124M), nHead = 12, hs = 64, so nHead * hs = C = 768 channels in the Transformer
      const cAttn = dense(input, this.cAttnKernel, this.cAttnBias)
      let [q, k, v] = tf.split(cAttn, 3, -1) as [tf.Tensor, tf.Tensor, tf.Tensor]
      const [B, T, C] = k.shape // batch size, sequence length, embedding dimensionality (number of channels)

      const splitHeads = (x: tf.Tensor): tf.Tensor =>
        tf.transpose(
          tf.reshape(x, [B, T, this.nHead, C / this.nHead]), // (B, T, nHead, head size)
          [0, 2, 1, 3] // (B, nHead, T, hs)
        )

      q = splitHeads(q) // (B, nHead, T, hs)
      k = splitHeads(k) // (B, nHead, T, hs)
      v = splitHeads(v) // (B, nHead, T, hs)

      // Scaled self attention: query @ key / sqrt(hs)
      // Matrix representing the token-to-token attention (B, nHead, T, T)
      let att = tf.mul(
        tf.matMul(q, k, false, true), // (B, nHead, T, hs) x (B, nHead, hs, T) -> (B, nHead, T, T)
        tf.div(1, tf.sqrt(tf.cast(k.shape[k.shape.length - 1], 'float32'))) // 1 / sqrt(hs)
      )
      /**
       * The next operations apply attention only on the past tokens, which is
       * essentially a weighted average of the past tokens with complicated weights,
       * it relies on a mask to not "pay any attention" to future tokens
       */ 
      // mask is lower triangular matrix filled with 1
      const mask = this.mask.slice([0, 0], [T, T]) // (T, T)
      // 1 - mask                   => upper triangular matrix filled with 1
      // (1 - mask) * -10^9         => upper triangular matrix filled with -inf
      // att + ((1 - mask) * -10^9) => lower triangular part is the same as the `att` matrix
      //                               upper triangular part is -inf
      att = tf.add(att, tf.mul(tf.sub(1, mask), -1e9)) // (B, nHead, T, T)
      // applying softmax zeroes out the upper triangular part (softmax(-inf) = 0)
      // i.e., zeroes out future tokens's attention weights
      // and creates a probability distribution for the lower triangular
      // (attention weights of past tokens). The probability distribution ensures
      // that the attention weights of past tokens for a particular token sum to one
      att = tf.softmax(att, -1)
      att = kwargs.training === true ? tf.dropout(att, this.dropout) : att

      // This is where the (attention-)weighted sum of past values is performed
      let y = tf.matMul(att, v) // (B, nHead, T, T) x (B, nHead, T, hs) -> (B, nHead, T, hs)
      y = tf.transpose(y, [0, 2, 1, 3]) // (B, T, nHead, hs)
      y = tf.reshape(y, [B, T, C]) // (B, T, C = nHead * hs)
      y = dense(y, this.cProjKernel, this.cProjBias) // output projection (B, T, C)
      y = kwargs.training === true ? tf.dropout(y, this.dropout) : y
      return y
    })
  }
}
tf.serialization.registerClass(CausalSelfAttention)

/**
 * GELU with tanh approximate
 * GELU(x) = x * 0.5 * (1 + Tanh[sqrt(2/π) * (x + 0.044715 * x^3)])
 * 
 * https://pytorch.org/docs/stable/generated/torch.nn.GELU.html
 */
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
      const cdf = tf.mul( // 0.5 * (1 + Tanh[sqrt(2/π) * (x + 0.044715 * x^3)])
        0.5, 
        tf.add(
          1,
          tf.tanh( // Tanh[sqrt(2/π) * (x + 0.044715 * x^3)]
            tf.mul(
              tf.sqrt(tf.div(2, Math.PI)), // (sqrt(2/π)
              tf.add(input, tf.mul(0.044715, tf.pow(input, 3))) // (x + 0.044715 * x^3)
            )
          )
        )
      )
      return tf.mul(input, cdf) // x * 0.5 * (1 + Tanh[sqrt(2/π) * (x + 0.044715 * x^3)])
    })
  }
}
tf.serialization.registerClass(GELU)

type MLPConfig = ConstructorParameters<typeof tf.layers.Layer>[0] &
  Required<ModelSize> & Record<'blockSize' | 'residDrop', number>

function MLP(config: MLPConfig): tf.LayersModel {
  return tf.sequential({ layers: [
    tf.layers.dense({
      name: config.name + `.mlp.c_fc`,
      units: 4 * config.nEmbd,
      inputDim: config.nEmbd,
      inputShape: [config.blockSize, config.nEmbd]
    }),
    new GELU(),
    tf.layers.dense({
        name: config.name + '.mlp.c_proj',
        units: config.nEmbd,
        inputDim: 4 * config.nEmbd,
      inputShape: [config.blockSize, 4 * config.nEmbd]
      }),
      tf.layers.dropout({
        name: config.name + '.mlp.drop',
        rate: config.residDrop
      }),
  ]})
}

type BlockConfig = CausalSelfAttentionConfig & MLPConfig & { debug: boolean }

/**
 * Performs the following operations:
 * x1 = input + mlp(layernorm_1(input))
 * output = x1 + mlp(layernorm_2(x1))
 */
function TransformerBlock (conf: BlockConfig): tf.LayersModel {
  const config = Object.assign({ name: '.h' }, conf)
  const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
  let x1, x2
  // input normalization
  x1 = tf.layers.layerNormalization({
    name: config.name + '.ln_1',
    epsilon: 1e-5,
    gammaInitializer: 'ones', // already the default but make it explicit
    betaInitializer: 'zeros',
  }).apply(inputs)

  if (config.debug) {
    x1 = new LogLayer({ name: config.name + '.ln_1_log' }).apply(x1)
  }
  // self attention layer
  x1 = new CausalSelfAttention(
    Object.assign({}, config, { name: config.name + '.attn' }),
  ).apply(x1)

  if (config.debug) {
    x1 = new LogLayer({ name: config.name + '.attn_log' }).apply(x1)
  }

  // Residual connection
  x1 = tf.layers.add().apply([inputs, x1 as tf.SymbolicTensor])
  if (config.debug) {
    x1 = new LogLayer({ name: config.name + '.residual_log' }).apply(x1)
  }
  // normalization 
  x2 = tf.layers.layerNormalization({
      name: config.name + '.ln_2',
      epsilon: 1e-5,
      gammaInitializer: 'ones',
      betaInitializer: 'zeros',
  }).apply(x1)
  if (config.debug) {
    x2 = new LogLayer({ name: config.name + '.ln_2_log' }).apply(x2)
  }
  
  // MLP 
  x2 = MLP(Object.assign({}, config, { name: config.name + '.mlp' })).apply(x2)
  if (config.debug) {
    x2 = new LogLayer({ name: config.name + '.mlp_log' }).apply(x2)
  }
  // add attention output to mlp output
  x2 = tf.layers.add().apply([x1 as tf.SymbolicTensor, x2 as tf.SymbolicTensor])
  if (config.debug) {
    x2 = new LogLayer({ name: config.name + '.add_log' }).apply(x2)
  }

  return tf.model({ name: config.name, inputs, outputs: x2 as tf.SymbolicTensor })
}


/**
 * LanguageModelEmbedding is a layer that combines the token embeddings and the language modeling head
 * I.e. LMEmbedding is used to translate token indices into token embeddings
 * as well as to project embeddings back into token indices
 * The GPT2 model uses the same embedding matrix for both the token embeddings and the language modeling head
 * Because Tensorflow.js doesn't offer an easy weight sharing mechanism, we need to define a custom layer
 * that can be used for both the token embeddings and the language modeling head.
 * In the GPT2 model definition, this layers corresponds to wte and lm_head (which reuses wte)
 */
class LMEmbedding extends tf.layers.Layer {
  static readonly className = 'LMEmbedding'
  embeddings?: tf.LayerVariable

  constructor(private readonly vocabSize: number, private readonly nEmbd: number) {
    super({})
  }
  override build(): void {
    this.embeddings = this.addWeight(
      'wte', //use same name as GPT2
      [this.vocabSize, this.nEmbd],
      'float32',
      tf.initializers.randomNormal({})
    )
  }

  override computeOutputShape(inputShape: tf.Shape | tf.Shape[]): tf.Shape | tf.Shape[] {
    let shape: tf.Shape
    if (Array.isArray(inputShape) && Array.isArray(inputShape[0])) shape = inputShape[0]
    else shape = inputShape as tf.Shape
    // input shape for the token embedding
    if (shape.length === 2) {
      // https://github.com/tensorflow/tfjs/blob/3daf152cb794f4da58fce5e21e09e8a4f89c8f80/tfjs-layers/src/layers/embeddings.ts#L155
      // batch size and sequence length are undetermined 
      // so the output shape is [null, null, nEmbd]
      return [...shape, this.nEmbd]
    }
    // input shape for the language modeling head
    // https://github.com/tensorflow/tfjs/blob/3daf152cb794f4da58fce5e21e09e8a4f89c8f80/tfjs-layers/src/layers/core.ts#L258
    else if (shape.length === 3) {
      shape[2] = this.vocabSize
      return shape // [null, null, vocabSize]
    }
    else throw new Error('unexpected input shape')
  }

  override call (input: tf.Tensor | tf.Tensor[], kwargs: Record<string, unknown>): tf.Tensor | tf.Tensor[] {
    return tf.tidy(() => {
      if (this.embeddings === undefined) throw new Error('not built')
      if (Array.isArray(input)) input = input[0]
      this.invokeCallHook(input, kwargs)
      
      // If the input is a 2D tensor, it is a batch of sequences of tokens
      // so we translate the tokens into embeddings 
      // using `this.embeddings` as a lookup table
      if (input.shape.length === 2) {
        // (batch_size, sequence_length) => (batch_size, sequence_length, nEmbd)
        return tf.gather(this.embeddings.read(), tf.cast(input, 'int32'), 0)
      }
      // If the input is a 3D tensor, it is a sequence of embeddings
      // so we apply a dense layer to project the embeddings back into the vocabulary space
      else if (input.shape[2] === this.nEmbd) {
        // Replicate the kernel for each batch element
        const kernel = this.embeddings.read().expandDims(0).tile([input.shape[0], 1, 1])
        // TODO: rely on broadcasting when tfjs will support backpropagating through broadcasting
        // Remove the tile, or use tf.einsum('BTE,VE->BTV', input, this.embeddings.read())
        // to prevent tensor duplication but tensorflow.js fails to backpropagate einsum
        // https://github.com/tensorflow/tfjs/issues/5690

        // (batch_size, sequence_length, nEmbd) x (vocabSize, nEmbd)^T -> (batch_size, sequence_length, vocabSize)
        return tf.matMul(input, kernel, false, true)
      } else {
        throw new Error('unexpected input shape for token embeddings')
      }
    })
  }
}
tf.serialization.registerClass(LMEmbedding)

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

  // token embedding
  const wte = new LMEmbedding(config.vocabSize, config.nEmbd)
  let tokEmb = wte.apply(inputs) as tf.SymbolicTensor // (batch_size, input length T, nEmbd)
  
  if (config.debug) {
    tokEmb = new LogLayer({ name: 'tokEmb_log' }).apply(tokEmb) as tf.SymbolicTensor
  }
  // Positional embedding
  const range = new Range({}).apply(inputs)
  let posEmb = tf.layers.embedding({
    name: config.name + '.wpe',
    inputDim: config.blockSize,
    outputDim: config.nEmbd,
    embeddingsInitializer: 'zeros'
  }).apply(range) as tf.SymbolicTensor
  
  if (config.debug) {
    posEmb = new LogLayer({ name: 'posEmb_log' }).apply(posEmb) as tf.SymbolicTensor
  }

  // token and positional embeddings are added together
  let x = tf.layers.add().apply([tokEmb, posEmb])
  // dropout
  x = tf.layers.dropout({name: 'drop', rate: config.embdDrop}).apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'drop_log' }).apply(x)
  }

  // apply successively transformer blocks, attention and dense layers
  for (let i = 0; i < config.nLayer; i++) {
    x = TransformerBlock(
      Object.assign({}, config, { name: config.name + '.h' + i }),
    ).apply(x)
  }
  // Normalization
  x = tf.layers.layerNormalization({ name: config.name + '.ln_f', epsilon: 1e-5 })
    .apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'ln_f_log' }).apply(x)
  }

  // language modeling head
  // GPT2 uses the same matrix for the token embedding and the modeling head
  x = wte.apply(x)
  if (config.debug) {
    x = new LogLayer({ name: 'lm_head_log' }).apply(x)
  }

  return tf.model({ inputs, outputs: x as tf.SymbolicTensor })
}
