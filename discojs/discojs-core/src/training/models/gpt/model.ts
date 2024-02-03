import { GPTConfig, getModelSizes, DEFAULT_CONFIG } from '.'
import { dataset, tf, training } from '../../..'
import { train } from './train'

const Range = (config: any) => new Range_(config)
class Range_ extends tf.layers.Layer {
    computeOutputShape(inputShape: any) {
        return inputShape
    }

    call(input: any, kwargs: any) {
        return tf.tidy(() => {
            if (Array.isArray(input)) {
                input = input[0]
            }
            this.invokeCallHook(input, kwargs)
            const [B, T] = input.shape
            const range = tf.reshape(tf.range(0, T, 1, 'int32'), [1, T]) // .tile([B, 1])
            return range
        })
    }

    static get className() {
        return 'Range'
    }
}
tf.serialization.registerClass(Range_)

const LogLayer = (config: any) => new LogLayer_(config)
class LogLayer_ extends tf.layers.Layer {
    config: any
    constructor(config: any) {
        super(config)
        this.config = config
    }

    computeOutputShape(inputShape: any) {
        return inputShape
    }

    call(input: any, kwargs: any) {
        return tf.tidy(() => {
            if (Array.isArray(input)) {
                input = input[0]
            }
            this.invokeCallHook(input, kwargs)
            const x = tf.util.flatten(input.arraySync())
            console.log(
                this.config.name + '>',
                input.shape,
                x[0],
                x[x.length - 1]
            )
            return input
        })
    }

    static get className() {
        return 'LogLayer'
    }
}
tf.serialization.registerClass(LogLayer_)

const CausalSelfAttentionBase = (config: any) =>
    new CausalSelfAttentionBase_(config)
class CausalSelfAttentionBase_ extends tf.layers.Layer {
    config: any
    blockSize: any
    nHead: any
    nEmbd: any
    dropout: any
    mask: any

    constructor(config: any) {
        super(config)
        this.config = config
        this.blockSize = config.blockSize
        this.nEmbd = config.nEmbd
        this.nHead = config.nHead
        this.dropout = config.dropout
        this.mask = tf.linalg.bandPart(
            tf.ones([config.blockSize, config.blockSize]),
            -1,
            0
        )
    }

    computeOutputShape(inputShape: any) {
        return [null, this.blockSize, this.nEmbd]
    }

    getConfig() {
        const config = super.getConfig()
        return Object.assign({}, config, this.config)
    }

    call(input: any, kwargs: any) {
        return tf.tidy(() => {
            if (Array.isArray(input)) {
                input = input[0]
            }
            this.invokeCallHook(input, kwargs)

            let [q, k, v] = tf.split(input, 3, -1)
            const [B, T, C] = k.shape
            const splitHeads = (x: any) =>
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
            att = tf.add(att, tf.mul(tf.sub(1, this.mask), -1e9))
            att = tf.softmax(att, -1)
            att = kwargs['training'] ? tf.dropout(att, this.dropout) : att

            let y = tf.matMul(att, v)
            y = tf.transpose(y, [0, 2, 1, 3])
            y = tf.reshape(y, [B, T, C])

            return y
        })
    }

    static get className() {
        return 'CausalSelfAttentionBase'
    }
}
tf.serialization.registerClass(CausalSelfAttentionBase_)

function CausalSelfAttentionMixed(conf: any) {
    const config = Object.assign({ name: 'attn' }, conf)
    const csa = CausalSelfAttentionBase(config)
    const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
    let att
    att = tf.layers
        .dense({
            name: config.name + '/c_attn',
            units: 3 * config.nEmbd,
            inputDim: config.nEmbd,
            inputShape: [config.blockSize, config.nEmbd],
            useBias: config.bias,
        })
        .apply(inputs)
    att = csa.apply(att)
    att = tf.layers
        .dense({
            name: config.name + '/proj',
            units: config.nEmbd,
            inputDim: config.nEmbd,
            inputShape: [config.blockSize, config.nEmbd],
            useBias: config.bias,
        })
        .apply(att)
    att = tf.layers
        .dropout({
            name: config.name + '/drop',
            rate: config.dropout,
        })
        .apply(att)
    return tf.model({ inputs: inputs, outputs: att as any })
}

const CausalSelfAttention = (config: any) => new CausalSelfAttention_(config)
class CausalSelfAttention_ extends tf.layers.Layer {
    config: any
    blockSize: any
    nHead: any
    nEmbd: any
    dropout: any
    bias: any
    mask: any

    cAttnKernel: any
    cAttnBias: any
    cProjKernel: any
    cProjBias: any

    constructor(config: any) {
        super(config)
        this.config = Object.assign({ name: 'attn' }, config)
        this.blockSize = config.blockSize
        this.nEmbd = config.nEmbd
        this.nHead = config.nHead
        this.dropout = config.dropout
        this.bias = config.bias
        this.mask = tf.linalg.bandPart(
            tf.ones([config.blockSize, config.blockSize]),
            -1,
            0
        )
    }

