import axios from 'axios'

function feaiServerUrl () {
  // We place this in a function since during a test script the env might not be defined
  return process.env.VUE_APP_FEAI_SERVER
}

export async function connect (taskID, clientID) {
  return await axios.get(feaiServerUrl().concat(`connect/${taskID}/${clientID}`))
}

export async function disconnect (taskID, clientID) {
  return await axios.get(feaiServerUrl().concat(`disconnect/${taskID}/${clientID}`))
}

export async function selectionStatus (taskID, clientID) {
  return await axios.get(feaiServerUrl().concat(`selection/${taskID}/${clientID}`))
}

export async function aggregationStatus (taskID, round, clientID) {
  return await axios.get(feaiServerUrl().concat(`aggregation/${taskID}/${round}/${clientID}`))
}

export async function queryLogs (taskID, round, clientID) {
  const params = []
  if (taskID !== undefined) params.push(`task=${taskID}`)
  if (round !== undefined) params.push(`round=${round}`)
  if (clientID !== undefined) params.push(`id=${clientID}`)
  const query = params.join('&')
  return await axios.get(feaiServerUrl().concat(`logs?${query}`))
}

export async function postWeights (taskID, round, clientID, weights) {
  const url = feaiServerUrl().concat(`weights/${taskID}/${round}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      weights: weights
    }
  })
}

export async function postMetadata (
  taskID,
  round,
  clientID,
  metadataID,
  metadata
) {
  const url = feaiServerUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  return await axios({
    method: 'post',
    url: url,
    data: {
      metadataID: metadata
    }
  })
}

export async function getMetadataMap (taskID, round, clientID, metadataID) {
  return await axios.get(
    feaiServerUrl().concat(`metadata/${metadataID}/${taskID}/${round}/${clientID}`)
  )
}
