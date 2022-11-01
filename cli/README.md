# CLI benchmark and node client

Welcome to the Disco🔮 command line interface (CLI). This shows how to easily use Disco🔮 even without a browser, as a Node.js client, to join any federated or decentralized learning task. Also, the standalone scripts and CLI here allow to conveniently simulate multiple clients and log metrics such as training and validation accuracy of each client. Integration of Disco🔮 into other js apps can follow the same code principles (no browser needed).

The Disco CLI allows one to benchmark or simply play around with `discojs` in order to see the performance
of distributed learning. It is possible to pass key arguments such as the number of users, round duration (how 
frequently the clients communicate with each other), ...

To train cifar10, using 4 federated clients for 15 epochs with a round duration of 5 batches, all you have to do is type

```
npm start -- --task cifar10 --numberOfUsers 4 --epochs 15 --roundDuration 5
```

or also using the shorter alias notation

```
npm start -- -t cifar10 -u 4 -e 15 -r 5
```

## Quick-install guide

- install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
- `git clone git@github.com:epfml/disco.git`
- download the `example_training_data.tar.gz` file and extract it into the root of the repository
  - simply execute [get_training_data.sh](../get_training_data)
- `npm ci` within `discojs`, `server` and `cli`
- `cd discojs/discojs-node && npm run build`

## Running the CLI

- `cd cli`
- `npm start` to run the benchmark with the default setting, to see the available flags run
- `npm start -- --help`

## Custom Tasks

DiscoJS currently provides several pre-define popular tasks such as titanic, simple-face and cifar10. In order
to understand how to add your own custom task, we will go over how we added simple-face to disojs [here](../information/TASK.md).

## Dataset

The only thing missing is loading the data, we use our own data class that is a wrapper for the `tfjs` dataset class.
We do the data loading in [data.ts](./src/data.ts).

The key class (for images) is the [ImageLoader](../discojs/src/dataset/data_loader/image_loader.ts), this needs to be extended since files are loaded differently depending
on the environment (node vs browser). Note this is also where we can add pre-processing, here we simply normalise the 
images, but more complex operations can also be added.

Once we have built this object we can load the dataset by giving as an input the `files: string[]` and `labels: number[]`.
We give an example of what this looks like down bellow. 
```js
import fs from 'fs'
import { tf, dataset, Task } from '@epfml/discojs'

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
    '../example_training_data/simple_face/child/12.png',
    '../example_training_data/simple_face/child/141.png',
    '../example_training_data/simple_face/child/143.png',
    '../example_training_data/simple_face/adult/9417.png',
    '../example_training_data/simple_face/adult/9429.png',
    '../example_training_data/simple_face/adult/9462.png'
  ]
}
```

Once you add a new data loader, add it to the `getTaskData` function
in the same file.

```js
export async function getTaskData(task: Task) {
  if (task.taskID === 'simple_face') {
    return simplefaceData(task)
  }
  if (task.taskID === 'titanic') {
    return titanicData(task)
  }
  if (task.taskID === 'cifar10') {
    return cifar10Data(task)
  }
  throw Error(`Data loader for ${task.taskID} not implemented.`)
}
```


### CLI

The last thing to add is to add the task in the [args.ts](./src/args.ts) as follows

```js
let supportedTasks: Map<string, Task> = Map()
supportedTasks = supportedTasks.set(tasks.simple_face.task.taskID, tasks.simple_face.task) // <------
```

Now you are done and you should be able to run your task as follows

```
npm run benchmark -- --task simple_face --numberOfUsers 4 --epochs 15 --roundDuration 5
```
