# Example

 In `example.ts` we give a brief example of discojs, in it we run two clients training jointly via federated learning. It trains
 on a few examples of the [face task](https://www.kaggle.com/datasets/frabbisw/facial-age), the samples are already stored in the
 repo and so it is not necessary to download any additional data.

 The example is self contained, it runs a simple server that is usually run externally.

 To run the example do

 - install node 16 and ensure it is activated on opening any new terminal (e.g. `nvm use 16`)
 - clone this repository
 - `npm ci` within all `discojs/` and the `server/`
 - `cd discojs; rm -rf dist; npm run build`
 - `cd server`
 - `npx ts-node example/example.ts`

 ## disco api

 In `example.ts` (line 100) the following function gives an example of the discojs api

 To run the clients with decentralized training or local training, set the training scheme to: TrainingSchemes.DECENTRALIZED or TrainingSchemes.LOCAL respectively.

 ```js
 async function runUser (url: URL): Promise<void> {
   // Load the data, the dataset must be of type dataset.Data, see discojs import above.
   const data = await loadData(TASK)

   // Build a logger
   const logger = new ConsoleLogger()

   // Build empty memory (if in browser discojs can leverage IndexDB)
   const memory = new EmptyMemory()
   // Training information logger
   const informant = new TrainingInformant(10, TASK.taskID, TrainingSchemes.FEDERATED)

   // Build federated client (add server URL and TASK object specific to training task)
   const client = new clients.Federated(url, TASK)
   await client.connect()

   // Build disco object, other available training schemes: TrainingSchemes.DECENTRALIZED, TrainingSchemes.LOCAL
   const disco = new training.Disco(TASK, logger, memory, TrainingSchemes.FEDERATED, informant, client)

   // Start training
   await disco.startTraining(data)
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
