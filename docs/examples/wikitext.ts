import "@tensorflow/tfjs-node"

import { Disco, fetchTasks, models } from '@epfml/discojs'
import { saveModelToDisk, loadModelFromDisk, loadText } from '@epfml/discojs-node'

async function main(): Promise<void> { 
  // Launch a server instance
  const url = new URL('http://localhost:8080')
  
  // Fetch the wikitext task from the server
  const tasks = await fetchTasks(url)
  const task = tasks.get('llm_task')
  if (task === undefined) { throw new Error('task not found') }
  
  let model;
  const modelFolder = './models'
  const modelFileName = 'model_random.json'

  // Toggle TRAIN_MODEL to either train and save a new model from scratch or load an existing model
  const TRAIN_MODEL = true

  // Retrieve the tokenizer 
  const tokenizer = await models.getTaskTokenizer(task)
  if (TRAIN_MODEL) {
    const blockSize = task.trainingInformation.maxSequenceLength ?? 128
    const batchSize = task.trainingInformation.batchSize
    // Load the wikitext dataset from the `datasets` folder
    const dataset = loadText("../../datasets/wikitext/wiki.train.tokens", tokenizer, blockSize, batchSize)
      .chain(loadText("../../datasets/wikitext/wiki.valid.tokens", tokenizer, blockSize, batchSize));
  
    // Initialize a Disco instance and start training a language model
    const disco = new Disco(task, url, { scheme: 'federated' })
    await disco.trainFully(["text", dataset]);
  
    // Get the model and save the trained model
    model = disco.trainer.model as models.GPT
    await saveModelToDisk(model, modelFolder, modelFileName)
    await disco.close()
  } else {
    // Load the trained model
    model = await loadModelFromDisk(`${modelFolder}/${modelFileName}`) as models.GPT
  }
  const prompt = 'The game began development in 2010 , carrying over a large portion'
  const generation = await model.generate(prompt, tokenizer)
  console.log(generation)
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
