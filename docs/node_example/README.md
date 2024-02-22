# How to use DISCO from a script

This folder gives a brief example of how to use DISCO. Because we are relying on Node.js, we use `discojs-node` (rather than the alternative `discojs-web`). The example script creates two clients jointly training on the Titanic dataset in a federated manner. The example is self-contained and illustrates key uses of `discojs-node`:
* How to train a federated model on pre-defined tasks
* How to create multiple clients
* How to start a server instance from a script
* How to load and preprocess local data 

Before running this example, make sure you have followed all the installation instructions described in [DEV.md](https://github.com/epfml/disco/blob/635-update-doc-julien/DEV.md#installation-guide).
You can run the example as follows:
```
cd docs/example
npm start # compiles TypeScript and runs main.ts
```

As you can see in `main.ts` a client is represented by a `Disco` object:
```js
const disco = new Disco(task, { url, scheme: TrainingSchemes.FEDERATED })
await disco.fit(dataset) // Start training on the dataset
await disco.close()
```

To simulate more or less users change the number of calls to `runUser`:

```js
// The Promise creates two clients and waits for their training to complete
await Promise.all([
  runUser(url),
  runUser(url)
])
```
