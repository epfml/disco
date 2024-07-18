import { List, Range } from 'immutable'
import fs from 'node:fs/promises'

import type { data, RoundLogs, Task } from '@epfml/discojs'
import { Disco, aggregator as aggregators, client as clients } from '@epfml/discojs'
import { startServer } from 'server'

import { getTaskData } from './data.js'
import { args } from './args.js'

// Array.fromAsync not yet widely used (2024)
async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) ret.push(e);
  return ret;
}

async function runUser(
  task: Task,
  url: URL,
  data: data.DataSplit,
): Promise<List<RoundLogs>> {
  const trainingScheme = task.trainingInformation.scheme
  const aggregator = aggregators.getAggregator(task)
  const client = clients.getClient(trainingScheme, url, task, aggregator) 
  const disco = new Disco(task, { scheme: trainingScheme, client });

  const logs = List(await arrayFromAsync(disco.trainByRound(data)));
  await new Promise((res, _) => setTimeout(() => res('timeout'), 1000)) // Wait for other peers to finish
  await disco.close();
  return logs;
}

async function main (task: Task, numberOfUsers: number): Promise<void> {
  console.log(`Started ${task.trainingInformation.scheme} training of ${task.id}`)
  console.log({ args })
  const [server, url] = await startServer()

  const data = await getTaskData(task)

  const logs = await Promise.all(
    Range(0, numberOfUsers).map(async (_) => await runUser(task, url, data)).toArray()
  )

  if (args.save) {
    const fileName = `${task.id}_${numberOfUsers}users.csv`;
    await fs.writeFile(fileName, JSON.stringify(logs, null, 2));
  }
  console.log('Shutting down the server...')
  await new Promise((resolve, reject) => {
    server.once('close', resolve)
    server.close(reject)
  })
}

main(args.task, args.numberOfUsers).catch(console.error)
