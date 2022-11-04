# Example

In `example.ts` we give a brief example of discojs, in it we run two clients training jointly via federated learning. It trains on a few examples of the [face task](https://www.kaggle.com/datasets/frabbisw/facial-age), the samples are already stored in the repo and so it is not necessary to download any additional data.

The example is self-contained, it runs a Disco server that is usually run externally.

To run the example do

```
nvm use
./get_training_data
cd discojs && npm ci
cd discojs-node && npm run build
cd ../..
cd server && npm ci
cd ..
cd example && npm ci && npm start
```

## Disco.js API

In `example.ts` (line 100) the following function gives an example of the Disco.js API.

To run the clients with decentralized training or local training, set the training scheme to: `TrainingSchemes.DECENTRALIZED` or `TrainingSchemes.LOCAL`, respectively.

```js
async function runUser (url: URL): Promise<void> {
  // Load the data, the dataset must be of type data.Data, see discojs import above.
  const data = await loadData(TASK)

  // Start training
  const disco = new Disco(TASK, { url })
  await disco.fit(data)

  // Stop training and cleanly disconnect from the remote server
  await disco.close()
}
```

To simulate more or less users, simply add more in line 70:

```js
// Add more users to the list to simulate more clients
await Promise.all([
  runUser(url),
  runUser(url)
])
```
