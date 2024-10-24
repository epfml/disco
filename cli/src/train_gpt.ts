import * as tf from "@tensorflow/tfjs-node"
import { AutoTokenizer } from "@xenova/transformers";
import { models } from "@epfml/discojs";
import { loadText } from '@epfml/discojs-node'

function intoTFGenerator<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

async function main(): Promise<void> { 
  
  const config: models.GPTConfig = {
    modelType: 'gpt-nano',
    lr: 0.01,
    maxIter: 10,
    evaluateEvery:50,
    maxEvalBatches: 10,
    blockSize: 16,
    vocabSize: 50257,
    debug: false
  }
  
  const batchSize = 8
  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
  const textDataset = loadText(
    "../datasets/wikitext/wiki.train.tokens",
    tokenizer, config.blockSize, batchSize
  )
  
  const tokenDataset = intoTFGenerator(textDataset).map((tokens: number[]) => {
    const ys = tf.oneHot(tokens.slice(1), tokenizer.model.vocab.length)
    const xs = tf.tensor(tokens.slice(0, config.blockSize), undefined, 'int32')
    return {xs, ys}
  }).batch(batchSize) as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
  
  const model = new models.GPT(config)
  for (let i = 0; i < 6; i++) {
    console.log(`Epoch ${i}`)
    for await (const logs of model.train(tokenDataset, undefined)) {
      console.log(logs)
    }
  }

  const generation = await model.generate("First", tokenizer, { maxNewTokens: 10, doSample: false, topk: 5, temperature:0.1 })
  console.log(generation)
}

// You can run this example with "npm run run_gpt" from this folder
main().catch(console.error)
