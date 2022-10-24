import { List, Map, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import * as nodeUrl from 'url'

import { TrainingInformant, WeightsContainer, privacy, aggregation, Task } from '../..'
import { Base as ClientBase } from '../base'
import { PeerID } from './types'
import { pauseUntil } from './utils'
import { Peer } from './peer'
import { PeerPool } from './peer_pool'
import * as messages from './messages'

/**
 * Abstract class for decentralized clients, executes onRoundEndCommunication as well as connecting
 * to the signaling server
 */
export abstract class Base extends ClientBase {
  private readonly minimumReadyPeers: number

  private server?: isomorphic.WebSocket

  // list of peerIDs who the client will send messages to
  private peers?: Set<PeerID>

  // ID of the client, got from the server
  private ID?: PeerID

  private pool?: Promise<PeerPool>

  constructor (
    public readonly url: URL,
    public readonly task: Task
  ) {
    super(url, task)
    this.minimumReadyPeers = this.task.trainingInformation?.minimumReadyPeers ?? 3
  }

  // send message to server that client is ready
  private async waitForPeers (round: number): Promise<Map<PeerID, Peer>> {
    console.debug(this.ID, 'is ready for round', round)

    // clean old round
    this.peers = undefined

    // Broadcast our readiness
    const msg: messages.PeerIsReady = { type: messages.type.PeerIsReady }

    if (this.server === undefined) {
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(msgpack.encode(msg))

    // wait for peers to be connected before sending any update information
    await pauseUntil(() => (this.peers?.size ?? 0) + 1 >= this.minimumReadyPeers)

    if (this.pool === undefined) {
      throw new Error('waiting for peers but peer pool is undefined')
    }
    const ret = await (await this.pool).getPeers(
      Set(this.peers ?? []),
      (id, peer) => this.onNewPeer(id, peer)
    )

    console.debug(this.ID, `got peers for round ${round}:`, ret.keySeq().toJS())
    return ret
  }

  private onNewPeer (id: PeerID, peer: Peer): void {
    peer.on('signal', (signal) => {
      console.debug(this.ID, 'generates signal for', id)
      const msg: messages.SignalForPeer = {
        type: messages.type.SignalForPeer,
        peer: id,
        signal
      }
      this.server.send(msgpack.encode(msg))
    })

    peer.on('data', (data) => {
      const msg = msgpack.decode(data)
      if (!messages.isPeerMessage(msg)) {
        console.warn(this.ID, 'received invalid message from', id, msg)
        return
      }

      console.debug(this.ID, 'got message from', id, msg)

      this.clientHandle(msg)
    })
  }

  // TODO inline? have a serialization mod
  protected sendMessagetoPeer (peer: Peer, msg: messages.PeerMessage): void {
    console.debug(this.ID, 'sends message to peer', msg.peer, msg)
    peer.send(msgpack.encode(msg))
  }

  /*
  creation of the websocket for the server, connection of client to that webSocket,
  deals with message reception from decentralized client perspective (messages received by client)
   */
  private async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const WS = typeof window !== 'undefined' ? window.WebSocket : isomorphic.WebSocket
    const ws: WebSocket = new WS(url)
    ws.binaryType = 'arraybuffer'

    // no async to avoid potentially running server handler concurrently
    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }

      const msg = msgpack.decode(new Uint8Array(event.data))
      if (!messages.isMessageFromServer(msg)) {
        throw new Error(`invalid message received: ${JSON.stringify(msg)}`)
      }

      switch (msg.type) {
        case messages.type.PeerID:
          console.debug(msg.id, 'got own id from server')

          if (this.ID !== undefined) {
            throw new Error('got ID from server but was already received')
          }
          this.ID = msg.id
          this.pool = PeerPool.init(msg.id)

          break
        case messages.type.SignalForPeer:
          console.debug(this.ID, 'got signal from', msg.peer)

          if (this.pool === undefined) {
            throw new Error('got signal but peer pool is undefined')
          }
          void this.pool.then((pool) => pool.signal(msg.peer, msg.signal))

          break
        case messages.type.PeersForRound: {
          const peers = Set(msg.peers)
          if (this.ID !== undefined && peers.has(this.ID)) {
            throw new Error('received peer list contains our own id')
          }

          if (this.peers !== undefined) {
            throw new Error('got new peer list from server but was already received for this round')
          }
          this.peers = peers

          console.debug(this.ID, 'got peers for round:', peers.toJS())
          break
        }
        case messages.type.clientConnected:
          this.connected = true
          break
        default:
          // @ts-expect-error all types should be handled
          throw new Error(`unknown message type: ${msg.type as number}`)
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`)) // eslint-disable-line @typescript-eslint/restrict-template-expressions
      ws.onopen = () => resolve(ws)
    })
  }

  /**
   * Initialize the connection to the peers and to the other nodes.
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
    serverURL.pathname += `deai/${this.task.taskID}`
    this.server = await this.connectServer(serverURL)

    await pauseUntil(() => this.connected)

    console.debug(this.ID, 'server connected')
  }

  // disconnect from server & peers
  async disconnect (): Promise<void> {
    console.debug(this.ID, 'disconnect');

    (await this.pool)?.shutdown()
    this.pool = undefined

    this.server?.close()
    this.server = undefined
    this.connected = false
  }

  async onTrainEndCommunication (_: WeightsContainer, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }

  async onRoundEndCommunication (
    updatedWeights: WeightsContainer,
    staleWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<WeightsContainer> {
    try {
      // reset peer list at each round of training to make sure client waits for updated peerList from server
      const peers = await this.waitForPeers(round)

      // centralized phase of communication --> client tells server that they have finished a local round and are ready to aggregate

      // Apply clipping and DP to updates that will be sent
      const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)

      // send weights to all ready connected peers
      const finalWeights = await this.sendAndReceiveWeights(peers, noisyWeights, round, trainingInformant)

      console.debug(this.ID, 'sent and received', finalWeights.size, 'weights at round', round)
      return aggregation.avg(finalWeights)
    } catch (e) {
      let msg = `errored on round ${round}`
      if (e instanceof Error) { msg += `: ${e.message}` }
      console.warn(this.ID, msg)

      return updatedWeights
    }
  }

  abstract sendAndReceiveWeights (
    peers: Map<PeerID, Peer>,
    noisyWeights: WeightsContainer,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<List<WeightsContainer>>

  abstract clientHandle (msg: messages.PeerMessage): void
}
