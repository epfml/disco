# DISCO examples

This folder contains examples of how to use DISCO via Node.js scripts. Before running an example, make sure you have followed all the installation instructions described in [DEV.md](../../DEV.md#installation-guide).

### Using `discojs-node` for federated training

`training.ts` imports `discojs-node` (rather than the alternative `discojs-web`) to create two clients jointly training on the Titanic dataset in a federated manner. The example is self-contained and illustrates key uses of `discojs-node`:

- How to train a federated model on pre-defined tasks
- How to create multiple clients
- How to start a server instance from a script
- How to load and preprocess local data

You can run the training example as follows:

```
cd docs/example
npm run train # compiles TypeScript and runs training.ts
```

As you can see in `training.ts` a client is represented by a `Disco` object:

```js
const disco = new Disco(task, { url, scheme: "federated" });
await disco.fit(dataset); // Start training on the dataset
await disco.close();
```

To simulate more or less users change the number of calls to `runUser`:

```js
// The Promise creates two clients and waits for their training to complete
await Promise.all([runUser(url), runUser(url)]);
```

### Adding a new custom task

The server handles the pre-defined machine learning tasks and sends them to users when queried. `custom_task.ts` illustrates how to add a custom task to the server such that it can be queried by users. More details on custom tasks can be found in [TASK.md](../TASK.md).

You can run the custom task example with:

```
cd docs/examples
npm run custom_task # compiles TypeScript and runs custom_task.ts
```

### Creating a CSV file to connect a dataset in DISCO

DISCO allows connecting data through a CSV file that maps filenames to labels. The python notebook `dataset_csv_creation.ipynb` shows how to create such a CSV for the Skin Disease Classification task.
