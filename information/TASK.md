# Custom Tasks

DiscoJS currently provides several pre-defined popular tasks such as titanic, cifar10, and mnist. In order
to understand how to add your own custom task, we will go over how we would add a new task called `my_new_task` to discojs.

## Procedure

In order to add simple-face to discojs, we first need to create and export a new instance of the `Task` class.
Then, we must also export a function called `model` that specifies a model architecture for the task.
We have to remember to export the task and the function in the `index.ts` file which lives in the same folder.

Finally, we need to rebuild discojs.

### Task

## Making the task visible to the API

The [`Task`](../discojs/src/task/task.ts) interface is the first piece of the puzzle, this contains all the crucial information from training to mode.
We start by creating a `my_new_task.ts` file and place it at the same path as the other tasks (currently this is under `discojs/src/tasks/`).
After this make sure to include its reference in the `discojs/src/tasks/index.ts` file as follows:

```js
export * as cifar10 from './cifar10'
export * as lus_covid from './lus_covid'
export * as mnist from './mnist'
export * as my_new_task from './my_new_task' // <---- including our new custom task!
export * as titanic from './titanic'
```

This ensure that the task is properly exposed and thus the server will also be able to see and serve it.

## Model

Start by creating a function in `my_new_task.ts` called `model` that returns the `tf.LayersModel`. In this example we programatically 
define our model.

After exporting the Task, you need to also export a function called `model` that returns the layers model. If you use a 
pre-trained model, you can simply load and return said model in the function via `tf.loadLayersModel(modelPath)`.

> Note, it's important to add the `export` tag to the model as well as to the subsequent objects that we define.

```js
export function model (_: string): tf.LayersModel {
  // Init model
  const model = tf.sequential()

  // Add layers
  model.add(...)
  
  return model

```

Alternatively we can also load a pre-existing model; if we only provide a `model.json` file, then only the architecture of the model will be 
loaded. If however in the same path we also include `weights.bin`, then pre-trained weights stored in these files will also be loaded to the model.

```js
export async function model (modelPath: string): Promise<tf.LayersModel> {
  return await tf.loadLayersModel(`file://${modelPath}`)
}
```

The models are stored in `disco/server/models/`, and it is also in the server side that we let disco know where exactly they are saved. In particular,
if we look at `server/src/tasks.ts`, it is done as follows for simple face (for our custom task we simply need to set
our task with the model path).

```js
const simpleFaceModelPath = path.join(CONFIG.modelsDir, 'mobileNetV2_35_alpha_2_classes', 'model.json')

// TODO, to add a custom model for a task, add the path here
const MODEL_PATH = Map<string, string>()
  .set(defaultTasks.simple_face.task.taskID, simpleFaceModelPath)

```

> If you are using a pre-existing model, and the data shape does not match the input of the model, then it is possible
to use preprocessing functions to resize the data (we also describe how to add custom preprocessing).

## Task

The `Task` class contains all the crucial information for training the model (batchSize, learningRate, ...) and also the 
scheme of distributed learning (federated or decentralized), along with other meta data about the model and data.

As an example, the task class for `simple-face` can be found [here](../discojs/src/tasks/simple_face.ts), suppose
our own task is a binary classification for age detection (similar to simple face), then we could write:

```js
import { ImagePreprocessing } from '../dataset/preprocessing'

export const task: Task = {
  taskID: 'my_new_task',
  displayInformation: {
    taskTitle: 'My new task',
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
    modelID: 'my_new_task-model',
    epochs: 50,
    roundDuration: 1,
    validationSplit: 0.2,
    batchSize: 10,
    preprocessingFunctions: [ImagePreprocessing.Normalize],
    learningRate: 0.001,
    modelCompileData: {
      optimizer: 'sgd',
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    },
    dataType: 'image',
    ...
  }
}
```

The `Task` interface has three fields: a mandatory `taskID` (of `string` type), an optional `displayInformation`, and an optional `trainingInformation`. The interfaces for the optional fields are [`DisplayInformation`](../discojs/src/task/display_information.ts) and [`TrainingInformation`](../discojs/src/task/training_information.ts).

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

## Preprocessing

In the Task object we can optionally choose to add preprocessing functions. Preprocessing is defined [here](../discojs/src/dataset/preprocess.ts),
and is currently only implemented for images (e.g. resize, normalize, ...).

Suppose we want our custom preprocessing that divides each pixel value by 2. In the [preprocessing](../discojs/src/dataset/preprocess.ts) file, 
first we add the enum of our custom function:

```js
export enum ImagePreprocessing {
  Normalize = 'normalize',
  Resize = 'resize',
  Custom = 'custom'
}
```

### Rebuild

Then we define our custom function

```js
function custom (image: tf.Tensor3D): tf.Tensor3D {
return image.div(tf.scalar(2))
}
```

And then we include said function to the preprocessing

```js
export function getPreprocessImage (info: TrainingInformation): PreprocessImage {
  const preprocessImage: PreprocessImage = (image: tf.Tensor3D): tf.Tensor3D => {
    ...
    ...
    ...
    if (info.preprocessFunctions.includes(ImagePreprocessing.Custom)) {
      image = custom(image)
    }
    return image
  }
  return preprocessImage
}
```

Finally, in our task we need to add our custom preprocessing

```js
import { ImagePreprocessing } from '../dataset/preprocessing'

export const task: Task = {
  taskID: 'My_task',
  ...
  ...
    trainingInformation: {
    ...
    ...
    preprocessingFunctions: [ImagePreprocessing.Custom],
    ...
    ...
  }
}
```

> Note that you need to rebuild discojs every time you make changes to it (`cd discojs; rm -rf dist/; npm run build`).
