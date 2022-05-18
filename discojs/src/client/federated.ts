import * as msgpack from 'msgpack-lite'
import axios from 'axios'
import { v4 as randomUUID } from 'uuid'

import { privacy, serialization, TrainingInformant, MetadataID, Weights } from '..'

import { Base } from './base'

/**
 * Class that deals with communication with the centralized server when training
 * a specific task in the federated setting.
 */
export class Federated extends Base {
  private readonly clientID = randomUUID()
  private readonly peer: any
  private round = -1 // The server starts at round 0, in the beginning we are behind

  private urlTo (category: string): string {
    return [
      this.url,
      category,
      this.task.taskID,
      this.clientID
    ].join('/')
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
        weights: await serialization.encodeWeights(weights),
        round: this.round
      }
    })
  }

  async postMetadata (metadataID: string, metadata: string): Promise<void> {
    await axios({
      method: 'post',
      url: `${this.url.href}/metadata/${metadataID}/${this.task.taskID}/${this.round}/${this.clientID}`,
      data: {
        metadataID: metadata
      }
    })
  }

  async getMetadataMap (metadataID: MetadataID): Promise<Map<string, unknown>> {
    const response = await axios.get(`${this.url.href}/metadata/${metadataID}/${this.task.taskID}/${this.round}/${this.clientID}`)

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
    const serverWeights = serialization.decodeWeights(response.data)

    if (this.round < serverRound) {
      // Update the local round to match the server's
      this.round = serverRound
      return serverWeights
    } else {
      return undefined
    }
  }

  async pullServerStatistics (trainingInformant: TrainingInformant): Promise<void> {
    const response = await axios.get(this.urlTo('statistics'))
    trainingInformant.updateWithServerStatistics(response.data.statistics)
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    _: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    await this.postWeightsToServer(noisyWeights)

    await this.pullServerStatistics(trainingInformant)

    const serverWeights = await this.pullRoundAndFetchWeights()
    return serverWeights ?? staleWeights
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    trainingInformant.addMessage('Training finished.')
  }
}
