import { Repeat } from 'immutable'
import * as path from 'node:path'
import '@tensorflow/tfjs-node'

import type { Dataset, DataType, Image, Raw, Task } from '@epfml/discojs'
import { Disco, fetchTasks, defaultTasks } from '@epfml/discojs'
import { loadCSV, loadImagesInDir } from '@epfml/discojs-node'
import { Server } from 'server'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser<D extends DataType>(
  url: URL,
  task: Task<D>,
  dataset: Dataset<Raw[D]>,
): Promise<void> {
  // Create Disco object associated with the server url, the training scheme
  const disco = new Disco(task, url, { scheme: 'federated' })

  // Run training on the dataset
  await disco.trainFully(dataset);

  // Disconnect from the remote server
  await disco.close()
}

type TaskAndDataset<D extends DataType> = [Task<D>, Dataset<Raw[D]>];

async function main (): Promise<void> {
  // Arbitrary chosen Task ID
  const NAME: string = 'titanic'

  // Launch a server instance
  const [server, url] = await new Server().serve(undefined, defaultTasks.simpleFace, defaultTasks.titanic)

  // Get all pre-defined tasks
  const tasks = await fetchTasks(url)

  // Choose the task and load local data
  // Make sure you first ran ./get_training_data
  let taskAndDataset: TaskAndDataset<'image' | 'tabular'>
  switch (NAME) {
    case "titanic": {
      const task = tasks.get("titanic") as Task<"tabular"> | undefined;
      if (task === undefined) throw new Error("task not found");
      taskAndDataset = [task, loadCSV("../../datasets/titanic_train.csv")];
      break;
    }
    case "simple_face": {
      const task = tasks.get("simple_face") as Task<"image"> | undefined;
      if (task === undefined) throw new Error("task not found");
      taskAndDataset = [task, await loadSimpleFaceData()];
      break;
    }
    default:
      throw new Error('task id not found')
  }

  // Add more users to the list to simulate more than 3 clients
  await Promise.all([
    runUser(url, ...taskAndDataset),
    runUser(url, ...taskAndDataset),
    runUser(url, ...taskAndDataset),
  ])

  // Close server
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

async function loadSimpleFaceData(): Promise<Dataset<[Image, string]>> {
  const folder = "../datasets/simple_face";

  const [adults, childs]: Dataset<[Image, string]>[] = [
    (await loadImagesInDir(path.join(folder, "adult"))).zip(Repeat("adult")),
    (await loadImagesInDir(path.join(folder, "child"))).zip(Repeat("child")),
  ];

  return adults.chain(childs);
}

// You can run this example with "npm run train" from this folder
main().catch(console.error)
