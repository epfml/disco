import type { Task, models } from '@epfml/discojs-core'
import {
  Disco, fetchTasks, data, client as clients,
  aggregator as aggregators, informant, serialization
} from '@epfml/discojs-core'
import { NodeTextLoader } from '@epfml/discojs-node'
import fs from 'node:fs/promises'


async function main(): Promise<void> { 
  // Launch a server instance
  const url = new URL('http://localhost:8080')
  const tasks = await fetchTasks(url)
  const task = tasks.get('wikitext-103')
  if (task === undefined) { throw new Error('task not found') }
  const dataset = await loadWikitextData(task)
  const aggregator = new aggregators.MeanAggregator()
  const client = new clients.federated.FederatedClient(url, task, aggregator)
  const trainingInformant = new informant.FederatedInformant(task, 10)
  const disco = new Disco(task, { scheme: 'federated', client, aggregator, informant: trainingInformant })
  await disco.fit(dataset)

  if (aggregator.model === undefined) {
    throw new Error('model was not set')
  }
  let model = aggregator.model as models.GPT
  const sample = 'Hello world'
  const tokenizerName = task.trainingInformation.tokenizerName ?? 'Xenova/gpt2'
  console.log(await model.generate(sample, tokenizerName))
  
  //Save the trained model
  const encoded = await serialization.model.encode(model)
  await fs.writeFile(`model.json`, encoded)
  
  // Load an existing model
  // const content = await fs.readFile(`model.json`)
  // model = await serialization.model.decode(content) as models.GPT
  // console.log(await model.generate(sample, tokenizerName, 10))
  await disco.close()
}

async function loadWikitextData (task: Task): Promise<data.DataSplit> {
  const loader = new NodeTextLoader(task)
  const dataSplit: data.DataSplit = {
    train: await data.TextData.init(await loader.load('../../datasets/wikitext/wiki.train.tokens', {shuffle: false}), task),
    validation: await data.TextData.init(await loader.load('../../datasets/wikitext/wiki.valid.tokens', {shuffle: false}), task)
  }
  return dataSplit
}

// You can run this example with "npm start" from this folder
main().catch(console.error)
