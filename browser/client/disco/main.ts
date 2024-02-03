'use client'
import { dataset, Disco, Task } from '@epfml/discojs-web'

/**
 * Example of discojs API, we load data, build the appropriate loggers, the disco object
 * and finally start training.
 */
async function runUser(url: URL, task: Task, dataset: dataset.DataSplit): Promise<void> {
    // Start federated training
    const disco = new Disco(task, { url })
    await disco.fit(dataset)

    // Stop training and disconnect from the remote server
    await disco.close()
}

export async function main(serverUrl: URL, task: Task, dataset: dataset.DataSplit): Promise<void> {
    // Add more users to the list to simulate more clients
    await Promise.all([
        runUser(serverUrl, task, dataset),
        // runUser(serverUrl, task, dataset)
    ])
}
