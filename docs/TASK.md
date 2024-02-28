# ML Tasks in DISCO

DISCO currently allows learning of arbitrary machine learning tasks, where tasks can be defined in three possible ways:

1. **Predefined tasks**: As examples, DISCO already hosts several pre-defined popular tasks such as [Titanic](../discojs/discojs-core/src/tasks/titanic.ts), [CIFAR-10](../discojs/discojs-core/src/tasks/cifar10.ts), and [MNIST](../discojs/discojs-core/src/tasks/mnist.ts) among others.
2. **Task creation UI**: new tasks can be defined via the [**task creation form**](https://epfml.github.io/disco/#/create)
3. **Implementing custom tasks**: tasks too specific for the UI form need to be implemented in the repository directly.

In any case, one user needs to upload the initial model that is going to be trained collaboratively.

### Uploading ML models

Because DISCO works with TensorFlow.js it is therefore necessary to either train a TF.js model directly, or convert the model weights to TF.js. Here are some useful links to [create](https://www.tensorflow.org/js/guide/models_and_layers) and [save](https://www.tensorflow.org/js/guide/save_load) a TF.js model.

TF.js models consist of:

- a model file in a JSON format for the neural network architecture
- an **optional** weight file in .bin format to start from a particular initialization or with pretrained weights.

#### Converting models to TensorflowJS

The simplest way to obtain a TF.js model is to first create a Python Tensorflow Keras model, stored as a .h5 file, and then convert it using TensorflowJS's converter tool, which transforms any Tensorflow Keras model to TensorflowJS. The conversion is only available for modules that have [TF.js equivalents](https://js.tensorflow.org/api/latest/).

```bash
tensorflowjs_converter --input_format=keras my_model_name.h5 /tfjs_model
```

Following the `tensorflowjs_converter` command, you recover two files: a .json describing your model architecture, and a collection of .bin files describing your model weights, which are ready to be used by DISCO.

For PyTorch models, we recommend directly recreating the model in Tensorflow Keras. as most of PyTorch components have their equivalent counterpart in Tensorflow Keras, and translating model architectures between these two frameworks can be done in a straightforward way. Current conversion libraries between the two frameworks still have compatibility issues for components differing strongly between PyTorch and TensorFlow. Regarding pre-trained weights, `tensorflowjs_converter` can only convert Keras pre-trained models to TF.js, therefore PyTorch pre-trained models are not supported and need to be re-trained as a Keras equivalent.

> [!Note]
> Make sure to convert to TF.js [LayersModel](https://www.tensorflow.org/js/guide/models_and_layers) (not GraphModel, as the latter are for inference only and can't be trained). If you already have a saved LayersModel, then the conversion can be done directly with:

```bash
tensorflowjs_converter --input_format=tf_saved_model my_tensorflow_saved_model /tmp/tfjs_model
```

## 1. Predefined tasks

Predefined tasks are example use cases available in the [DISCO website](https://epfml.github.io/disco/#/list) where users can upload their respective data and train collaboratively. For predefined tasks, the initial model to train is already defined and doesn't need to be uploaded.

## 2. Task creation UI

The [task creation form](https://epfml.github.io/disco/#/create) lets users create a custom task DISCO without programming. In this case, users can choose between the data modalities and preprocessing that are already supported (such as tabular, images, text etc) and upload an initial model.

1.  On the [DISCO website](https://epfml.github.io/disco/#), click on `Get Started` and then `Create`.
2.  Fill in all the relevant information for the task
3.  Upload model files: 1) a TF.js architecture file in JSON format (cf. the _Uploading ML models_ section) as well as a weight file (`.bin` format), which is necessary in this case. This is the initial weights provided to new users joining your task (pre-trained or random initialization).

## 3. Implementing custom tasks

Programming skills are necessary to add a custom task not supported by the task creation UI.
A task is mainly defined by a `TaskProvider` which needs to implement two methods:

- `getTask` which returns a `Task` as defined by the [Task interface](../discojs/discojs-core/src/task/task.ts). The `Task` contains all the crucial information from training to the mode
- `getModel` which returns a `Promise<tf.LayersModel>` specifying a model architecture for the task

You can add a new task in two different ways:

- a) As a new default task, e.g. to make the task available in production
- b) By using the `disco.addTask` method if you run the server yourself

a) By creating (and exporting in [`index.ts`](https://github.com/epfml/disco/blob/develop/discojs/discojs-core/src/default_tasks/index.ts)) a new `TaskProvider` in [`default_tasks`](https://github.com/epfml/disco/tree/develop/discojs/discojs-core/src/default_tasks) it will be loaded automatically by the server. Adding a new task this way is necessary to add a new task to the production server.

b) If you run the server yourself you directly provide the task to the server without modifying Disco.js. An example is given in [custom_task.ts](./examples/README.md).

```js
import { Disco, tf } from "@epfml/disco-server";

// Define your own task provider (task definition + model)
const customTask: TaskProvider = {
  getTask(): Task {
    return {
      // Your task definition
    };
  },

  async getModel(): Promise<tf.LayersModel> {
    const model = tf.sequential();
    // Configure your model architecture
    return model;
  },
};

async function runServer() {
  const disco = new Disco();
  // Add your own custom task
  await disco.addTask(customTask);
  // Start the server
  disco.serve();
}

runServer();
```

For the initial model, the JSON model architecture is necessary, but the .bin weight file is optional. If a weight file is included the model will be loaded with the given weights, otherwise the weights will be initialized randomly.
For more information, read the [server documentation](../server/README.md).

For more detail about how to define a `Task` and a `tf.LayersModel` for your own `TaskProvider`, continue reading.

### Model

The interface lets you load your model however you want, as long as you return a `tf.LayersModel` at the end. If you use a
pre-trained model, you can simply load and return the model in the function via `tf.loadLayersModel(modelPath)`.

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
async function getModel(modelPath: string): Promise<tf.LayersModel> {
  return await tf.loadLayersModel(`file://${modelPath}`);
}
```

> Reminder that the tasks and models definition are used by the server. The server then exposes the initial models to the clients that want to train them locally. So the server need to be able to retrieve the model if it's stored in a remote location.
> When the training begin, the client retrieves the **initial** model stored on the server. Then depending on the scheme the model **updates** (without training data) are:
>
> - Sent to the server for aggregation (**federated scheme**)
>   - At some point the server will update its stored model to benefit future client trainings
> - Shared between peers for aggregation (no interaction with server) (**decentralized scheme**)
>   - In this case, the server never have the opportunity to update the initial model as it's kept between peers.

In summary here are the most common ways of loading a model:

- Loading the model from the web (example in [cifar10](../discojs/discojs-core/src/default_tasks/cifar10.ts))
- Loading the model from the local filesystem (similar to the web with a file path from the server filesystem)
- Defining the architecture directly in the `TaskProvider` (example in [luscovid](../discojs/discojs-core/src/default_tasks/lus_covid.ts))

At runtime, the models are stored in `disco/server/models/`, and it is also in the server side that we let disco know where exactly they are saved.

> If you are using a pre-existing model, and the data shape does not match the input of the model, then it is possible
> to use preprocessing functions to resize the data (we also describe how to add custom preprocessing).

### Task

The `Task` class contains all the crucial information for training the model (batchSize, learningRate, ...) and also the
scheme of distributed learning (federated or decentralized), along with other meta data about the model and data.

The [`TrainingInformation` object](../discojs/src/task/training_information.ts) of a task contains all the customizable parameters and their descriptions.

As an example, the task class for `simple-face` can be found [here](../discojs/discojs-core/src/default_tasks/simple_face.ts). Suppose
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

If your task requires a preprocessing function to be applied to the data before training, you can specify it in the `preprocessingFunctions` field of the `trainingInformation` parameter in the task object. In order to add custom preprocessing function, either extend the `Preprocessing` type and define your preprocessing functions in the [preprocessing](../discojs/discojs-core/src/dataset/data/preprocessing.ts) file. If the preprocessing function is challenging to implement in JS (e.g requires complex audio preprocessing for JS), we recommend implementing in some other language which supports the desired preprocessing (e.g. Python) and feed the preprocessed data to the task.

#### Rebuild

Then we define our custom function

```js
function custom(image: tf.Tensor3D): tf.Tensor3D {
  return image.div(tf.scalar(2));
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

> [!TIP]
> Note that you need to rebuild discojs every time you make changes to it (`cd discojs; rm -rf dist/; npm run build`).

## Summary

- In `disco/discojs/discojs-core/src/default_tasks/` define your new custom task by implementing the `TaskProvider` interface. You will need to have your model in the .json + .bin format.
- In `disco/discojs/discojs-core/src/default_tasks/index.ts` export your newly defined task
- Run the `./build.sh` script from `discojs/discojs-core`
- Reinstall cleanly the server by running `npm ci` from `disco/server`
- Reinstall cleanly the client by running `npm ci` from `disco/web-client`
- Instantiate a Disco server by running `npm run dev` from `disco/server`
- Instantiate a Disco client by running `npm run dev` from `disco/web-client`

Your task has been successfully uploaded.

**Or** just use the NPM `disco-server` package and add your own custom `TaskProvider` directly to the server.
