import { type Summary, isSummary } from './summary'
import { type DataExample, isDataExample } from './data_example'
import { type LabelType } from './label_type'

export function isDisplayInformation (raw: unknown): raw is DisplayInformation {
  if (typeof raw !== 'object') {
    return false
  }
  if (raw === null) {
    return false
  }

  type Fields =
    'dataExample' |
    'dataExampleImage' |
    'dataExampleText' |
    'dataFormatInformation' |
    'headers' |
    'limitations' |
    'model' |
    'summary' |
    'taskTitle' |
    'tradeoffs'
  const {
    dataExample,
    dataExampleImage,
    dataExampleText,
    dataFormatInformation,
    headers,
    limitations,
    model,
    summary,
    taskTitle,
    tradeoffs
  } = raw as Record<Fields, unknown | undefined>

  if (
    typeof taskTitle !== 'string' ||
    (dataExampleText !== undefined && typeof dataExampleText !== 'string') ||
    (dataFormatInformation !== undefined && typeof dataFormatInformation !== 'string') ||
    (tradeoffs !== undefined && typeof tradeoffs !== 'string') ||
    (model !== undefined && typeof model !== 'string') ||
    (dataExampleImage !== undefined && typeof dataExampleImage !== 'string') ||
    (limitations !== undefined && typeof limitations !== 'string')
  ) {
    return false
  }

  if (summary !== undefined && !isSummary(summary)) {
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
  taskTitle?: string
  summary?: Summary
  tradeoffs?: string
  dataFormatInformation?: string
  // TODO merge dataExample
  dataExampleText?: string
  model?: string
  // TODO no need for undefined
  dataExample?: DataExample[]
  // TODO no need for undefined
  headers?: string[]
  dataExampleImage?: string
  limitations?: string
  labelDisplay?: LabelType
}
