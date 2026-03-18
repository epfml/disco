// speed things up TODO how to avoid the need to import it
import "@tensorflow/tfjs-node"

import { List, Range } from 'immutable'
import fs from 'node:fs/promises'
import path from "node:path";

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

import { getTaskData } from './data.js'
import { args } from './args.js'
import { makeUserLogFile } from "./user_log.js";
import type { UserLogFile } from "./user_log.js";

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

async function runUser<D extends DataType, N extends Network>(
	task: Task<D, N>,
	url: URL,
	data: Dataset<DataFormat.Raw[D]>,
  userIndex: number,
  numberOfUsers: number,
): Promise<List<SummaryLogs>> {
  // cast as typescript isn't good with generics
  const trainingScheme = task.trainingInformation.scheme as N
  const aggregator = aggregators.getAggregator(task)
  const client = clients.getClient(trainingScheme, url, task, aggregator)
  const disco = new Disco(task, client, { scheme: trainingScheme });

  const logs = List(await arrayFromAsync(disco.trainSummary(data)));
  await new Promise((res, _) => setTimeout(() => res('timeout'), 1000)) // Wait for other peers to finish

  // saving per-user logs
  if (args.save) {
    const dir = path.join(".", `${args.testID}`, `${task.id}`);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `client${userIndex}_local_log.json`);

    const userLog: UserLogFile = makeUserLogFile(task, numberOfUsers, userIndex, client.ownId, logs.toArray());

    await fs.writeFile(filePath, JSON.stringify(userLog, null, 2));
  }

  await disco.close();

  return logs;
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
    Range(0, numberOfUsers).map(async i => getTaskData(task.id, i, numberOfUsers))
  )
  const logs = await Promise.all(
    dataSplits.map((data, i) => runUser(task, args.host, data as Dataset<DataFormat.Raw[D]>, i, numberOfUsers))
  )

  if (args.save) {
    const dir = path.join(".", `${args.testID}`, `${task.id}`);
    await fs.mkdir(dir, { recursive: true });

    const filePath = path.join(dir, `${task.id}_${numberOfUsers}users.json`);
    await fs.writeFile(filePath, JSON.stringify(logs, null, 2));
  }
}

main(args.provider, args.numberOfUsers).catch(console.error)
