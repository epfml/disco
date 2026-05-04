// speed things up TODO how to avoid the need to import it
import "@tensorflow/tfjs-node"

import { List, Range } from 'immutable'
import fs from 'node:fs/promises'
import { createWriteStream } from "node:fs";
import path from "node:path";
import createDebug from "debug";
import type {
  Dataset,
  DataFormat,
  DataType,
  SummaryLogs,
  Task,
  TaskProvider,
  Network,
} from "@epfml/discojs";
import { Disco, aggregator as aggregators, client as clients } from '@epfml/discojs'

import { saveModelToDisk } from "@epfml/discojs-node";
import { getTaskData } from './data.js'
import { args } from './args.js'
import { makeUserLogFile } from "./user_log.js";
import type { UserLogFile } from "./user_log.js";

const debug = createDebug("cli:main");

async function runUser<D extends DataType, N extends Network>(
	task: Task<D, N>,
	provider: TaskProvider<D, N>,
	url: URL,
	data: Dataset<DataFormat.Raw[D]>,
  validationData: Dataset<DataFormat.Raw[D]> | undefined,
  userIndex: number,
  numberOfUsers: number,
): Promise<List<SummaryLogs>> {
  debug(`Starting runUser for client ${userIndex}`);
  const userStart = Date.now();
  const trainingScheme = task.trainingInformation.scheme as N
  const aggregator = aggregators.getAggregator(task)
  const client = clients.getClient(trainingScheme, url, task, aggregator)
  const disco = new Disco(task, client, { scheme: trainingScheme, preprocessOnce: true });

  // For local training, load model from provider before training starts
  // if (trainingScheme === "local") {
  //   debug(`Loading model for training client ${userIndex}...`);
  //   const modelStart = Date.now();
  //   console.log("Loading model for local training...");
  //   disco.trainer.model = await provider.getModel();
  //   console.log("Model loaded successfully");
  //   debug(`Model loading took ${Date.now() - modelStart}ms for client ${userIndex}`);
  // }

  
  
  const dir = path.join(".", `${args.testID}`);
  await fs.mkdir(dir, { recursive: true });
  const streamPath = path.join(dir, `client${userIndex}_local_log.jsonl`);

  const finalLog: SummaryLogs[] = [];
  // create a write stream that saves learning logs during the train
  let jsonStream: ReturnType<typeof createWriteStream> | null = null;

  if (args.save){
    jsonStream = createWriteStream(streamPath, {flags: "w"});
  }

  try{
    debug(`Starting training for client ${userIndex}`);
    const trainStart = Date.now();
    for await (const log of disco.trainSummary(data, validationData)){
      finalLog.push(log);

      if (jsonStream){
        jsonStream.write(JSON.stringify(log) + "\n");
      }
    }
    debug(`Training took ${Date.now() - trainStart}ms for client ${userIndex}`);

    await new Promise((res, _) => setTimeout(() => res('timeout'), 1000)) // Wait for other peers to finish
  // Save the trained model if requested
  if (args.saveModel) {
    const modelDir = path.join(".", `${args.testID}`, "models");
    const modelFileName = `client${userIndex}_model.json`;
    await saveModelToDisk(disco.trainer.model, modelDir, modelFileName);
    console.log(`Model saved for client ${userIndex} at ${modelDir}/${modelFileName}`);
  }
    // saving the entire per-user logs
    if (args.save) {
      const finalPath = path.join(dir, `client${userIndex}_local_log.json`);

      const userLog: UserLogFile = makeUserLogFile(task, numberOfUsers, userIndex, client.ownId, finalLog);

      await fs.writeFile(finalPath, JSON.stringify(userLog, null, 2));
    }

    return List(finalLog);
  }catch(err){
    console.error(`Run user failed for client ${userIndex}: `, err);
    throw err;
  }finally{
    try{
      if (jsonStream){
        jsonStream.end();

        await new Promise<void>((resolve, reject) => {
          jsonStream.once("finish", resolve);
          jsonStream.once("error", reject);
        });
      }
    }catch(err){
      console.error(`failed to close log stream for client ${userIndex}: `, err);
    }

    try{
      await disco.close();
    }catch(err){
      console.error(`failed to close disco for client ${userIndex}: `, err);
    }
  }
}

async function main<D extends DataType, N extends Network>(
	provider: TaskProvider<D, N>,
	numberOfUsers: number,
): Promise<void> {
  const task = await provider.getTask();
  console.log(`Test ID: ${args.testID}`)
  console.log(`Started ${task.trainingInformation.scheme} training of ${task.id}`)
  console.log({ args })

  const dataSplits = await Promise.all(
    Range(0, numberOfUsers).map(async i => getTaskData(task.id, i, numberOfUsers, args.datasetPath))
  )

  let validationData: Dataset<DataFormat.Raw[D]> | undefined = undefined;
  if (args.validationDatasetPath) {
    validationData = (
      await getTaskData(task.id, 0, 1, args.validationDatasetPath, true, args.validationDatasetPath)
    ).cached() as Dataset<DataFormat.Raw[D]>;
  }

  const logs = await Promise.all(
    dataSplits.map((data, i) => runUser(task, provider, args.host, data as Dataset<DataFormat.Raw[D]>, validationData, i, numberOfUsers))
  )

  if (args.save) {
    const dir = path.join(".", `${args.testID}`, `${task.id}`);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${task.id}_${numberOfUsers}users.json`);
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
  }
}

main(args.provider, args.numberOfUsers).catch(console.error)
