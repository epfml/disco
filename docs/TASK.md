# Custom Tasks

Disco.js currently provides several pre-defined popular tasks such as [Titanic](../discojs/discojs-core/src/tasks/titanic.ts), [CIFAR-10](../discojs/discojs-core/src/tasks/cifar10.ts), and [MNIST](../discojs/discojs-core/src/tasks/mnist.ts). In order to understand how to add your own custom task, we will go over how we would add a new task called `my_new_task` to Disco.js.

## Bringing your model in DisCo.

You must first bring your model to a TensorFlow JS format, consisting of a TensorFlow.js model file in a JSON format, and an optional weight file in .bin format if you are . To do so, you might need to define a new Task for your model.


## Simple use case : Using the user interface directly for your task definition
I am a user who wants to define my custom task and upload my model to Disco. For this use case, the .bin weight file is mandatory.
 - Through the user interface, click on the *create* button on "Add your own model to be trained in a DISCOllaborative"
 - Fill in all the relevant information for your task and model
 - Upload the .json + .bin model in the *Model Files* box.
 Your task has been successfully uploaded.


## Procedure

In order to add a new task to Disco.js, we first need to create and export a new instance of the `Task` class, defined [here](../discojs/discojs-core/src/task/task.ts).
Then, we must also export a function called `model` that specifies a model architecture for the task.
We have to remember to export the task and the function in the `index.ts` [file which lives in the same folder](../discojs/discojs-core/src/tasks/index.ts).
Finally, we need to rebuild Disco.js: `cd discojs/ && npm run build`




### Task

For the task creation, we consider the main use case which does not go through the user interface : 

**I am a developper who wants to define my own task**

In this case, your model and task will be uploaded and stored on our DISCO servers. You will have to make the task visible to the API. For your custom model, the JSON model architecture is necessary, but the .bin weight file is optional : if you include the weights file, your model will be loaded with the passed weights. If a weights file is not specified, the weights for the model will be initialized randomly.


## Making the task visible to the API

The [`Task`](../discojs/discojs-core/src/task/task.ts) interface is the first piece of the puzzle, this contains all the crucial information from training to mode.
We start by creating a `my_new_task.ts` file and place it at the same path as the other tasks (currently this is under `discojs/discojs-core/src/tasks/`).
After this make sure to include its reference in the `discojs/discojs-core/src/tasks/index.ts` file as follows:

```js
export * as cifar10 from './cifar10'
export * as lus_covid from './lus_covid'
export * as mnist from './mnist'
export * as my_new_task from './my_new_task' // <---- including our new custom task!
export * as titanic from './titanic'
```

This ensure that the task is properly exposed and thus the server will also be able to see and serve it.

> Note that `discojs-core` must only contain platform-agnostic code that works both in the browser and on Node.js.
> Thus, if your task requires reading some file from your local file system, you need to define the task in `discojs-node` only: `discojs/discojs-node/src/tasks/my_new_task.ts`
> In a similar fashion, tasks expecting to read from browser memory (such as IndexedDB or local storage) shall be defined in `discojs-web` instead: `discojs/discojs-web/src/tasks/my_new_task.ts`

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
if we look at `server/src/tasks.ts`, it is done as follows for the simple face example task (for our custom task we simply need to set
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

> In the appendix (end of this document) you find all possible trainingInformation paramters with a short description. 

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

After exporting the task, you need to also export a function called `model` that returns the layers model. If you use a 
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

## Summary 

- In ```disco/discojs/discojs-core/src/tasks/``` define your new custom task by instanciating a Task object, and define the async function ```model```. You will need to have your model in the .json + .bin format.
 - In ```disco/discojs/discojs-core/src/tasks/index.ts``` export your newly defined task
 - Run the ```./build.sh``` script from ```disco/discojs/discojs-core```
 - Reinstall cleanly the server by running ```npm ci``` from ```disco/server```
 - Reinstall cleanly the client by running ```npm ci``` from ```disco/web-client```
 - Instantiate a Disco server by running ```npm run dev``` from ```disco/server```
 - Instanciate a Disco client by running ```npm run dev``` from ```disco/web-client```
 Your task has been successfully uploaded.




## Appendix

The TrainingInformation contains 

```js
export interface TrainingInformation {
  // modelID: unique ID for the model
  modelID: string
  // epochs: number of epochs to run training for
  epochs: number
  // roundDuration: number of batches between each weight sharing round, e.g. if 3 then after every
  // 3 batches we share weights (in the distributed setting).
  roundDuration: number
  // validationSplit: fraction of data to keep for validation, note this only works for image data
  validationSplit: number
  // batchSize: batch size of training data
  batchSize: number
  // preprocessingFunctions: preprocessing functions such as resize and normalize
  preprocessingFunctions: Preprocessing[]
  // modelCompileData: interface of additional training information (optimizer, loss and metrics)
  modelCompileData: ModelCompileData
  // dataType, e.g. image or tabular
  dataType: string
  // inputColumns: for tabular data, the columns to be chosen as input data for the model
  inputColumns?: string[]
  // outputColumns: for tabular data, the columns to be predicted by the model
  outputColumns?: string[]
  // IMAGE_H height of image
  IMAGE_H?: number
  // IMAGE_W width of image
  IMAGE_W?: number
  // LABEL_LIST of classes, e.g. if two class of images, one with dogs and one with cats, then we would
  // define ['dogs', 'cats'].
  LABEL_LIST?: string[]
  // learningRate: learning rate for the optimizer
  learningRate?: number
  // RESIZED_IMAGE_H: New image width, note that you must add ImagePreprocessing.Resize in the preprocessingFunctions.
  RESIZED_IMAGE_H?: number // TODO: regroup image vs csv specific stuff?
  // RESIZED_IMAGE_W: New image width, note that you must add ImagePreprocessing.Resize in the preprocessingFunctions.
  RESIZED_IMAGE_W?: number
  // scheme: Distributed training scheme, i.e. Federated and Decentralized
  scheme?: string
  // noiseScale: Differential Privacy (DP): Affects the variance of the Gaussian noise added to the models / model updates.
  // Number or undefined. If undefined, then no noise will be added.
  noiseScale?: number
  // clippingRadius: Privacy (DP and Secure Aggregation):
  // Number or undefined. If undefined, then no model updates will be clipped.
  // If number, then model updates will be scaled down if their norm exceeds clippingRadius.
  clippingRadius?: number
  // decentralizedSecure: Secure Aggregation on/off:
  // Boolean. true for secure aggregation to be used, if the training scheme is decentralized, false otherwise
  decentralizedSecure?: boolean
  // maxShareValue: Secure Aggregation: maximum absolute value of a number in a randomly generated share
  // default is 100, must be a positive number, check the ~/disco/information/PRIVACY.md file for more information on significance of maxShareValue selection
  // only relevant if secure aggregation is true (for either federated or decentralized learning)
  maxShareValue?: number
  // minimumReadyPeers: Decentralized Learning: minimum number of peers who must be ready to participate in aggregation before model updates are shared between clients
  // default is 3, range is [3, totalNumberOfPeersParticipating]
  minimumReadyPeers?: number
}
```
