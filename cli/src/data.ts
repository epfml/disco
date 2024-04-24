import { Range } from 'immutable'
import fs from 'node:fs'
import fs_promises from 'fs/promises'
import path from 'node:path'

import type { Task, data } from '@epfml/discojs-core'
import { NodeImageLoader, NodeTabularLoader } from '@epfml/discojs-node'

function filesFromFolder (dir: string, folder: string, fractionToKeep: number): string[] {
  const f = fs.readdirSync(dir + folder)
  return f.slice(0, Math.round(f.length * fractionToKeep)).map(file => dir + folder + '/' + file)
}

async function simplefaceData (task: Task): Promise<data.DataSplit> {
  const dir = '../datasets/simple_face/'
  const youngFolders = ['child']
  const oldFolders = ['adult']

  const fractionToKeep = 1
  const youngFiles = youngFolders.flatMap(folder => filesFromFolder(dir, folder, fractionToKeep))
  const adultFiles = oldFolders.flatMap(folder => filesFromFolder(dir, folder, fractionToKeep))
  const images = youngFiles.concat(adultFiles)

  const youngLabels = youngFiles.map(_ => 'child')
  const oldLabels = adultFiles.map(_ => 'adult')
  const labels = youngLabels.concat(oldLabels)
  console.log(labels)

  return await new NodeImageLoader(task).loadAll(images, { labels })
}

async function cifar10Data (cifar10: Task): Promise<data.DataSplit> {
  const dir = '../datasets/CIFAR10/'
  const files = (await fs_promises.readdir(dir)).map((file) => path.join(dir, file))
  const labels = Range(0, 24).map((label) => (label % 10).toString()).toArray()
  return await new NodeImageLoader(cifar10).loadAll(files, { labels })
}

async function lusCovidData (lusCovid: Task): Promise<data.DataSplit> {
  const dir = '../datasets/lus_covid/'
  const covid_pos = dir + 'COVID+'
  const covid_neg = dir + 'COVID-'
  const files_pos = (await fs_promises.readdir(covid_pos)).map(file => path.join(covid_pos, file))
  const label_pos = Range(0, files_pos.length).map(_ => 'COVID-Positive')

  const files_neg = (await fs_promises.readdir(covid_neg)).map(file => path.join(covid_neg, file))
  const label_neg = Range(0, files_neg.length).map(_ => 'COVID-Negative')
  
  const files = files_pos.concat(files_neg)
  const labels = label_pos.concat(label_neg).toArray()

  const dataConfig = { labels, shuffle: true, validationSplit: 0.1, channels: 3 }
  return await new NodeImageLoader(lusCovid).loadAll(files, dataConfig)
}

async function titanicData (titanic: Task): Promise<data.DataSplit> {
  const dir = '../datasets/titanic_train.csv'

  const data = await (new NodeTabularLoader(titanic, ',').loadAll(
    ['file://'.concat(dir)],
    {
      features: titanic.trainingInformation?.inputColumns,
      labels: titanic.trainingInformation?.outputColumns,
      shuffle: false
    }
  ))
  return data
}

export async function getTaskData (task: Task): Promise<data.DataSplit> {
  switch (task.id) {
    case 'simple_face':
      return await simplefaceData(task)
    case 'titanic':
      return await titanicData(task)
    case 'cifar10':
      return await cifar10Data(task)
    case 'lus_covid':
      return await lusCovidData(task)
    case 'YOUR CUSTOM TASK HERE':
      throw new Error('YOUR CUSTOM FUNCTION HERE')
    default:
      throw new Error(`Data loader for ${task.id} not implemented.`)
  }
}
