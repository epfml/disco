import { parse } from "ts-command-line-args";
import * as tf from "@tensorflow/tfjs"
import { AutoTokenizer } from "@xenova/transformers";

import { fetchTasks, models, async_iterator, defaultTasks } from "@epfml/discojs";
import { loadModelFromDisk, loadText } from '@epfml/discojs-node'

import { Server } from "server";

interface CLIArguments{
  modelType?: string; // 'gpt-nano', 'gpt-micro', 'gpt-mini', 'gpt2'
  contextLength?: number; // 128, 256, 512, 1024, 2048
  batchSize?: number; // 8, 16, 32, 64
  inference?: boolean; // benchmark inference if true, training otherwise
  modelPath?: string;
  help?: boolean // print help
}

const parsedArgs = parse<CLIArguments>({
  modelType: { type: String, optional: true, description: "A GPT architecture: 'gpt-nano', 'gpt-micro', 'gpt-mini', 'gpt2'" },
  contextLength: { type: Number, optional: true, description: "The maximum input sequence length to train the model on" },
  batchSize: { type: Number, optional: true, description: "The model training bat size" },
  inference: { type: Boolean, optional: true, description: "Whether to benchmark the model inference or training" },
  modelPath: { type: String, optional: true, description: "If benchmarking inference, the path to the trained model" },
  help: { type: Boolean, optional: true, alias: 'h', description: 'Prints this usage guide' },
}, {helpArg: 'help'});

const defaultArgs: Required<CLIArguments> = {
  modelType: 'gpt-nano',
  contextLength: 128,
  batchSize: 8,
  inference: false,
  modelPath: 'models/model.json',
  help: false
}

// Fill parsed args with default args
const args = { ...defaultArgs, ...parsedArgs }

/**
 * Benchmark results are reported in https://github.com/epfml/disco/pull/659
 */

function intoTFGenerator<T extends tf.TensorContainer>(
  iter: AsyncIterable<T>,
): tf.data.Dataset<T> {
  // @ts-expect-error generator
  return tf.data.generator(async function* () {
    yield* iter;
  });
}

async function main(args: Required<CLIArguments>): Promise<void> { 
  const { inference: benchmarkInference, modelType,
    contextLength, batchSize, modelPath } = args

  // Launch a server instance
  const [server, url] = await new Server().serve(undefined, defaultTasks.wikitext);

  // Fetch the wikitext task from the server
  const tasks = await fetchTasks(url)
  const task = tasks.get('llm_task')
  if (task === undefined) { throw new Error('task not found') }  

  const tokenizerName = task.trainingInformation.tokenizer
  if (typeof tokenizerName !== 'string') throw Error('no tokenizer name specified in the task training information')
  const tokenizer = await AutoTokenizer.from_pretrained(tokenizerName)

  /**
   * Training benchmark
   */
  if (!benchmarkInference) {
    // Benchmark parameters
    const epochsCount = 1
    const iterationsPerEpoch = 10

    const config: models.GPTConfig = {
      modelType: modelType as models.GPTConfig['modelType'],
      maxIter: iterationsPerEpoch,
      blockSize: contextLength,
      lr: 0.0001,
      vocabSize: 50257 // default wikitext task uses the gpt2 tokenizer with vocabSize 50257
    }

    // Load the dataset after setting the Task batch size and max sequence length
    // to make sure the dataset is batched and tokenized correctly
    task.trainingInformation.batchSize = batchSize
    task.trainingInformation.maxSequenceLength = contextLength
    const dataset = loadText(
      '../datasets/wikitext/wiki.train.tokens',
      tokenizer, config.blockSize, batchSize
    )
    // TODO will be easier when preprocessing is redone
    const preprocessedDataset = intoTFGenerator(dataset).map((tokens: number[]) => {
      const ys = tf.oneHot(tokens.slice(1), tokenizer.model.vocab.length)
      const xs = tf.tensor(tokens.slice(0, config.blockSize), undefined, 'int32')
      return {xs, ys}
    }).batch(batchSize) as tf.data.Dataset<{ xs: tf.Tensor2D, ys: tf.Tensor3D }>

    // Init and train the model
    const model = new models.GPT(config)
    console.log(`\tmodel type ${modelType} \n\tbatch size ${batchSize} \n\tcontext length ${contextLength}`)

    let epochTime = performance.now()
    for (let epochsCounter = 1; epochsCounter <= epochsCount; epochsCounter++) {
      const [_, logs] = await async_iterator.gather(model.train(preprocessedDataset))
      epochTime = (performance.now() - epochTime)
      const msPerToken = epochTime / (batchSize * contextLength * iterationsPerEpoch * epochsCounter)
      console.log(`\t\tTraining time: ${msPerToken.toFixed(2)} ms/token <br> ${logs.peakMemory.toFixed(2)} GB`)
    }

  /**
   * Inference benchmark
   */
  } else {
    const model = await loadModelFromDisk(modelPath)
    if (!(model instanceof models.GPT)){
      throw new Error("Loaded model isn't a GPT model")
    }
    
    // Benchmark parameters
    const prompt = 'The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion, The game began development in 2010 , carrying over a large portion,'
    const maxNewTokens = 200
    const iterations = 10
    console.log("Generating", maxNewTokens, "new tokens")

    let inferenceTime = 0
    for (let i = 0; i < iterations; i++) {
      const timeStart = performance.now()
      const _ = await model.generate(prompt, tokenizer, { maxNewTokens })
      inferenceTime += performance.now() - timeStart
    }
    // Overall average includes tokenization, token sampling and de-tokenization
    console.log(`Inference time: ${(inferenceTime/ maxNewTokens / iterations).toFixed(2)} ms/token`)
  }
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

// You can run this example with "npm start" from this folder
main(args).catch(console.error)