    build(inputShape: any) {
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

    computeOutputShape(inputShape: any) {
        return inputShape
    }

    getConfig() {
        const config = super.getConfig()
        return Object.assign({}, config, this.config)
    }

    call(input: any, kwargs: any) {
        return tf.tidy(() => {
            if (Array.isArray(input)) {
                input = input[0]
            }
            this.invokeCallHook(input, kwargs)

            const dense = (x: any, kernel: any, bias: any) => {
                const k = kernel.read().expandDims(0).tile([x.shape[0], 1, 1])
                const m = tf.matMul(x, k)
                if (this.bias) {
                    return tf.add(m, bias.read())
                } else {
                    return m
                }
            }

            const cAttn = dense(input, this.cAttnKernel, this.cAttnBias)

            let [q, k, v] = tf.split(cAttn, 3, -1)
            const [B, T, C] = k.shape

            const splitHeads = (x: any) =>
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
            att = kwargs['training'] ? tf.dropout(att, this.dropout) : att

            let y = tf.matMul(att, v)
            y = tf.transpose(y, [0, 2, 1, 3])
            y = tf.reshape(y, [B, T, C])
            y = dense(y, this.cProjKernel, this.cProjBias)
            y = kwargs['training'] ? tf.dropout(y, this.dropout) : y

            return y
        })
    }

    static get className() {
        return 'CausalSelfAttention'
    }
}
tf.serialization.registerClass(CausalSelfAttention_)

const GELU = () => new GELU_()
class GELU_ extends tf.layers.Layer {
    constructor() {
        super({})
    }

    computeOutputShape(inputShape: any) {
        return inputShape
    }

