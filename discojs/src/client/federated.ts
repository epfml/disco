import * as msgpack from 'msgpack-lite'
import axios from 'axios'
import { v4 as randomUUID } from 'uuid'

import { privacy, serialization, informant, MetadataID, Weights } from '..'
import { Base } from './base'

/**
 * Class that deals with communication with the centralized server when training
 * a specific task in the federated setting.
 */
export class Federated extends Base {
  private readonly clientID = randomUUID()
  private readonly peer: any
  private round = 0

  private urlTo (category: string): string {
    const url = new URL('', this.url)

    url.pathname += [
      'feai',
      category,
      this.task.taskID,
      this.clientID
    ].join('/')

    return url.href
  }

  private urlToMetadata (metadataID: string): string {
    const url = new URL('', this.url)

    url.pathname += [
      'feai',
      'metadata',
      metadataID,
      this.task.taskID,
      this.round,
      this.clientID
    ].join('/')

    return url.href
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect (): Promise<void> {
    await axios.get(this.urlTo('connect'))
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    await axios.get(this.urlTo('disconnect'))
  }

  async postWeightsToServer (weights: Weights): Promise<void> {
    await axios({
      method: 'post',
      url: this.urlTo('weights'),
      data: {
        weights: await serialization.weights.encode(weights),
        round: this.round
      }
    })
  }

  async postMetadata (metadataID: string, metadata: string): Promise<void> {
    await axios({
      method: 'post',
      url: this.urlToMetadata(metadataID),
      data: {
        metadataID: metadata
      }
    })
  }

  async getMetadataMap (metadataID: MetadataID): Promise<Map<string, unknown>> {
    const response = await axios.get(this.urlToMetadata(metadataID))

    const body = await response.data
    return new Map(msgpack.decode(body[metadataID]))
  }

  async getLatestServerRound (): Promise<number> {
    const response = await axios.get(this.urlTo('round'))

    if (response.status === 200) {
      return response.data.round
    }
    console.log('Error getting weights: code', response.status)
    return -1
  }

  async pullRoundAndFetchWeights (): Promise<Weights | undefined> {
    // get server round of latest model
    const serverRound = await this.getLatestServerRound()
    const response = await axios.get(this.urlTo('weights'))
    const serverWeights = serialization.weights.decode(response.data)

    if (this.round < serverRound) {
      // Update the local round to match the server's
      this.round = serverRound
      return serverWeights
    } else {
      return undefined
    }
  }

  async pullServerStatistics (trainingInformant: informant.FederatedInformant): Promise<void> {
    const response = await axios.get(this.urlTo('statistics'))
    trainingInformant.update(response.data.statistics)
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    _: number,
    trainingInformant: informant.FederatedInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    await this.postWeightsToServer(noisyWeights)

    await this.pullServerStatistics(trainingInformant)

    const serverWeights = await this.pullRoundAndFetchWeights()
    return serverWeights ?? staleWeights
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: informant.FederatedInformant): Promise<void> {
    trainingInformant.addMessage('Training finished.')
  }
}
