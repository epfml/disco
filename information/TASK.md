# Custom Tasks

DiscoJS currently provides several pre-defined popular example tasks such as titanic, cifar10, or simple-face. In order
to understand how to add your own custom task, we will go over how we added simple-face to discojs.

## Procedure

In order to add simple-face to discojs, we first need to create and export a new instance of the `Task` class.
Then, we must also export a function called `model` that specifies a model architecture for the task.
We have to remember to export the task and the function in the `index.ts` file which lives in the same folder.

Finally, we need to rebuild discojs.

### Task

The [`Task`](../discojs/src/task/task.ts) class is the first piece of the puzzle, this contains all the crucial information from training to mode.

The task class for simple face can be found in [here](../discojs/src/tasks/simple_face.ts),
and the contents look as follows. (For brevity we have replaced some lines with ...).

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
    dataType: 'image',
    ...
  }
}
```

### `model` function

After exporting the Task, you need to also export a function called `model` that returns the layers model. If you use a 
pre-trained model, you can simply load and return said model in the function via `tf.loadLayersModel(modelPath)`.

```js
export function model (): tf.LayersModel {
  // Init model
  const model = tf.sequential()

  // Add layers
  model.add(...)

  return model
```

### Export in `index.ts`

After adding the `simple_face.ts` task class, we also need to export it in the `index.ts` file which lives in the same folder.

The contents of `index.ts` are as follows

```js
export * as cifar10 from './cifar10'
export * as lus_covid from './lus_covid'
export * as mnist from './mnist'
export * as simple_face from './simple_face' // <---- 
export * as titanic from './titanic'
```

### Rebuild

> Note that you need to rebuild discojs every time you make changes to it (`cd discojs; rm -rf dist/; npm run build`).
