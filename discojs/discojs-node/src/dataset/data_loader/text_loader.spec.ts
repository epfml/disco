import fs from 'fs'
import path from 'path'
import { describe, test, expect } from 'bun:test'
import { encode, decode } from 'gpt-tokenizer/model/text-davinci-003'

import { tf, defaultTasks, dataset } from '../..'
import { NodeTextLoader } from '.'

/**
 * ================================================
 * Assumes you have followed the installation steps
 * in disco/experiment (see README.md)
 * ================================================
 */

const datasetsFolder = path.join(
    /* @ts-ignore */
    import.meta.dir,
    '../../../../../experiment',
    'datasets',
    'wikitext-103'
)
const trainFile = 'test'

const source: dataset.TextSource = {
    train: [path.join(datasetsFolder, `${trainFile}.tokens`)],
    // validation: [path.join(datasetsFolder, 'validation.tokens')],
}

const task = defaultTasks.wikitext.getTask()
const config = {
    ...task.trainingInformation.modelConfig,
    blockSize: 16,
    batchSize: 4,
    vocabSize: 50257,
}

const BENCHMARK_ITERATIONS = 1_000
const BENCHMARK_BATCH_SIZES = [4, 16, 32]
const BENCHMARK_BLOCK_SIZES = [64, 128, 256, 512]

// config: gpt.GPTConfig
const getDataset = async (config: Partial<dataset.TextConfig>) => {
    const loaded = await new NodeTextLoader(task).loadAll(source, config)
    const ds = loaded.train.dataset as dataset.TokenizedDataset
    return ds
}

// config: gpt.GPTConfig
const getIterator = async (config: Partial<dataset.TextConfig>) => {
    const ds = await getDataset(config)
    const iter = await ds.iterator()
    return {
        next: async () => {
            const { value } = (await iter.next()) as dataset.TokenizedIterResult
            return { xs: value.xs, ys: value.ys }
        },
    }
}

const getIteratorArray = async (config: any) => {
    const iter = await getIterator(config)
    return {
        next: async () => {
            const { xs, ys } = await iter.next()
            const x = await xs.array()
            const y = await (ys.argMax(2) as tf.Tensor2D).array() // get indices of max values along last axis
            return { x, y }
        },
    }
}

/**
 * Reads the RAW dataset (not preprocessed) and tokenizes the equivalent of the first batch.
 */
const getRawTokenizedSample = async (
    sampleSize: number,
    tokensLength: number
) => {
    const wikiRaw = fs.createReadStream(path.join(datasetsFolder, trainFile), {
        encoding: 'utf8',
        start: 0,
        end: sampleSize * 1.5, // * 1.5 to make sure we have enough tokens
    })
    const iter = wikiRaw.iterator()
    const { value: chunk } = await iter.next()
    const tokens = encode(chunk).slice(0, tokensLength)
    return tokens
}

const correctShapeTest = (
    xs: tf.Tensor2D,
    ys: tf.Tensor3D,
    config: Required<Omit<dataset.TextConfig, keyof dataset.DataConfig>>
) => {
    expect(xs.shape).toEqual([config.batchSize, config.blockSize])
    expect(ys.shape).toEqual([
        config.batchSize,
        config.blockSize,
        config.vocabSize,
    ])
}

describe('node text loader', () => {
    test('loads a batched sample with correct x and y shapes', async () => {
        const iter = await getIterator(config)
        const { xs, ys } = await iter.next()

        correctShapeTest(xs, ys, config)

        tf.dispose([xs, ys])
    })

    test('x without [0] equals y without [-1]', async () => {
        const TEST_SIZE = 10
        const iter = await getIteratorArray(config)
        for (let i = 0; i < TEST_SIZE; i++) {
            const { x, y } = await iter.next()
            for (let i = 0; i < config.batchSize; i++) {
                // console.log('x=', decode(x_arr[i]).trim())
                // console.log('y=', decode(y_arr[i]).trim())
                expect(x[i].slice(1)).toEqual(y[i].slice(0, -1))
            }
        }
    })

    test('dataset is tokenized properly', async () => {
        const iter = await getIteratorArray(config)
        const { x, y } = await iter.next()

        /**
         * Flatten the batch by taking the first token in x and the rest in y, since y is x shifted by 1 + 1 token
         * e.g. [a, b, c, d, e, f] -> x = [a, b, c, d, e] and y = [b, c, d, e, f]
         * thus x[0] + y = [a, b, c, d, e, f]
         **/
        const sample: number[] = []
        for (let i = 0; i < config.batchSize; i++) {
            sample.push(x[i][0], ...y[i])
        }
        const textLength = decode(sample).length
        const tokens = await getRawTokenizedSample(textLength, sample.length)

        expect(sample.length).toBe(tokens.length)
        expect(sample).toEqual(tokens)
    })

    test(`benchmark ${BENCHMARK_ITERATIONS} iterations for batch sizes: ${BENCHMARK_BATCH_SIZES} and block sizes: ${BENCHMARK_BLOCK_SIZES}`, async () => {
        for (const batchSize of BENCHMARK_BATCH_SIZES) {
            for (const blockSize of BENCHMARK_BLOCK_SIZES) {
                const c = {
                    ...config,
                    batchSize,
                    blockSize,
                }
                const iter = await getIterator(c)
                const benchmarkStart = Date.now()
                for (let i = 0; i < BENCHMARK_ITERATIONS; i++) {
                    const { xs, ys } = await iter.next()
                    if (i === 0) correctShapeTest(xs, ys, c)
                    tf.dispose([xs, ys])
                }
                const benchmarkEnd = Date.now()
                const ms = benchmarkEnd - benchmarkStart
                console.log(
                    `[batchSize=${c.batchSize}, blockSize=${
                        c.blockSize
                    }] Time per iteration: ${(
                        ms / BENCHMARK_ITERATIONS
                    ).toFixed(3)}ms`
                )
            }
        }
    }, 256_000)
})
