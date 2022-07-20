import { Set } from 'immutable'

import { DataExample, isDataExample } from './data_example'

export function isDisplayInformation (raw: unknown): raw is DisplayInformation {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  const requiredFields = Set.of(
    'dataExampleText',
    'dataFormatInformation',
    'overview',
    'summary',
    'taskTitle',
    'tradeoffs'
  )

  type Fields =
    'dataExample' |
    'dataExampleImage' |
    'dataExampleText' |
    'dataFormatInformation' |
    'headers' |
    'limitations' |
    'model' |
    'overview' |
    'summary' |
    'taskTitle' |
    'tradeoffs'
  if (!requiredFields.isSubset(Object.keys(raw))) {
    return false
  }
  const {
    dataExample,
    dataExampleImage,
    dataExampleText,
    dataFormatInformation,
    headers,
    limitations,
    model,
    overview,
    summary,
    taskTitle,
    tradeoffs
  } = raw as Record<Fields, unknown | undefined>

  if (
    typeof dataExampleText !== 'string' ||
    typeof dataFormatInformation !== 'string' ||
    typeof overview !== 'string' ||
    typeof summary !== 'string' ||
    typeof taskTitle !== 'string' ||
    typeof tradeoffs !== 'string' ||
    (model !== undefined && typeof model !== 'string') ||
    (dataExampleImage !== undefined && typeof dataExampleImage !== 'string') ||
    (limitations !== undefined && typeof limitations !== 'string')
  ) {
    return false
  }
  if (
    dataExample !== undefined && !(
      Array.isArray(dataExample) &&
      dataExample.every(isDataExample))
  ) {
    return false
  }
  if (
    headers !== undefined && !(
      Array.isArray(headers) &&
      headers.every((e) => typeof e === 'string'))
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: DisplayInformation = {
    taskTitle,
    summary,
    overview,
    tradeoffs,
    dataFormatInformation,
    dataExampleText,
    model,
    dataExample,
    headers,
    dataExampleImage,
    limitations
  }

  return true
}

export interface DisplayInformation {
  taskTitle: string
  summary: string
  overview: string
  tradeoffs: string
  dataFormatInformation: string
  // TODO merge dataExample*
  dataExampleText: string
  model?: string
  // TODO no need for undefined
  dataExample?: DataExample[]
  // TODO no need for undefined
  headers?: string[]
  dataExampleImage?: string
  limitations?: string
}
