'use client'
import path from 'path'
import { useEffect, useState } from 'react'
import { tf, dataset, defaultTasks, Task, browser } from '@epfml/discojs-web'
import { main } from '@/disco/main'
import { models } from '@epfml/discojs-web'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'

const { gpt } = models

const task = defaultTasks.wikitext.getTask()
const config = task.trainingInformation.modelConfig

// TODO: source: TextSource should be loaded using some generic script using the task definition
// a script to search for dataset files corresponding to a task is defined under experiment/data.ts (getDatasetSource)
// this script should be used here as well (see TODO comment in that file)
const getSource = (datasetName: string): dataset.TextSource => {
    const datasetsFolder = path.join(
        '../../experiment',
        'datasets',
        datasetName
    )
    const source: dataset.TextSource = {
        train: [path.join(datasetsFolder, 'train.tokens')],
        validation: undefined,
    }
    // wikitext has a validation file but tiny-shakespeare doesnt
    // this is one of the reason why the todo above is relevant
    if (datasetName === 'wikitext-103') {
        source.validation = [path.join(datasetsFolder, 'validation.tokens')]
    }

    return source
}

const getDatasplit = async (task: Task, datasetName: string) => {
    const source = getSource(datasetName)
    return await new browser.dataset.loader.WebTextLoader(task).loadAll(
        source,
        config
    )
}

const runDatasetBenchmark = async (datasplit: dataset.DataSplit) => {
    const ds = datasplit.train.dataset as dataset.TokenizedDataset
    const iter = await ds.iterator()
    const iterations = 1000
    const label = `Benchmark ${iterations} iterations`
    const { blockSize, batchSize, vocabSize } = config
    console.log(label, 'starts', { blockSize, batchSize, vocabSize })
    console.time(label)
    for (let i = 0; i < iterations; i++) {
        await iter.next()
    }
    console.timeEnd(label)
}

const DATASET_NAMES = ['wikitext-103', 'tiny-shakespeare'] as const
type DatasetName = (typeof DATASET_NAMES)[number]

export default function Home() {
    const [datasetName, setDatasetName] = useState<DatasetName>('wikitext-103')
    const [config, setConfig] = useState<models.GPTConfigWithWandb>()
    const [availableBackends, setAvailableBackends] = useState<string[]>([])
    const [backendName, setBackendName] = useState<string>('cpu')

    useEffect(() => {
        setConfig(gpt.getConfig(task.trainingInformation.modelConfig))
        setAvailableBackends(tf.engine().backendNames())
        setBackend(tf.getBackend())
    }, [])

    const datasetBenchmark = async () => {
        const datasplit = await getDatasplit(task, datasetName)
        await runDatasetBenchmark(datasplit)
    }

    const startTraining = async () => {
        // FIXME: url in .env (or fetched from backend?)
        const datasplit = await getDatasplit(task as Task, datasetName)
        const url = new URL('', 'http://localhost:8000')
        await main(url, task, datasplit).catch(console.error)
    }

    // util function to properly set the backend
    // TODO: Move this to core as well?
    const setBackend = (backendName: string) => async () => {
        await tf.setBackend(backendName)
        await tf.ready()

        const tfBackend = tf.getBackend()
        if (tfBackend !== backendName) {
            throw new Error('backend not properly set, got: ' + tfBackend)
        }

        console.log('Backend set to:', tfBackend)
        setBackendName(tfBackend)
    }

    console.log(backendName, datasetName)

    return (
        <main className="flex p-24 gap-8">
            <pre className="bg-slate-800 rounded p-4 max-w-min">
                {JSON.stringify(config, undefined, 4)}
            </pre>
            <div className="flex flex-col gap-8">
                <div className="flex justify-between items-center gap-4 bg-slate-800 rounded py-2 px-8 h-fit">
                    Backend:
                    <Tabs value={backendName} onValueChange={setBackend}>
                        <TabsList className="gap-4">
                            {availableBackends.map((backendName, i) => (
                                <TabsTrigger
                                    className="hover:!bg-slate-900"
                                    value={backendName}
                                    key={`btn-${i}`}
                                >
                                    {backendName}
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex justify-between items-center gap-4 bg-slate-800 rounded py-2 px-8 h-fit">
                    Dataset:
                    <Tabs
                        value={datasetName}
                        onValueChange={(v) => setDatasetName(v as DatasetName)}
                    >
                        <TabsList className="gap-2">
                            <TabsTrigger
                                value="wikitext-103"
                                className="hover:!bg-slate-900"
                            >
                                wikitext-103
                            </TabsTrigger>
                            <TabsTrigger
                                value="tiny-shakespeare"
                                className="hover:!bg-slate-900"
                            >
                                tiny-shakespeare
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <Separator orientation="vertical" />
                    <button
                        onClick={datasetBenchmark}
                        className="bg-background rounded px-3 py-1.5 hover:bg-slate-900 text-sm font-medium"
                    >
                        benchmark
                    </button>
                </div>
                <div className="flex justify-between items-center gap-4 bg-slate-800 rounded py-2 px-8 h-fit">
                    Training:
                    <button
                        onClick={startTraining}
                        className="bg-background rounded px-3 py-1.5 hover:bg-slate-900 text-sm font-medium"
                    >
                        run
                    </button>
                </div>
            </div>
        </main>
    )
}
