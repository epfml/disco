import type { Task } from '@epfml/discojs'
import {
  Disco, fetchTasks, data, client as clients,
  aggregator as aggregators, models
} from '@epfml/discojs'
import { NodeTextLoader, saveModelToDisk, loadModelFromDisk } from '@epfml/discojs-node'


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
  if (TRAIN_MODEL) {
    // Load the wikitext dataset from the `datasets` folder
    const dataset = await loadWikitextData(task)
  
    // Initialize a Disco instance and start training a language model
    const aggregator = aggregators.getAggregator(task)
    const client = new clients.federated.FederatedClient(url, task, aggregator)
    const disco = new Disco(task, { scheme: 'federated', client, aggregator })
    await disco.trainFully(dataset);
  
    // Get the model and complete the prompt
    if (aggregator.model === undefined) {
      throw new Error('model was not set')
    }
    // Save the trained model
    model = aggregator.model as models.GPT
    await saveModelToDisk(model, modelFolder, modelFileName)
    await disco.close()
  } else {
    // Load the trained model
    model = await loadModelFromDisk(`${modelFolder}/${modelFileName}`) as models.GPT
  }

  // Retrieve the tokenizer used during training
  const tokenizer = await models.getTaskTokenizer(task)
  const prompt = 'The game began development in 2010 , carrying over a large portion'
  const generation = await model.generate(prompt, tokenizer)
  console.log(generation)
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
