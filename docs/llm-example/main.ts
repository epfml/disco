import { dataset, Disco, fetchTasks, Task } from '@epfml/discojs-node'

import { startDisco } from '@epfml/disco-server'
import { loadData, loadDataFace } from './data'

{
    let serve = Bun.serve
    Bun.serve = (x: any) =>
        serve({
            ...x,
            websocket: x.websocket
                ? {
                      ...x.websocket,
                      maxPayloadLength: 1_000_000_000,
                  }
                : undefined,
        })
}

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser(
    url: URL,
    task: Task,
    dataset: dataset.DataSplit
): Promise<void> {
    // Start federated training
    const disco = new Disco(task, { url })
    await disco.fit(dataset)

    // Stop training and disconnect from the remote server
    await disco.close()
}

async function main(): Promise<void> {
    if (process.argv.length < 3)
        throw new Error(
            'Please provide the dataset name you would like to train on (wikitext-103 | tiny-shakespeare)'
        )

    const name = process.argv[2]

    const [server, serverUrl] = await startDisco()

    const tasks = await fetchTasks(serverUrl)

    // Choose your task to train
    // TODO: rename this task just to llm or gpt (?), because it would be the same task for many datasets
    // const task = tasks.get('wikitext-103') // no matter the dataset picked, the task is the same
    const task = tasks.get('simple_face') // no matter the dataset picked, the task is the same

    if (task === undefined) {
        throw new Error('task not found')
    }

    const dataset = await loadDataFace(task)
    // const dataset = await loadData(task, name)

    // Add more users to the list to simulate more clients
    await Promise.all([
        runUser(serverUrl, task, dataset),
        // runUser(serverUrl, task, dataset),
    ])

    await new Promise((resolve, reject) => {
        server.once('close', resolve)
        server.close(reject)
    })
}

main().catch(console.error)
