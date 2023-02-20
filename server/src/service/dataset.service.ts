import { type InputDataset, SourceType } from '../dto/InputDataset.js'
import { Dataset } from '../database/entities/dataset.js'
import { Feature } from '../database/entities/feature.js'
import { orm } from '../database.js'
import { parse, type Parser } from 'csv-parse'
import got from 'got'
import { pipeline } from 'node:stream/promises'
import type stream from 'node:stream'
import { DatasetSample, FeatureSample } from '../dto/DatasetSample.js'
import { type InputFeature } from '@/dto/InputDataset.js'

/* Service handles:
  - Mapping between dto and database represations
  - Specific business logic
  - Interraction with database layers
*/

const gotLimitDownload = got.extend({
  handlers: [
    (options, next) => {
      const { downloadLimit } = options.context
      const promiseOrStream: any = next(options)

      // A destroy function that supports both promises and streams
      const destroy = (message: string): void => {
        if (options.isStream) {
          promiseOrStream.destroy(new Error(message))
          return
        }
        promiseOrStream.cancel(message)
      }

      if (typeof downloadLimit === 'number') {
        promiseOrStream.on('downloadProgress', (progress: any) => {
          if (progress.transferred > downloadLimit && progress.percent !== 1) {
            destroy(`Exceeded the download limit of ${downloadLimit} bytes`)
          }
        })
      }

      return promiseOrStream
    }
  ]
})

interface ParsedData {
  columnCount: number
  dataCount: number
}

const mapper = (dto: InputDataset, extraData: ParsedData): Dataset => {
  const datasetEntity = new Dataset(dto.dataType, dto.title, dto.description, extraData.dataCount, extraData.columnCount, dto.source, dto.sourceType)
  const features: Feature[] = dto.features.map((f: InputFeature, index: number) => new Feature(f.name, f.description, f.allowFeature, f.allowLabel, index + 1))

  datasetEntity.features.add(features)

  return datasetEntity
}

function getDatasetStream (source: string, sourceType: SourceType): stream.Readable {
  const MEGABYTE = 1048576

  switch (sourceType) {
    case SourceType.DirectUrl:
      return gotLimitDownload.stream.get(source, { context: { downloadLimit: 20 * MEGABYTE } }).on('error', (err) => { err.message = 'Is your URL correct?' })
    case SourceType.GoogleDrive:
      return gotLimitDownload.stream.get(buildDriveDirectURL(extractDriveId(source)), { context: { downloadLimit: 20 * MEGABYTE } })
    default:
      throw new Error('Not implemented')
  }
}

function extractDriveId (url: string): string {
  const formatRegexes = new Set([
    /https:\/\/drive\.google\.com\/file\/d\/(?<id>.*?)\/(?:edit|view)\?usp=share_link$/,
    /https:\/\/drive\.google\.com\/open\?id=(?<id>.*?)$/
  ])

  for (const format of formatRegexes) {
    if (format.test(url)) {
      const match = format.exec(url)
      if (match?.groups !== undefined) {
        return match.groups.id
      }
    }
  }

  throw new Error('Invalid URL provided.')
}

function buildDriveDirectURL (id: string): string {
  const alphanumericRegex = /^[\w-]+$/

  if (alphanumericRegex.test(id)) {
    return `https://drive.google.com/uc?export=download&id=${id}`
  } else {
    throw new Error('Google drive id bad format')
  }
}

async function parseDataset (datasetStream: stream.Readable, dataset: InputDataset): Promise<ParsedData> {
  let count: number = 0
  let columnCount: number = 0
  const handleRows = async function * (parser: any): AsyncGenerator {
    for await (const row of parser) {
      const current: any[] = row
      if (count === 0) {
        // Header line
        if (current.length !== dataset.features.length) {
          throw new Error(`${dataset.features.length} features described but detected ${current.length} headers in file`)
        }
        columnCount = current.length
      }
      if (current.length !== columnCount) {
        throw new Error(`${current.length} value detected on row ${count} but detected ${columnCount} headers in file`)
      }
      count++
    }
  }

  // Need a pipeline to avoid application crashing error during stream processing
  await pipeline(
    datasetStream,
    getParser(),
    handleRows
  )

  // Currently, we trust the user for the columnNumber of the features, we just check if the number of column is consistent

  return {
    columnCount,
    dataCount: count - 1 // ignore header
  }
}

async function enrichDatasetFromSource (dataset: InputDataset): Promise<Dataset> {
  // Using a stream avoid loading the whole csv into memory
  const datasetStream = getDatasetStream(dataset.source, dataset.sourceType)

  return mapper(dataset, await parseDataset(datasetStream, dataset))
}

export async function findAll (): Promise<Dataset[]> {
  const datasets: Dataset[] = await orm.em.getRepository(Dataset).findAll({
    limit: 20,
    populate: ['features']
  })

  return datasets
}

export async function find (id: string): Promise<Dataset> {
  return await orm.em.getRepository(Dataset).findOneOrFail(id, { populate: ['features'] })
}

export async function insert (dataset: InputDataset): Promise<Dataset> {
  const datasetEntity = await enrichDatasetFromSource(dataset)

  const upserted = await orm.em.getRepository(Dataset).upsert(datasetEntity, { })
  await orm.em.getRepository(Dataset).flush()

  return upserted
}

export async function update (id: string, dataset: InputDataset): Promise<Dataset> {
  // TODO
  throw new Error('To implement when needed')
}

export async function loadSample (id: string): Promise<DatasetSample> {
  const dataset: Dataset = await find(id)

  const records: any[] = []
  await pipeline(
    getDatasetStream(dataset.source, dataset.sourceType),
    getParser(),
    pushRows(records, 10)
  )

  records.shift() // remove headers

  return new DatasetSample(dataset.features.getItems()
    .sort((a, b) => a.columnNumber - b.columnNumber)
    .map(f => new FeatureSample(f.name, records.map(x => x[f.columnNumber - 1])))
  )
}

export async function loadFeatures (source: string, sourceType: SourceType): Promise<string[]> {
  const records: any[] = []

  await pipeline(
    getDatasetStream(source, sourceType),
    getParser(),
    pushRows(records, 1)
  )

  return records[0] // headers
}

function getParser (): Parser {
  return parse({
    bom: true,
    delimiter: [',', ';']
  })
}

// For some reasons, if we configure the parser with a "to_line" limit, the pipeline will hangs indefinitely because the read stream was not completely read
// If we don't use the pipeline, errors are not handled and thrown back to the main thread
// So we manually ignore rows after the limit is reached, but the problem is that we still have to read the readable stream entirely, which might be slow for large files?
const pushRows = (records: any[], limit?: number) => async function * (parser: any) {
  let count = 0
  for await (const row of parser) {
    count++
    if (limit !== undefined && count <= limit) {
      records.push(row)
    }
  }
}
