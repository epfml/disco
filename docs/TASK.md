# ML Tasks in Disco

Disco.js currently allows learning of arbitrary machine learning tasks, where tasks can be defined in three possible ways:

1. **Predefined tasks**: As examples, Disco already hosts several pre-defined popular tasks such as [Titanic](../discojs/discojs-core/src/tasks/titanic.ts), [CIFAR-10](../discojs/discojs-core/src/tasks/cifar10.ts), and [MNIST](../discojs/discojs-core/src/tasks/mnist.ts) among others.
2. New tasks defined via the [**task creation form**](https://epfml.github.io/disco/#/create), via the Disco web UI, without programming knowledge needed
3. New **custom tasks**


## Bringing your ML model to Disco

To use an existing model in Disco, we first need to convert the model to TensorFlowJS format, consisting of a TensorFlowJS model file in a JSON format for the neural network architecture, and an optional weight file in .bin format if you want to start from a particular initialization or a pretrained model. If your model comes from another framework than TensorflowJS, like Pytorch or Tensorflow/Keras, but you still want to bring it to DisCo, we indicate the appropriate procedure as follows.


### Importing models or weights from PyTorch to TensorflowJS

The simplest way to obtain a TensorflowJS model is to first obtain a Python Tensorflow/Keras model, stored as a .h5 file, and then convert it using TensorflowJS's converter tool, which transforms any Tensorflow/Keras model to TensorflowJS. One recommended way to obtain a Python Tensorflow/Keras model it to directly develop the model in Keras: most of PyTorch components have their equivalent counterpart in Tensorflow/Keras, and translating model architectures between these two frameworks can be done in a straightforward way. One caveat is that for more complex models, pretrained weights can currently not automatically be converted from the Python `.pth` format to the Keras `.h5` format. If you plan to retrain the model from scratch in Disco, this is no problem. On the other hand if you want to import pretrained Python model weights you currently have to first obtain corresponding Keras weights, from which you can then TF.js weights.

Given your keras model file, to convert it to a TensorFlowJS model:
```bash
$ tensorflowjs_converter --input_format=keras my_model_name.h5 /tfjs_model
```

Side Note: If you already have a TensorFlow (Python) saved model ([LayersModel](https://www.tensorflow.org/js/guide/models_and_layers)), then the conversion to TensorFlowJS is straightforward with the following command:
```bash
$ tensorflowjs_converter --input_format=tf_saved_model my_tensorflow_saved_model /tmp/tfjs_model
```

Make sure to convert to TF.js [LayersModel](https://www.tensorflow.org/js/guide/models_and_layers) (not GraphModel, as the latter are inference only, so can not be trained).

Following the `tensorflowjs_converter` command, you will recover two files : a .json describing your model architecture, and a collection of .bin files describing your model weights, which are ready to be uploaded on DisCo. We describe this procedure in the paragraphs below.
Note that the following conversion is only possible in cases of models for which TensorFlowJS possesses the [corresponding modules](https://js.tensorflow.org/api/latest/).

*Side Note : There exist several libraries that try to perform automatic conversion between frameworks, which we do not recommend as most of the tools have compatibility issues for models containing components which differ strongly in implementation between the two frameworks.*



## 1) Using the user interface directly for creating a new task
I am a user who wants to define my custom task and bring my model to Disco, without doing any programming. In this case, you use our existing supported data modalities and preprocessing (such as tabular, images, text etc). For this use case, an initial `.bin` weight file of your TF.js model is mandatory.
 * Through the Disco user interface, click on the *create* button on "Add your own model to be trained in a DISCOllaborative"
 * Fill in all the relevant information for your task and model:
 	*   A `TensorFlow.js` model file in JSON format (useful links to [create](https://www.tensorflow.org/js/guide/models_and_layers) and [save](https://www.tensorflow.org/js/guide/save_load) your model)
	* A weight file in `.bin` format. This is the initial weights provided to new users joining your task (pre-trained or random initialisation).
   


## 2) Procedure for adding a custom task
In order to add a completely new custom task to Disco.js using our own code (such as for data loading, preprocessing etc), we need to defined a `TaskProvider` which need to implement two methods:
   * `getTask` which returns a `Task` as defined [here](../discojs/discojs-core/src/task/task.ts), the `Task` contains all the crucial information from training to the mode
   * `getModel` which returns a `Promise<tf.LayersModel>` specifying a model architecture for the task

You can find examples of `TaskProvider` currently used in our Disco server in `discojs/discojs-core/src/default_tasks/`. These tasks are all loaded by our server by default.

### Task

For the task creation of new custom tasks, if you can not go through the user interface, we recommend the following guidance:

**I am a developper who wants to define my own custom task**

If you want to add a new task to our production DISCO server you have two possibilities:
  * using the user interface as described above (no coding required)
  * exporting your own `TaskProvider` from `discojs/discojs-core/src/default_tasks/`  and adding a new default task by contributing to the code. (describing the task in Typescript code)

To export a new task in the code, make sure to export the `TaskProvider` in the `discojs/discojs-core/src/default_tasks/index.ts` file as follows:

```js
export { cifar10 } from './cifar10'
export { lusCovid } from './lus_covid'
export { mnist } from './mnist'
export { titanic } from './titanic'
export { simpleFace } from './simple_face'
export { geotags } from './geotags'
export { myNewTask } as my_new_task from './my_new_task' // <---- including our new custom task!
```

If you run the server yourself, you can use the two methods above but the prefered way is to **directly provide the task to the server before startup**. You can do this with the NPM [disco-server](https://www.npmjs.com/package/@epfml/disco-server) package without altering the code or recompiling it.

```js
import { Disco, tf } from '@epfml/disco-server'

// Define your own task provider (task definition + model)
const customTask: TaskProvider = {
    getTask(): Task {
      return {
        // Your task definition
      }
    },
  
    async getModel(): Promise<tf.LayersModel> {
      const model = tf.sequential()
      // Configure your model architechture
      return model
    }
  }

async function runServer() {
  const disco = new Disco()
  // Add your own custom task
  await disco.addTask(customTask)
  // Start the server
  disco.serve()
}

runServer()
```

For more information, read the [server documentation](../server/README.md).

For your custom model, the JSON model architecture is necessary, but the .bin weight file is optional : if you include the weights file, your model will be loaded with the passed weights. If a weights file is not specified, the weights for the model will be initialized randomly.

For more detail about how to define a `Task` and a `tf.LayersModel` for your own `TaskProvider`, continue reading.



### Model

The interface let you load your model however you want, as long as you return a `tf.LayersModel` at the end. If you use a 
pre-trained model, you can simply load and return said model in the function via `tf.loadLayersModel(modelPath)`.

```js
async function getModel (_: string): Promise<tf.LayersModel> {
  // Init model
  const model = tf.sequential()

  // Add layers
  model.add(...)
  
  return model
```

Alternatively we can also load a pre-existing model; if we only provide a `model.json` file, then only the architecture of the model will be 
loaded. If however in the same path we also include `weights.bin`, then pre-trained weights stored in these files will also be loaded to the model.

```js
async function getModel (modelPath: string): Promise<tf.LayersModel> {
  return await tf.loadLayersModel(`file://${modelPath}`)
}
```

> Reminder that the tasks and models definition are used by the server. The server then exposes the initial models to the clients that want to train them locally. So the server need to be able to retrieve the model if it's stored in a remote location.
> When the training begin, the client retrieves the **initial** model stored on the server. Then depending on the scheme the model **updates** (without training data) are:
> 
> * Sent to the server for aggregation (**federated scheme**) 
>   * At some point the server will update its stored model to benefit future client trainings
> * Shared between peers for aggregation (no interaction with server) (**decentralized scheme**)
>   * In this case, the server never have the opportunity to update the initial model as it's kept between peers.

In summary here are the most common ways of loading a model:

* Loading the model from the web (example in [cifar10](../discojs/discojs-core/src/default_tasks/cifar10.ts))
* Loading the model from the local filesystem (similar to the web with a file path from the server filesystem)
* Defining the architecture directly in the `TaskProvider` (example in [luscovid](../discojs/discojs-core/src/default_tasks/lus_covid.ts))

At runtime, the models are stored in `disco/server/models/`, and it is also in the server side that we let disco know where exactly they are saved.

> If you are using a pre-existing model, and the data shape does not match the input of the model, then it is possible
to use preprocessing functions to resize the data (we also describe how to add custom preprocessing).

### Task

The `Task` class contains all the crucial information for training the model (batchSize, learningRate, ...) and also the 
scheme of distributed learning (federated or decentralized), along with other meta data about the model and data.

> In the appendix (end of this document) you find all possible [`TrainingInformation`](../discojs/discojs-core/src/task/training_information.ts) parameters with a short description. 

As an example, the task class for `simple-face` can be found [here](../discojs/discojs-core/src/default_tasks/simple_face.ts), suppose
our own task is a binary classification for age detection (similar to simple face), then we could write:


```js
import { ImagePreprocessing } from '../dataset/preprocessing'

export const customTask: TaskProvider = {
  getTask (): Task {
    return {
      taskID: 'my_new_task',
      displayInformation: {
        taskTitle: 'My new task',
        summary: 'Can you detect if the person in a picture is a child or an adult?',
        ...
      },
      trainingInformation: {
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
  },

  async getModel (): Promise<tf.LayersModel> {
    throw new Error('Not implemented')
  }
}
```

The `Task` interface has three fields: a mandatory `taskID` (of `string` type), an optional `displayInformation`, and an optional `trainingInformation`. The interfaces for the optional fields are [`DisplayInformation`](../discojs/discojs-core/src/task/display_information.ts) and [`TrainingInformation`](../discojs/discojs-core/src/task/training_information.ts).

### Preprocessing

In the Task object we can optionally choose to add preprocessing functions. Preprocessing is defined [here](../discojs/discojs-core/src/dataset/data/preprocessing.ts),
and is currently only implemented for images (e.g. resize, normalize, ...).

Suppose we want our custom preprocessing that divides each pixel value by 2. In the [preprocessing](../discojs/discojs-core/src/dataset/data/preprocessing.ts) file, 
first we add the enum of our custom function:

```js
export enum ImagePreprocessing {
  Normalize = 'normalize',
  Resize = 'resize',
  Custom = 'custom'
}
```

If your task requires a preprocessing function to be applied to the data before training, you can specifiy it in the `preprocessingFunctions` field of the `trainingInformation` parameter in the task object. In order to add custom preprocessing function, either extend the `Preprocessing` type and define your preprocessing functions in the [preprocessing](../discojs/discojs-core/src/dataset/data/preprocessing.ts) file. If the preprocessing function is challenging to implement in JS (e.g requires complex audio preprocessing for JS), we recommend implementing in some other language which supports the desired preprocessing (e.g. Python) and feed the preprocessed data to the task.


#### Rebuild

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

- In ```disco/discojs/discojs-core/src/default_tasks/``` define your new custom task by implementing the `TaskProvider` interface. You will need to have your model in the .json + .bin format.
 - In ```disco/discojs/discojs-core/src/default_tasks/index.ts``` export your newly defined task
 - Run the ```./build.sh``` script from ```discojs/discojs-core```
 - Reinstall cleanly the server by running ```npm ci``` from ```disco/server```
 - Reinstall cleanly the client by running ```npm ci``` from ```disco/web-client```
 - Instantiate a Disco server by running ```npm run dev``` from ```disco/server```
 - Instanciate a Disco client by running ```npm run dev``` from ```disco/web-client```

Your task has been successfully uploaded.

**Or** just use the NPM `disco-server` package and add your own custom `TaskProvider` directly to the server.


## Appendix

The [`TrainingInformation`](../discojs/src/task/training_information.ts) of a task contains the following customizable parameters

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
