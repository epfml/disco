import { v4 as randomUUID } from 'uuid'

import { privacy, serialization, informant, MetadataID, WeightsContainer } from '../..'
import { Base } from '../base'

import * as messages from './messages'
import { type, clientConnected } from '../messages'
import * as nodeUrl from 'url'
import { EventConnection, waitMessageWithTimeout, WebSocketServer } from '../event_connection'
import { MAX_WAIT_PER_ROUND } from '../utils'
import { SustainabilityMetrics } from "./sustainability_metrics"

/**
 * Class that deals with communication with the centralized server when training
 * a specific task in the federated setting.
 */
export class Client extends Base {
  private readonly clientID = randomUUID()
  private readonly peer: any
  private round = 0

  protected _server?: EventConnection

  // Attributes used to wait for a response from the server
  private serverRound?: number
  private serverWeights?: WeightsContainer
  private receivedStatistics?: Record<string, number>
  private metadataMap?: Map<string, unknown>

  private sustainabilityMetrics: SustainabilityMetrics = {
    latency: 0,
    carbonIntensity: 0,
  }

  public get server(): EventConnection {
    if (this._server === undefined) {
      throw new Error('server undefined, not connected')
    }
    return this._server
  }

  // It opens a new WebSocket connection and listens to new messages over the channel
  private async connectServer(url: URL): Promise<EventConnection> {
    const server: EventConnection = await WebSocketServer.connect(url, messages.isMessageFederated, messages.isMessageFederated)

    return server
  }

  /**
   * Initialize the connection to the server. TODO: In the case of FeAI,
   * should return the current server-side round for the task.
   */
  async connect(): Promise<void> {
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
    this._server = await this.connectServer(serverURL)
    const msg: clientConnected = {
      type: type.clientConnected
    }
    this.server.send(msg)
    await waitMessageWithTimeout(this.server, type.clientConnected, MAX_WAIT_PER_ROUND)
    this.connected = true
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect(): Promise<void> {
    this.server.disconnect()
    this._server = undefined
    this.connected = false
  }

  // It sends a message to the server
  private sendMessage(msg: messages.MessageFederated): void {
    this.server?.send(msg)
  }

  private retrieveCarbonIntensity(): number {
    // don't try this at home (for demo)
    let cc: string = (window as any).country_code
    if (cc === undefined) {
      cc = "CH"
    }
    // do not overload API server
    //curl 'https://api.co2signal.com/v1/latest?countryCode={this.countryCode}' -H "auth-token: $API_TOKEN"
    let dummy_data = {
      "status": "ok",
      "countryCode": cc,
      "data": {
        "datetime": "2022-12-03T17:00:00.000Z",
        "carbonIntensity": cc == "CH" ? 290 : 310,
        "fossilFuelPercentage": 19.28
      },
      "units": {
        "carbonIntensity": "gCO2eq/kWh"
      }
    }

    if (dummy_data.status != "ok") {
      return -1
    }

    return dummy_data.data.carbonIntensity
  }

  // It sends weights to the server
  async postWeightsToServer(weights: WeightsContainer): Promise<void> {
    // kpj: client sends weights to server

    this.sustainabilityMetrics.carbonIntensity = this.retrieveCarbonIntensity()

    const msg: messages.postWeightsToServer = {
      type: type.postWeightsToServer,
      weights: await serialization.weights.encode(weights),
      round: this.round,
      sustainabilityMetrics: this.sustainabilityMetrics,
    }
    this.sendMessage(msg)
  }

  // It retrieves the last server round and weights, but return only the server round
  async getLatestServerRound(): Promise<number | undefined> {
    this.serverRound = undefined
    this.serverWeights = undefined

    const msg: messages.messageGeneral = {
      type: type.latestServerRound
    }
    this.sendMessage(msg)

    const received = await waitMessageWithTimeout(this.server, type.latestServerRound, MAX_WAIT_PER_ROUND)

    this.serverRound = received.round
    this.serverWeights = serialization.weights.decode(received.weights)

    return this.serverRound
  }

  // It retrieves the last server round and weights, but return only the server weights
  async pullRoundAndFetchWeights(): Promise<WeightsContainer | undefined> {
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
  async pullServerStatistics(
    trainingInformant: informant.FederatedInformant
  ): Promise<void> {
    this.receivedStatistics = undefined

    const msg: messages.messageGeneral = {
      type: type.pullServerStatistics
    }
    this.sendMessage(msg)

    const received = await waitMessageWithTimeout(this.server, type.pullServerStatistics, MAX_WAIT_PER_ROUND)
    this.receivedStatistics = received.statistics

    trainingInformant.update(this.receivedStatistics ?? {})
  }

  // It posts a new metadata value to the server
  async postMetadata(metadataID: MetadataID, metadata: string): Promise<void> {
    const msg: messages.postMetadata = {
      type: type.postMetadata,
      taskId: this.task.taskID,
      clientId: this.clientID,
      round: this.round,
      metadataId: metadataID,
      metadata: metadata
    }

    this.sendMessage(msg)
  }

  // It gets a metadata map from the server
  async getMetadataMap(
    metadataId: MetadataID
  ): Promise<Map<string, unknown> | undefined> {
    this.metadataMap = undefined

    const msg: messages.getMetadataMap = {
      type: type.getMetadataMap,
      taskId: this.task.taskID,
      clientId: this.clientID,
      round: this.round,
      metadataId: metadataId
    }

    this.sendMessage(msg)

    const received = await waitMessageWithTimeout(this.server, type.getMetadataMap, MAX_WAIT_PER_ROUND)
    if (received.metadataMap !== undefined) {
      this.metadataMap = new Map(received.metadataMap)
    }

    return this.metadataMap
  }

  async onRoundEndCommunication(
    updatedWeights: WeightsContainer,
    staleWeights: WeightsContainer,
    _: number,
    trainingInformant: informant.FederatedInformant
  ): Promise<WeightsContainer> {
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

  async onTrainEndCommunication(): Promise<void> { }
}
