import { type Summary, isSummary } from './summary.js'
import { type DataExample, isDataExample } from './data_example.js'
import { type LabelType, isLabelType } from './label_type.js'

export interface DisplayInformation {
  taskTitle: string
  summary: Summary
  tradeoffs?: string
  dataFormatInformation?: string
  // TODO merge dataExample
  dataExampleText?: string
  model?: string
  // TODO no need for undefined
  dataExample?: DataExample[]
  // TODO no need for undefined
  headers?: string[]
  // Displays the image at this URL in the UI as an example when connecting data
  dataExampleImage?: string
  // URL to download a dataset for the task, is displayed in the UI when asking to connect data
  sampleDatasetLink?: string
  limitations?: string
  labelDisplay?: LabelType
}

export function isDisplayInformation (raw: unknown): raw is DisplayInformation {
  if (typeof raw !== 'object' || raw === null) {
    return false
  }

  const {
    dataExample,
    dataExampleImage,
    dataExampleText,
    dataFormatInformation,
    sampleDatasetLink,
    headers,
    labelDisplay,
    limitations,
    model,
    summary,
    taskTitle,
    tradeoffs
  }: Partial<Record<keyof DisplayInformation, unknown>> = raw

  if (
    typeof taskTitle !== 'string' ||
    (dataExampleText !== undefined && typeof dataExampleText !== 'string') ||
    (sampleDatasetLink !== undefined && typeof sampleDatasetLink !== 'string') ||
    (dataFormatInformation !== undefined && typeof dataFormatInformation !== 'string') ||
    (tradeoffs !== undefined && typeof tradeoffs !== 'string') ||
    (model !== undefined && typeof model !== 'string') ||
    (dataExampleImage !== undefined && typeof dataExampleImage !== 'string') ||
    (labelDisplay !== undefined && !isLabelType(labelDisplay)) ||
    (limitations !== undefined && typeof limitations !== 'string')
  ) {
    return false
  }

  if (!isSummary(summary)) {
    return false
  }
  if (sampleDatasetLink !== undefined) {
    try {
      new URL(sampleDatasetLink)
    } catch {
      return false
    }
  }
  if (dataExampleImage !== undefined) {
    try {
      new URL(dataExampleImage)
    } catch {
      return false
    }
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

  const repack = {
    dataExample,
    dataExampleImage,
    dataExampleText,
    dataFormatInformation,
    sampleDatasetLink,
    headers,
    labelDisplay,
    limitations,
    model,
    summary,
    taskTitle,
    tradeoffs,
  }
  const _correct: DisplayInformation = repack
  const _total: Record<keyof DisplayInformation, unknown> = repack

  return true
}
