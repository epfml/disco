import type { Task, models } from '@epfml/discojs-core'
import {
  Disco, fetchTasks, data, client as clients,
  aggregator as aggregators, informant
} from '@epfml/discojs-core'
import { NodeTextLoader } from '@epfml/discojs-node'
import * as tf from '@tensorflow/tfjs-node'
import { AutoTokenizer } from '@xenova/transformers';


async function main(): Promise<void> { 
  const tokenizer = await AutoTokenizer.from_pretrained('Xenova/gpt2')
  // tokenizer.length
  // const { input_ids: tokens } = await tokenizer('I love transformers!', {
  //   padding: true,
  //   truncation: true,
  //   max_length: tokenizer.model_max_length,
  //   return_tensor: false
  // })
  // console.log(tf.tensor(tokens, undefined, 'int32'))
  // Launch a server instance
  const url = new URL('http://localhost:8080')
  const tasks = await fetchTasks(url)
  const task = tasks.get('wikitext-103')
  if (task === undefined) { throw new Error('task not found') }
  const dataset = await loadWikitextData(task)
  // console.log(await dataset.train.preprocess().dataset.take(5).toArray())
  // console.log(1)
  const aggregator = new aggregators.MeanAggregator()
  const client = new clients.federated.FederatedClient(url, task, aggregator)
  const trainingInformant = new informant.FederatedInformant(task, 10)
  const disco = new Disco(task, { scheme: 'federated', client, aggregator, informant: trainingInformant })
  await disco.fit(dataset)

  if (aggregator.model === undefined) {
    throw new Error('model was not set')
  }
  const model = aggregator.model as models.GPT
  const sample = 'Hello world,'
  const tokenizerModel = task.trainingInformation.tokenizer ?? 'Xenova/gpt2'
  const predictions = await model.generate(sample, tokenizerModel)
  console.log(predictions)
  await disco.close()
}

async function loadWikitextData (task: Task): Promise<data.DataSplit> {
  const loader = new NodeTextLoader(task)
  const dataSplit: data.DataSplit = {
    train: await data.TextData.init((await loader.load('../../datasets/wikitext/wiki.train.tokens')), task),
    validation: await data.TextData.init(await loader.load('../../datasets/wikitext/wiki.valid.tokens'), task)
  }
  return dataSplit
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
