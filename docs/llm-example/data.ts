import { readdir } from 'fs/promises'
import path from 'path'
import { dataset, Task, node } from '@epfml/discojs-node'
import { TOKENIZED_FILE_EXTENSION } from './preprocess'

async function getDatasetSource(
    root: string,
    splits: (keyof dataset.loader.TextSource)[]
): Promise<dataset.loader.TextSource> {
    console.log('Preprocessed dataset located at:', root)
    const files = await readdir(root)
    return Object.fromEntries(
        splits.map((split) => {
            const splitFiles = files.filter(
                (f) => f.endsWith(TOKENIZED_FILE_EXTENSION) && f.includes(split)
            )

            console.log(
                'Found',
                splitFiles.length,
                'files in dataset for the',
                split,
                'split.'
            )

            const splitFilesPath = splitFiles.map((f) => path.join(root, f))
            return [split, splitFilesPath]
        })
    ) as dataset.loader.TextSource
}

export async function loadData(
    task: Task,
    name: string,
    config?: Partial<dataset.loader.TextConfig>
): Promise<dataset.DataSplit> {
    // TODO: Make this even more generic so that it works for any dataset / any task
    // 1) move getDatasetSource to core so that the web version can use it as well
    /* @ts-ignore - for import.meta.dir */
    const root = path.join(import.meta.dir, 'datasets', name)
    const source = await getDatasetSource(root, ['train', 'validation'])
    return await new node.dataset.loader.NodeTextLoader(task).loadAll(
        source,
        config
    )
}

import fs from 'fs'
import Rand from 'rand-seed'

const rand = new Rand('1234')

function shuffle<T, U>(array: T[], arrayTwo: U[]): void {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(rand.next() * (i + 1))
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp

        const tempTwo = arrayTwo[i]
        arrayTwo[i] = arrayTwo[j]
        arrayTwo[j] = tempTwo
    }
}

function filesFromFolder(dir: string, folder: string): string[] {
    const f = fs.readdirSync(dir + folder)
    return f.map((file) => dir + folder + '/' + file)
}

export async function loadDataFace(task: Task): Promise<dataset.DataSplit> {
    const dir = '../example_training_data/simple_face/'
    const youngFolders = ['child']
    const oldFolders = ['adult']

    const youngFiles = youngFolders.flatMap((folder) => {
        return filesFromFolder(dir, folder)
    })

    const oldFiles = oldFolders.flatMap((folder) => {
        return filesFromFolder(dir, folder)
    })

    const filesPerFolder = [youngFiles, oldFiles]

    const labels = filesPerFolder.flatMap((files, index) =>
        Array(files.length).fill(index)
    )
    const files = filesPerFolder.flat()

    shuffle(files, labels)

    return await new node.dataset.loader.NodeImageLoader(task).loadAll(files, {
        labels: labels,
    })
}
