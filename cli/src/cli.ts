import { List, Range } from 'immutable'
import fs from 'node:fs/promises'

import type { data, RoundLogs, Task } from '@epfml/discojs-core'
import { Disco, aggregator as aggregators, client as clients } from '@epfml/discojs-core'
import { startServer } from '@epfml/disco-server'

import { getTaskData } from './data.js'
import { args } from './args.js'

async function runUser(
  task: Task,
  url: URL,
  data: data.DataSplit,
): Promise<List<RoundLogs>> {
  const client = new clients.federated.FederatedClient(
    url,
    task,
    new aggregators.MeanAggregator(),
  );

  // force the federated scheme
  const disco = new Disco(task, { scheme: "federated", client });

  let logs = List<RoundLogs>();
  for await (const round of disco.fit(data)) logs = logs.push(round);

  await disco.close();
  return logs;
}

async function main (task: Task, numberOfUsers: number): Promise<void> {
  console.log(`Started federated training of ${task.id}`)
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
