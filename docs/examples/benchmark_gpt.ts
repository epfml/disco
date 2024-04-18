import type { Task } from '@epfml/discojs-core'
import { fetchTasks, data, models } from '@epfml/discojs-core'
import { NodeTextLoader, loadModelFromDisk } from '@epfml/discojs-node'
import * as tf from '@tensorflow/tfjs'

/**
 * Benchmark results are reported in https://github.com/epfml/disco/pull/659
 */

async function main(): Promise<void> { 
  // Launch a server instance
  const url = new URL('http://localhost:8080')
  // Fetch the wikitext task from the server
  const tasks = await fetchTasks(url)
  const task = tasks.get('wikitext-103')
  if (task === undefined) { throw new Error('task not found') }  
  
  const BENCHMARK_TRAIN = true // if false benchmark inference
  if (BENCHMARK_TRAIN) {
    const config: models.GPTConfig = {
      modelType: 'gpt-nano',
      lr: 0.0001,
      maxIter: 10,
      evaluateEvery:10000,
      maxEvalBatches: 10,
      blockSize: 8,
      vocabSize: 50258
    }
    
    const modelType = 'gpt-nano'//['gpt-nano', 'gpt-micro', 'gpt-mini', 'gpt2']
    const contextLength = 256 // [128, 256, 512, 1024, 2048]
    const batchSize = 8 //[8, 16, 32, 64]
    
    console.log(`Begin loop - Memory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`, `Num tensors: ${tf.memory().numTensors}`)
    task.trainingInformation.batchSize = batchSize
    config.modelType = modelType as models.GPTModelType
    task.trainingInformation.maxSequenceLength = contextLength
    config.blockSize = contextLength
    console.log(`\tmodel type ${modelType} \n\tbatch size ${batchSize} \n\tcontext length ${contextLength}`)
    // Reload the dataset to batch it with the right batch size
    const dataset = await loadWikitextData(task)
    const preprocessedDataset = dataset.train.preprocess().batch().dataset
    const model = new models.GPT(config)
    const logGenerator = model.train(preprocessedDataset, undefined, 1)
    for await (const logs of logGenerator) {
      const updateTime = logs.weightUpdateTime ?? 0
      const msPerToken = updateTime / batchSize / contextLength  
      console.log(`\t\t\t${msPerToken.toFixed(2)} ms/token <br> ${logs.peakMemory?.toFixed(2)} GB`)
    }
    model.dispose()

    // Check for memory leak. Currently, there are a few tensors that are still not disposed (one per attention layer in the model)
    console.log(`End loop - Memory: ${(tf.memory().numBytes / 1024 / 1024).toFixed(2)} MB`, `Num tensors: ${tf.memory().numTensors}`)
  } else {
    
    const model = await loadModelFromDisk(`models/model_random.json`) as models.GPT
    // Retrieve the tokenizer used during training
    const tokenizer = await models.getTaskTokenizer(task)
    const prompt = 'The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion,'
    const nbNewTokens = 200
    const iterations = 10
    console.log("Prompt token size", (tokenizer(prompt) as {input_ids: number[]}).input_ids.length)
    console.log("Number new tokens", nbNewTokens)

    let inferenceTime = 0
    let iterationAvgTokenTime = 0
    for (let i = 0; i < iterations; i++) {
      const timeStart = performance.now()
      const { generation: _, avgTokenTime } = await model.generate(prompt, tokenizer, nbNewTokens)
      inferenceTime += performance.now() - timeStart
      iterationAvgTokenTime += avgTokenTime
    }
    // Overall average includes tokenization, token sampling and de-tokenization
    console.log(`Overall average: ${(inferenceTime/ nbNewTokens / iterations).toFixed(2)} ms/token`)
    console.log(`token inference only: ${(iterationAvgTokenTime / iterations).toFixed(2)} ms/token`)
  }
    
}

async function loadWikitextData (task: Task): Promise<data.DataSplit> {
  const loader = new NodeTextLoader(task)
  const dataSplit: data.DataSplit = {
    train: await data.TextData.init(await loader.load('../../datasets/wikitext/wiki.train.tokens', {shuffle: true}), task),
    validation: await data.TextData.init(await loader.load('../../datasets/wikitext/wiki.valid.tokens', {shuffle: true}), task)
  }
  return dataSplit
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
