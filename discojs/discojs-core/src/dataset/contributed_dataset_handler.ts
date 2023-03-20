import axios from 'axios'

const DATASET_ENDPOINT = 'dataset'

export async function pushDataset (
  url: URL,
  dataset: unknown
): Promise<void> {
  await axios.post(
    url.href + DATASET_ENDPOINT,
    dataset
  )
}

export async function fetchDatasets (url: URL): Promise<unknown[]> {
  const response = await axios.get(url.href + DATASET_ENDPOINT)
  const datasets: unknown = response.data

  if (!Array.isArray(datasets)) {
    throw new Error('invalid datasets response')
  }

  return datasets
}

export async function fetchDataset (url: URL, id: string): Promise<unknown> {
  const response = await axios.get(url.href + DATASET_ENDPOINT + '/' + id)
  const dataset: unknown = response.data

  return dataset
}

export async function fetchSample (url: URL, id: string): Promise<unknown> {
  const response = await axios.get(url.href + DATASET_ENDPOINT + '/' + id + '/sample')
  const sample: unknown = response.data

  return sample
}

export async function fetchFeatures (url: URL, source: string, sourceType: string): Promise<string[]> {
  const response = await axios.get(url.href + DATASET_ENDPOINT + '/features', {
    params: {
      source,
      sourceType
    }
  })
  const features: string[] = response.data

  return features
}
