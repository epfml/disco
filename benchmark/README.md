# CLI benchmark

Welcome to the Disco🔮 command line interface (CLI). This is a easy to use browserless node based
engine that can train a model locally or in a distributed fashion (either federated or decentralized).
Via the CLI you can simulate multiple clients and log training and validation accuracy as well as the 
loss of each client.
The Disco CLI allows one to benchmark or simply play around with `discojs` in order to see the performance
of distributed learning. It is possible to pass key arguments such as the number of users, round duration (how 
frequently the clients communicate with each other), ...

To run cifat10, 4 federated clients for 15 epochs with a round duration of 5, all you have to do is type

```
npm run benchmark -- --task cifar10 --numberOfUsers 4 --epochs 15 --roundDuration 5
```

or also using the shorter alias notation

```
npm run benchmark -- -t cifar10 -u 4 -e 15 -r 5
```

## Quick-install guide

- install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
- clone this repository
- `npm ci` within `discojs`, `server` and `benchmark`
- `cd discojs; rm -rf dist; npm run build`

## Running the benchmark

- `cd benchmark`
- `npm run benchmark` to run the benchmark with the default setting, to see the available flags run
- `npm run benchmark -- --help`

## Custom Tasks

DiscoJS currently provides several pre-define popular tasks such as titanic, simple-face and cifar10. In order
to understand how to add your own custom task, we will go over how we added simple-face to discojs.

### Task

The `Task` class is the first piece of the puzzle, this contains all the crucial information from training to mode.

The task class for simple face can be found in [discojs/src/tasks/simple_face.ts](../discojs/src/tasks/simple_face.ts),
and the contents look as follows. (For brevity we have replaced some lines with ...).

Note that the preprocessFunctions are not yet supported via the Task object, we will explain after how to add a it
via the data loader.

After exporting the Task, you need to also export a function called `model` that returns the layers model. If you use a 
pre-trained model, you can simply load and return said model in the function via `tf.loadLayersModel(modelPath)`.

```js
import * as tf from '@tensorflow/tfjs'

import { Task } from '../task'

export const task: Task = {
  taskID: 'simple_face',
  displayInformation: {
    taskTitle: 'Simple Face',
    summary: 'Can you detect if the person in a picture is a child or an adult?',
    ...
  },
  trainingInformation: {
    modelID: 'simple_face-model',
    epochs: 50,
    roundDuration: 1,
    validationSplit: 0.2,
    batchSize: 10,
    preprocessFunctions: [],
    learningRate: 0.001,
    modelCompileData: {
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    csvLabels: false,
    IMAGE_H: 200,
    IMAGE_W: 200,
    LABEL_LIST: ['child', 'adult'],
    scheme: 'Federated'
  }
}

export function model (): tf.LayersModel {
  // Init model
  const model = tf.sequential()

  // Add layers
  model.add(...)

  return model
```

After adding the `simple_face.ts` task class, we also need to export it in the `index.ts` file which lives in the same folder.

The contents of `index.ts` are as follows

```js
export * as cifar10 from './cifar10'
export * as lus_covid from './lus_covid'
export * as mnist from './mnist'
export * as simple_face from './simple_face' // <---- 
export * as titanic from './titanic'
```

This allows us to access our task as via discojs:

```js

import { tasks } from 'discojs'

const TASK = tasks.simple_face.task
```

> Note that you need to rebuild discojs every time you make changes to it (`cd discojs; rm -rf dist/; npm run build`).

### Dataset

The only thing missing is loading the data, we use our own data class that is a wrapper for the `tfjs` dataset class.

The key class (for images) is the ImageLoader, this needs to be extended since files are loaded differently depending
on the environment (node vs browser). Note this is also where we can add pre-processing, here we simply normalise the 
images, but more complex operations can also be added.

Once we have built this object we can load the dataset by giving as an input the `files: string[]` and `labels: number[]`.
We give an example of what this looks like down bellow.

```js
import * as tf from '@tensorflow/tfjs-node'
import fs from 'fs'
import {dataset, Task} from 'discojs'

class NodeImageLoader extends dataset.ImageLoader<string> {
  async readImageFrom(source: string): Promise<tf.Tensor3D> {
    const imageBuffer = fs.readFileSync(source)
    let tensor = tf.node.decodeImage(imageBuffer)
    // <---- Add pre processing here!
    // e.g: If resize needed uncomment the following
    // tensor = tf.image.resizeBilinear(tensor, [
    //   32, 32
    // ])
    tensor = tensor.div(tf.scalar(255))
    return tensor as tf.Tensor3D
  }
}

...

export async function simplefaceData(task: Task): Promise<dataset.DataTuple> {
  
  ...

  return await new NodeImageLoader(task).loadAll(files, {labels: labels})
}


```

Example of `files` and `labels` content. 

```js
{ labels: [ 0, 0, 0, 1, 1, 1 ] }
{
  files: [
    './../discojs/example_training_data/simple_face/child/12.png',
    './../discojs/example_training_data/simple_face/child/141.png',
    './../discojs/example_training_data/simple_face/child/143.png',
    './../discojs/example_training_data/simple_face/adult/9417.png',
    './../discojs/example_training_data/simple_face/adult/9429.png',
    './../discojs/example_training_data/simple_face/adult/9462.png'
  ]
}
```
