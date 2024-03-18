import type { Task, models } from '@epfml/discojs-core'
import {
  Disco, fetchTasks, TrainingSchemes, data, client as clients,
  aggregator as aggregators, informant
} from '@epfml/discojs-core'
import { NodeTextLoader } from '@epfml/discojs-node'
import tf from '@tensorflow/tfjs'

async function main (): Promise<void> {
  // Launch a server instance
  const url = new URL('http://localhost:8080')
  const tasks = await fetchTasks(url)
  const task = tasks.get('wikitext-103')
  if (task === undefined) { throw new Error('task not found') }
  const dataset = await loadWikitextData(task)

  const aggregator = new aggregators.MeanAggregator()
  const client = new clients.federated.FederatedClient(url, task, aggregator)
  const trainingInformant = new informant.FederatedInformant(task, 10)
  const disco = new Disco(task, { scheme: TrainingSchemes.FEDERATED, client, aggregator, informant: trainingInformant })
  await disco.fit(dataset)

  if (aggregator.model === undefined) {
    throw new Error('model was not set')
  }
  const model = aggregator.model as models.GPT
  const sample = tf.tensor(['Hello world,'])
  const predictions = await model.generate(sample, 1)
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
