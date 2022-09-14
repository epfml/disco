import * as msgpack from 'msgpack-lite'
import isomorphic from 'isomorphic-ws'
import { v4 as randomUUID } from 'uuid'

import { privacy, serialization, informant, Weights, MetadataID } from '../..'
import { Base } from '../base'

import * as messages from './messages'
import * as nodeUrl from 'url'

const TICK = 100
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the centralized server when training
 * a specific task in the federated setting.
 */
export class Client extends Base {
  private readonly clientID = randomUUID()
  private readonly peer: any
  private round = 0

  protected server?: isomorphic.WebSocket

  // Attributes used to wait for a response from the server
  private serverRound?: number
  private serverWeights?: Weights
  private receivedStatistics?: Record<string, number>
  private metadataMap?: Map<string, unknown>

  // Methods to check and return the correct message type
  private instanceOfMessageGeneral (
    msg: unknown
  ): msg is messages.messageGeneral {
    return typeof msg === 'object' && msg !== null && 'type' in msg
  }

  private instanceOfLatestServerRound (
    msg: messages.messageGeneral
  ): msg is messages.latestServerRound {
    return msg.type === messages.messageType.latestServerRound
  }

  private instanceOfPullServerStatistical (
    msg: messages.messageGeneral
  ): msg is messages.pullServerStatistics {
    return msg.type === messages.messageType.pullServerStatistics
  }

  private instanceOfGetMetadataMap (
    msg: messages.messageGeneral
  ): msg is messages.getMetadataMap {
    return msg.type === messages.messageType.getMetadataMap
  }

  // It opens a new WebSocket connection and listens to new messages over the channel
  private async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const WS =
      typeof window !== 'undefined' ? window.WebSocket : isomorphic.WebSocket
    const ws = new WS(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      // check message type to choose correct action
      if (this.instanceOfMessageGeneral(msg)) {
        this.clientHandle(msg)
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`)) // eslint-disable-line @typescript-eslint/restrict-template-expressions
      ws.onopen = () => resolve(ws)
    })
  }

  // Utility method to wait until a condition is not true
  protected async pauseUntil (condition: () => boolean): Promise<void> {
    return await new Promise<void>((resolve, reject) => {
      const timeWas = new Date().getTime()
      const wait = setInterval(function () {
        if (condition()) {
          console.log('resolved after', new Date().getTime() - timeWas, 'ms')
          clearInterval(wait)
          resolve()
        } else if (new Date().getTime() - timeWas > MAX_WAIT_PER_ROUND) {
          // Timeout
          console.log('rejected after', new Date().getTime() - timeWas, 'ms')
          clearInterval(wait)
          reject(new Error('timeout'))
        }
      }, TICK)
    })
  }

  // It handles a message once received over the channel
  private clientHandle (msg: messages.messageGeneral): void {
    if (this.instanceOfLatestServerRound(msg)) {
      this.serverRound = msg.round
      this.serverWeights = serialization.weights.decode(msg.weights)
    } else if (this.instanceOfPullServerStatistical(msg)) {
      this.receivedStatistics = msg.statistics
    } else if (this.instanceOfGetMetadataMap(msg)) {
      if (msg.metadataMap !== undefined) {
        this.metadataMap = new Map(msg.metadataMap)
      }
    }
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect (): Promise<void> {
    const URL = typeof window !== 'undefined' ? window.URL : nodeUrl.URL
    const serverURL = new URL('', this.url.href)
    switch (this.url.protocol) {
      case 'http:':
        serverURL.protocol = 'ws:'
        break
      case 'https:':
        serverURL.protocol = 'wss:'
        break
      default:
        throw new Error(`unknown protocol: ${this.url.protocol}`)
    }
    serverURL.pathname += `feai/${this.task.taskID}/${this.clientID}`
    this.server = await this.connectServer(serverURL)
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    this.server?.close()
    this.server = undefined
  }

  // It sends a message to the server
  private sendMessage (msg: messages.messageGeneral): void {
    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined) {
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg)
  }

  // It sends weights to the server
  async postWeightsToServer (weights: Weights): Promise<void> {
    const msg: messages.postWeightsToServer = {
      type: messages.messageType.postWeightsToServer,
      weights: await serialization.weights.encode(weights),
      round: this.round
    }
    this.sendMessage(msg)
  }

  // It retrieves the last server round and weights, but return only the server round
  async getLatestServerRound (): Promise<number | undefined> {
    this.serverRound = undefined
    this.serverWeights = undefined

    const msg: messages.messageGeneral = {
      type: messages.messageType.latestServerRound
    }
    this.sendMessage(msg)

    await this.pauseUntil(
      () => this.serverRound !== undefined && this.serverWeights !== undefined
    )

    return this.serverRound
  }

  // It retrieves the last server round and weights, but return only the server weights
  async pullRoundAndFetchWeights (): Promise<Weights | undefined> {
    // get server round of latest model
    await this.getLatestServerRound()

    if (this.round < (this.serverRound ?? 0)) {
      // Update the local round to match the server's
      this.round = this.serverRound as number
      return this.serverWeights
    } else {
      return undefined
    }
  }

  // It pulls statistics from the server
  async pullServerStatistics (
    trainingInformant: informant.FederatedInformant
  ): Promise<void> {
    this.receivedStatistics = undefined

    const msg: messages.messageGeneral = {
      type: messages.messageType.pullServerStatistics
    }
    this.sendMessage(msg)

    await this.pauseUntil(() => this.receivedStatistics !== undefined)

    trainingInformant.update(this.receivedStatistics ?? {})
  }

  // It posts a new metadata value to the server
  async postMetadata (metadataID: MetadataID, metadata: string): Promise<void> {
    const msg: messages.postMetadata = {
      type: messages.messageType.postMetadata,
      taskId: this.task.taskID,
      clientId: this.clientID,
      round: this.round,
      metadataId: metadataID,
      metadata: metadata
    }

    this.sendMessage(msg)
  }

  // It gets a metadata map from the server
  async getMetadataMap (
    metadataId: MetadataID
  ): Promise<Map<string, unknown> | undefined> {
    this.metadataMap = undefined

    const msg: messages.getMetadataMap = {
      type: messages.messageType.postMetadata,
      taskId: this.task.taskID,
      clientId: this.clientID,
      round: this.round,
      metadataId: metadataId
    }

    this.sendMessage(msg)

    await this.pauseUntil(() => this.metadataMap !== undefined)

    return this.metadataMap
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    _: number,
    trainingInformant: informant.FederatedInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(
      updatedWeights,
      staleWeights,
      this.task
    )
    await this.postWeightsToServer(noisyWeights)

    await this.pullServerStatistics(trainingInformant)

    const serverWeights = await this.pullRoundAndFetchWeights()
    return serverWeights ?? staleWeights
  }

  async onTrainEndCommunication (): Promise<void> {}
}