    call(input: any, kwargs: any) {
        return tf.tidy(() => {
            if (Array.isArray(input)) {
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

    static get className() {
        return 'GELU'
    }
}
tf.serialization.registerClass(GELU_)

function MLP(conf: any) {
    const config = Object.assign({ name: 'mlp' }, conf)
    const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
    let x
    x = tf.layers
        .dense({
            name: config.name + '/c_fc',
            units: 4 * config.nEmbd,
            inputDim: config.nEmbd,
            inputShape: [config.blockSize, config.nEmbd],
        })
        .apply(inputs)
    x = GELU().apply(x)
    x = tf.layers
        .dense({
            name: config.name + '/c_proj',
            units: config.nEmbd,
            inputDim: 4 * config.nEmbd,
            inputShape: [config.blockSize, 4 * config.nEmbd],
        })
        .apply(x)
    x = tf.layers
        .dropout({
            name: config.name + '/drop',
            rate: config.residDrop,
        })
        .apply(x)
    return tf.model({ inputs: inputs, outputs: x as any })
}

function Block(conf: any) {
    const config = Object.assign({ name: 'h' }, conf)
    const inputs = tf.input({ shape: [config.blockSize, config.nEmbd] })
    let x1, x2
    x1 = tf.layers
        .layerNormalization({ name: config.name + '/ln_1', epsilon: 1e-5 })
        .apply(inputs)
    if (config.debug) {
        x1 = LogLayer({ name: config.name + '/ln_1_log' }).apply(x1)
    }
    x1 = CausalSelfAttention(
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
    return tf.model({ name: config.name, inputs: inputs, outputs: x2 as any })
}

function GPT(conf: GPTConfig) {
    const configDefaults = {
        name: 'transformer',
        ...DEFAULT_CONFIG,
    }

    const modelSizes = getModelSizes(conf.modelType)
    const config = Object.assign({}, configDefaults, conf, modelSizes)

    console.log('IN MODEL CONFIG', config)

    const inputs = tf.input({ shape: [null] })

    const tokEmb = config.tokEmb
        ? tf.layers
              .embedding({
                  name: config.name + '/wte',
                  inputDim: config.vocabSize,
                  outputDim: config.nEmbd,
                  embeddingsInitializer: 'zeros',
                  embeddingsRegularizer: undefined,
                  activityRegularizer: undefined,
              })
              .apply(inputs)
        : inputs

    const range = Range({}).apply(inputs)
    let posEmb = tf.layers
        .embedding({
            name: config.name + '/wpe',
            inputDim: config.blockSize,
            outputDim: config.nEmbd,
            embeddingsInitializer: 'zeros',
        })
        .apply(range)
    if (config.debug) {
        posEmb = LogLayer({ name: 'posEmb' }).apply(posEmb)
    }

    let x
    x = tf.layers.add().apply([tokEmb as any, posEmb as any])
    x = tf.layers
        .dropout({
            name: 'drop',
            rate: config.embdDrop,
        })
        .apply(x)
    if (config.debug) {
        x = LogLayer({ name: 'dropadd' }).apply(x)
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
        x = LogLayer({ name: 'fin/ln' }).apply(x)
    }

    if (config.lmHead) {
        x = tf.layers
            .dense({
                name: 'lm_head',
                units: config.vocabSize,
                inputDim: config.nEmbd,
                inputShape: [config.blockSize, config.nEmbd],
                useBias: false,
            })
            .apply(x)
    }
    return tf.model({ inputs: inputs, outputs: x as any })
}

const defaultGenerateConfig = {
    maxNewTokens: 20,
    temperature: 1.0,
    doSample: false,
    topK: null,
}

function prepareIdx(idx: any) {
    tf.tidy(() => {
        if (idx instanceof tf.Tensor) {
            idx = idx.clone()
        } else {
            idx = tf.tensor(idx)
        }
        if (idx.dtype !== 'int32') {
            idx = idx.toInt()
        }
        if (idx.shape.length === 1) {
            idx = idx.expandDims(0)
        }
        tf.keep(idx)
    })
    return idx
}

function generateOnce(model: any, idx: any, config: any) {
    let idxNext
    let timePerToken = performance.now()
    tf.tidy(() => {
        const block_size = model.inputs[0].shape[1]
        const idxCond =
            idx.shape[1] <= block_size
                ? idx
                : idx.slice([0, -block_size], [-1, -1])
        const logits = model.predict(idxCond)
        timePerToken = performance.now() - timePerToken
        const logitsScaled = logits
            .slice([0, idx.shape[1] - 1, 0])
            .reshape([logits.shape[0], logits.shape[2]])
            .div(tf.scalar(config.temperature))
        const probs = logitsScaled.softmax(-1)
        if (config.doSample) {
            idxNext = tf.multinomial(probs, 1)
        } else {
            idxNext = probs.argMax(-1)
            idxNext = idxNext.expandDims(1)
        }
        tf.keep(idxNext)
    })
    return {
        idxNext,
        timePerToken,
    }
}

function generateSync(model: any, idx: any, conf: any, callback: any) {
    const config = Object.assign({}, defaultGenerateConfig, conf)
    idx = prepareIdx(idx)
    for (let step = 0; step < config.maxNewTokens; step++) {
        const { idxNext, timePerToken } = generateOnce(model, idx, config)
        const idxNew = idx.concat(idxNext, 1)
        tf.dispose(idx)
        idx = idxNew
        const idxNextArr = (idxNext as any).arraySync()
        tf.dispose(idxNext)
        if (callback) {
            callback({ idxNext: idxNextArr, timePerToken: timePerToken })
        }
    }
    const idxArr = idx.arraySync()
    tf.dispose(idx)
    return idxArr
}

async function generate(model: any, idx: any, conf: any, callback: any) {
    const config = Object.assign({}, defaultGenerateConfig, conf)
    idx = await prepareIdx(idx)
    for (let step = 0; step < config.maxNewTokens; step++) {
        const { idxNext, timePerToken } = generateOnce(model, idx, config)
        const idxNew = idx.concat(idxNext, 1)
        tf.dispose(idx)
        idx = idxNew
        const idxNextArr = await (idxNext as any).array()
        tf.dispose(idxNext)
        if (callback) {
            await callback({ idxNext: idxNextArr, timePerToken: timePerToken })
        }
    }
    const idxArr = await idx.array()
    tf.dispose(idx)
    return idxArr
}

/**
 * tfjs does not export LazyIterator and Dataset...
 */
declare abstract class LazyIterator<T> {
    abstract next(): Promise<IteratorResult<T>>
}

declare abstract class Dataset<T> {
    abstract iterator(): Promise<LazyIterator<T>>
    size: number
}

class GPTModel extends tf.LayersModel {
    constructor(protected readonly config: any) {
        const gpt = GPT(config)
        const { inputs, outputs, name } = gpt
        super({ inputs, outputs, name })
        Object.assign(this, gpt)
    }

    async fitDataset<T>(
        dataset: Dataset<T>,
        args: tf.ModelFitDatasetArgs<T>
    ): Promise<tf.History> {
        console.log('=== GPTModel custom train function ===')
        const config = { ...this.config, ...args }
        await train(
            this,
            dataset as dataset.Dataset,
            config,
            args.callbacks as training.TrainingCallbacks
        )
        return {} as tf.History
    }

    async load(modelPath: any) {
        this.loadWeights(modelPath)
    }
}

class GPTLMHeadModel extends GPTModel {
    constructor(config: any) {
        super(config)
    }

    async generate(idx: any, conf: any, callback: any) {
        return await generate(this, idx, conf, callback)
    }

    generateSync(idx: any, conf: any, callback: any) {
        return generateSync(this, idx, conf, callback)
    }
}

export { GPT, GPTModel, GPTLMHeadModel, generate, generateSync }
