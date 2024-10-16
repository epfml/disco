import createDebug from "debug";

import type { Model, Task, WeightsContainer, RoundStatus } from '../index.js'
import { serialization } from '../index.js'
import type { NodeID } from './types.js'
import type { EventConnection } from './event_connection.js'
import type { Aggregator } from '../aggregator/index.js'
import { EventEmitter } from '../utils/event_emitter.js'
import { type } from "./messages.js";

const debug = createDebug("discojs:client");

/**
 * Main, abstract, class representing a Disco client in a network, which handles
 * communication with other nodes, be it peers or a server.
 */
export abstract class Client extends EventEmitter<{'status': RoundStatus}>{
  // Own ID provided by the network's server.
  protected _ownId?: NodeID
  // The network's server.
  protected _server?: EventConnection
  // The aggregator's result produced after aggregation.
  protected aggregationResult?: Promise<WeightsContainer>
  /**
   * When the server notifies clients to pause and wait until more
   * participants join, we rely on this promise to wait
   * until the server signals that the training can resume
   */
  protected promiseForMoreParticipants: Promise<void> | undefined = undefined;

  /**
   * When the server notifies the client that they can resume training
   * after waiting for more participants, we want to be able to display what
   * we were doing before waiting (training locally or updating our model).
   * We use this attribute to store the status to rollback to when we stop waiting
   */
  private previousStatus: RoundStatus | undefined;

  constructor (
    public readonly url: URL, // The network server's URL to connect to
    public readonly task: Task, // The client's corresponding task
    public readonly aggregator: Aggregator,
  ) {
    super()
  }

  /**
   * Communication callback called at the beginning of every training round.
   */
  abstract onRoundBeginCommunication(): Promise<void>;

  /**
   * Communication callback called the end of every training round.
   * @param weights The local weight update resulting for the current local training round
   * @returns aggregated weights or the local weights upon error
   */
  abstract onRoundEndCommunication(weights: WeightsContainer): Promise<WeightsContainer>;

  /**
   * Handles the connection process from the client to any sort of network server.
   * This method is overriden by the federated and decentralized clients
   * By default, it fetches and returns the server's base model
   */
  async connect(): Promise<Model> {
    return this.getLatestModel()
  }

  /**
   * Handles the disconnection process of the client from any sort of network server.
   */
  async disconnect(): Promise<void> { }

  /**
   * Emits the round status specified. It also stores the status emitted such that 
   * if the server tells the client to wait for more participants, it can display
   * the waiting status and once enough participants join, it can display the previous status again
   */ 
  protected saveAndEmit(status: RoundStatus) {
    this.previousStatus = status
    this.emit("status", status)
  }
  
  /**
   * For both federated and decentralized clients, we listen to the server to tell
   * us whether there are enough participants to train. If not, we pause until further notice.
   * When a client connects to the server, the server answers with the session information (id, 
   * number of participants) and whether there are enough participants. 
   * When there are the server sends a new EnoughParticipant message to update the client. 
   * 
   * `setMessageInversionFlag` is used to address the following scenario:
   * 1. Client 1 connect to the server
   * 2. Server answers with message A containing "not enough participants"
   * 3. Before A arrives a new client joins. There are enough participants now.
   * 4. Server updates client 1 with message B saying "there are enough participants"
   * 5. Due to network and message sizes message B can arrive before A. 
   * i.e. "there are enough participants" arrives before "not enough participants"
   * ending up with client 1 thinking it needs to wait for more participants.
   * 
   * To keep track of this message inversion, `setMessageInversionFlag` 
   * tells us whether a message inversion occurred (by setting a boolean to true)
   * 
   * @param setMessageInversionFlag function flagging whether a message inversion occurred
   * between a NewNodeInfo message and an EnoughParticipant message.
   */
  protected setupServerCallbacks(setMessageInversionFlag: () => void) {
    // Setup an event callback if the server signals that we should 
    // wait for more participants
    this.server.on(type.WaitingForMoreParticipants, () => {
      if (this.promiseForMoreParticipants !== undefined)
        throw new Error("Server sent multiple WaitingForMoreParticipants messages")
      debug(`[${shortenId(this.ownId)}] received WaitingForMoreParticipants message from server`)
      // Display the waiting status right away
      this.emit("status", "not enough participants")
      // Upon receiving a WaitingForMoreParticipants message,
      // the client will await for this promise to resolve before sending its
      // local weight update
      this.promiseForMoreParticipants = this.createPromiseForMoreParticipants()
    })

    // As an example assume we need at least 2 participants to train,
    // When two participants join almost at the same time, the server
    // sends a NewNodeInfo with waitForMoreParticipants=true to the first participant
    // and directly follows with an EnoughParticipants message when the 2nd participant joins
    // However, the EnoughParticipants can arrive before the NewNodeInfo (which can be much bigger)
    // so we check whether we received the EnoughParticipants before being assigned a node ID
    this.server.once(type.EnoughParticipants, () => {
      if (this._ownId === undefined) {
        debug(`Received EnoughParticipants message from server before the NewFederatedNodeInfo message`)
        setMessageInversionFlag()
      }
    })
  }
  /**
   * Method called when the server notifies the client that there aren't enough 
   * participants (anymore) to start/continue training
   * The method creates a promise that will resolve once the server notifies 
   * the client that the training can resume via a subsequent EnoughParticipants message
   * @returns a promise which resolves when enough participants joined the session
   */
  protected async createPromiseForMoreParticipants(): Promise<void> {
    return new Promise<void>((resolve) => {
      // "once" is important because we can't resolve the same promise multiple times
      this.server.once(type.EnoughParticipants, () => {
        debug(`[${shortenId(this.ownId)}] received EnoughParticipants message from server`)
        // Emit the last status emitted before waiting if defined
        if (this.previousStatus !== undefined) this.emit("status", this.previousStatus)
        resolve()
      })
    })
  }

  protected async waitForParticipantsIfNeeded(): Promise<void>{
    // we check if we are waiting for more participants before sending our weight update
    if (this.waitingForMoreParticipants) {
      // wait for the promise to resolve, which takes as long as it takes for new participants to join
      debug(`[${shortenId(this.ownId)}] is awaiting the promise for more participants`)
      this.emit("status", "not enough participants")
      await this.promiseForMoreParticipants 
      // Make sure to set the promise back to undefined once resolved
      this.promiseForMoreParticipants = undefined 
    }
  }
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

    const response = await fetch(url);
    const encoded = new Uint8Array(await response.arrayBuffer())
    return await serialization.model.decode(encoded)
  }

  /**
  * Number of contributors to a collaborative session
  * If decentralized, it should be the number of peers
  * If federated, it should the number of participants excluding the server
  * If local it should be 1
  */
  abstract getNbOfParticipants(): number;

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
  /**
   * Whether the client should wait until more
   * participants join the session, i.e. a promise has been created
   */
  get waitingForMoreParticipants(): boolean {
    return this.promiseForMoreParticipants !== undefined 
  }

}

export function shortenId(id: string): string {
  return id.slice(0, 4)
}
