import axios from 'axios'

import type { Logger, Model, Task, WeightsContainer } from '../index.js'
import { serialization } from '../index.js'
import type { NodeID } from './types.js'
import type { EventConnection } from './event_connection.js'
import type { Aggregator } from '../aggregator/index.js'

/**
 * Main, abstract, class representing a Disco client in a network, which handles
 * communication with other nodes, be it peers or a server.
 */
export abstract class Client {
  /**
   * Own ID provided by the network's server.
   */
  protected _ownId?: NodeID
  /**
   * The network's server.
   */
  protected _server?: EventConnection
  /**
   * The aggregator's result produced after aggregation.
   */
  protected aggregationResult?: Promise<WeightsContainer>

  constructor (
    public readonly url: URL, // The network server's URL to connect to
    public readonly task: Task, // The client's corresponding task
    public readonly aggregator: Aggregator,
    protected readonly logger: Logger
  ) {}

  /**
   * Handles the connection process from the client to any sort of network server.
   */
  async connect (): Promise<void> {}

  /**
   * Handles the disconnection process of the client from any sort of network server.
   */
  async disconnect (): Promise<void> {}

  /**
   * Fetches the latest model available on the network's server, for the adequate task.
   * @returns The latest model
   */
  async getLatestModel (): Promise<Model> {
    const url = new URL('', this.url.href)
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/'
    }
    url.pathname += `tasks/${this.task.id}/model.json`

    const response = await axios.get<ArrayBuffer>(url.href, { responseType: 'arraybuffer' })
    return await serialization.model.decode(new Uint8Array(response.data))
  }

  /**
   * Communication callback called at the beginning of every training round.
   */
  async onRoundBeginCommunication(): Promise<void> {}

  /**
   * Communication callback called the end of every training round.
   * @param weights The local weight update resulting for the current local training round
   * @returns aggregated weights or the local weights upon error
   */
  abstract onRoundEndCommunication(weights: WeightsContainer): Promise<WeightsContainer>;

  // Number of contributors to a collaborative session
  // If decentralized, it should be the number of peers
  // If federated, it should the number of participants excluding the server
  // If local it should be 1
  get nbOfParticipants(): number {
    return this.aggregator.nodes.size // overriden by the federated client
  }

  get ownId(): NodeID {
    if (this._ownId === undefined) {
      throw new Error('the node is not connected')
    }
    return this._ownId
  }

  get server (): EventConnection {
    if (this._server === undefined) {
      throw new Error('server undefined, not connected')
    }
    return this._server
  }
}
