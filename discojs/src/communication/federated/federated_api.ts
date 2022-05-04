import axios, { AxiosResponse } from 'axios'

import { serialization, Weights } from '../../'

// TODO merge with FederatedClient

// TODO use Client given url
function serverUrl (): string {
  // We place this in a function since during a test script the env is not defined
  const envVar = process.env.VUE_APP_FEAI_SERVER
  if (envVar === undefined) {
    throw new Error('VUE_APP_FEAI_SERVER is not definied')
  }

  return envVar
}

export async function connect (taskID: string, clientID: string): Promise<AxiosResponse> {
  return await axios.get(serverUrl().concat(`connect/${taskID}/${clientID}`))
}

export async function disconnect (taskID: string, clientID: string): Promise<AxiosResponse> {
  return await axios.get(serverUrl().concat(`disconnect/${taskID}/${clientID}`))
}

export async function queryLogs (taskID: string, round: number, clientID: string): Promise<AxiosResponse> {
  const params = []
  if (taskID !== undefined) params.push(`task=${taskID}`)
  if (round !== undefined) params.push(`round=${round}`)
  if (clientID !== undefined) params.push(`id=${clientID}`)
  const query = params.join('&')
  return await axios.get(serverUrl().concat(`logs?${query}`))
}

export async function postWeights (taskID: string, clientID: string, weights: Weights, round: number): Promise<AxiosResponse> {
  const url = serverUrl().concat(`weights/${taskID}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      weights: await serialization.encodeWeights(weights),
      round
    }
  })
}

// I was thinking that since simple gets like this might be used quite commonly it could be nice to
// have a function that crafts the query directly, what do you think ?
async function fetchFromServer (route: string, ...requiredParameters: string[]): Promise<AxiosResponse> {
  const queryUrl = route + requiredParameters.map(x => '/' + x).join('')
  const url = serverUrl().concat(queryUrl)
  return await axios.get(url)
}

export async function getRound (taskID: string, clientID: string): Promise<AxiosResponse> {
  return await fetchFromServer('round', taskID, clientID)
}

export async function getWeights (taskID: string, clientID: string): Promise<Weights> {
  const res = await fetchFromServer('weights', taskID, clientID)
  return serialization.decodeWeights(res.data)
}

export async function getAsyncWeightInformantStatistics (taskID: string, clientID: string): Promise<AxiosResponse> {
  return await fetchFromServer('statistics', taskID, clientID)
}

export async function postMetadata (
  taskID: string,
  round: number,
  clientID: string,
  metadataID: string,
  metadata: string
): Promise<AxiosResponse> {
  const url = serverUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      metadataID: metadata
    }
  })
}

export async function getMetadataMap (taskID: string, round: number, clientID: string, metadataID: string): Promise<AxiosResponse> {
  return await axios.get(
    serverUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  )
}
