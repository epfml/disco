import { dataset, tf, training } from '../../..'
import { AdamW, clipByGlobalNormObj } from './optimizers'
import { GPTConfig, DEFAULT_CONFIG } from './config'
import evaluate from './evaluate'

export type GPTConfigWithWandb = Required<GPTConfig>

export const getConfig = (config: GPTConfig): GPTConfigWithWandb => ({
    ...DEFAULT_CONFIG,
    ...config,
})

const getCustomAdam = (model: any, c: Required<GPTConfig>): tf.Optimizer => {
    const includeInWeightDecay: string[] = []
    const excludeFromWeightDecay: string[] = []

    model.getNamedWeights().forEach((v: any) => {
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
        learningRate: c.lr,
        weightDecayRate: c.weightDecay,
        includeInWeightDecay,
        excludeFromWeightDecay,
    })
}

export async function train(
    model: tf.LayersModel,
    ds: dataset.Dataset,
    config: GPTConfig,
    callbacks: training.TrainingCallbacks,
    evalDs?: dataset.Dataset
): Promise<void> {
    const c = getConfig(config)
    console.log(c)

    const opt = c.weightDecay ? getCustomAdam(model, c) : tf.train.adam(c.lr)

    await callbacks.onTrainBegin()

    let epoch = 1
    let iteration = 1
    let iterator = await ds.iterator()

    const start = Date.now()
    let time = start

    console.warn('=== Starting training ===')
    await callbacks.onEpochBegin(epoch)

    while (true) {
        await callbacks.onBatchBegin(iteration)

        // Get new batch of x and y
        let datasetTime = Date.now()
        let next = await iterator.next()
        if (next.done) {
            await callbacks.onEpochEnd(epoch)
            epoch++
            if (c.epochs && epoch > c.epochs) {
                break
            }
            await callbacks.onEpochBegin(epoch)
            iterator = await ds.iterator()
            next = await iterator.next()
        }
        const { xs, ys } = next.value

        datasetTime = Date.now() - datasetTime

        let iterationTime = Date.now()

        // Calculates loss, computes gradients and applies them
        const loss = tf.tidy(() => {
            let { grads, value: loss } = opt.computeGradients(() => {
                const logits = model.apply(xs)
                const loss = tf.losses.softmaxCrossEntropy(ys, logits)
                return loss as tf.Scalar
            })
            let gradsClipped = clipByGlobalNormObj(grads, 1)
            opt.applyGradients(gradsClipped)
            return loss
        })

        const lossVal = await loss.array()

        await callbacks.onBatchEnd(iteration)

        // Create a WandB log payload, evaluate every
        const memory = tf.memory().numBytes * 0.000001
        const payload = {
            'train/perplexity': Math.exp(lossVal),
            'train/loss': lossVal,
            iter: iteration,
            'tf-mem': memory, // MB
            dt_ms: Date.now() - time,
            time_s: (Date.now() - start) / 1000,
        }

        if (c.evaluate && iteration % c.evaluateEvery === 0) {
            if (!evalDs) {
                throw new Error(
                    'No evaluation dataset provided but config.evaluate is set'
                )
            }
            const evalPayload = await evaluate(model, evalDs, c)
            Object.assign(payload, evalPayload)
        }

        console.log(payload)
        time = Date.now()

        tf.dispose([loss, xs, ys])

        iterationTime = Date.now() - iterationTime
        console.log(
            `Epoch: ${epoch},\tStep: ${iteration} / ${
                c.maxIter
            },\tLoss: ${lossVal.toFixed(
                3
            )},\tIteration time: ${iterationTime} ms, \tDataset time: ${datasetTime} ms,\tMemory: ${memory.toFixed(
                2
            )} MB`
        )

        // Check if we should stop
        iteration++
        if (c.maxIter && iteration > c.maxIter) {
            break
        }

        if (c.verbose) {
            console.log('Mem:', tf.memory())
            console.log(`Epoch: ${epoch}, Step: ${iteration}, Loss: ${lossVal}`)
        }

        await new Promise((resolve) => setTimeout(resolve, 1))
    }

    await callbacks.onTrainEnd()
}
