import * as tf from "@tensorflow/tfjs-node"
import { AutoTokenizer } from "@xenova/transformers";
import { models, processing } from "@epfml/discojs";

async function main(): Promise<void> { 
  const data = "Lorem ipsum dolor sit amet, consectetur adipis"
  const datasetSource = new tf.data.FileDataSource(Buffer.from(data))
  const textDataset = new tf.data.TextLineDataset(datasetSource)

  const config: models.GPTConfig = {
    modelType: 'gpt-nano',
    lr: 0.01,
    maxIter: 50,
    evaluateEvery:50,
    maxEvalBatches: 10,
    blockSize: 16,
    vocabSize: 50257,
    debug: false
  }

  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
  const tokenDataset = textDataset.map((text: string) => {
    const tokens = processing.tokenizeAndLeftPad(text, tokenizer, config.blockSize + 1)
    const ys = tf.oneHot(tokens.slice(1), tokenizer.model.vocab.length)
    const xs = tf.tensor(tokens.slice(0, config.blockSize), undefined, 'int32')
    return {xs, ys}
  }).repeat().batch(16) as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>
  
  const model = new models.GPT(config)
  
  for await (const logs of model.train(tokenDataset, undefined)) {
    console.log(logs)
  }

  const generation = await model.generate("Lorem", tokenizer, { maxNewTokens: 10, doSample: false, topk: 5, temperature:0.1 })
  console.log(generation)
}

// You can run this example with "npm run run_gpt" from this folder
main().catch(console.error)
