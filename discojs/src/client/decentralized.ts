import { List, Map, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'

import { serialization, TrainingInformant, Weights } from '..'

import { Base } from './base'
import { URL } from 'url'

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }
interface PeerReadyMessage {peerID: number, epoch: number}

// TODO take it from the server sources
type PeerID = number
type EncodedSignal = Uint8Array
type ServerOpeningMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]

export function isPeerMessage (data: unknown): data is PeerMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('epoch', 'weights'))) {
    return false
  }
  const { epoch, weights } = data as Record<'epoch' | 'weights', unknown>

  if (
    typeof epoch !== 'number' ||
    !serialization.weights.isEncoded(weights)
  ) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: PeerMessage = { epoch, weights }

  return true
}

export function isServerOpeningMessage (msg: unknown): msg is ServerOpeningMessage {
  if (!(msg instanceof Array)) {
    return false
  }

  if (!msg.every((elem) => typeof elem === 'number')) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerOpeningMessage = msg

  return true
}

export function isPeerReadyMessage (msg: unknown): msg is PeerReadyMessage {
  if (!(msg instanceof Array)) {
    return false
  }

  if (!msg.every((elem) => typeof elem === 'number')) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerOpeningMessage = msg

  return true
}

export function isServerPeerMessage (msg: unknown): msg is ServerPeerMessage {
  if (!(msg instanceof Array)) {
    return false
  }
  if (msg.length !== 2) {
    return false
  }

  const [id, signal] = msg
  if (typeof id !== 'number') {
    return false
  }
  if (!(signal instanceof Uint8Array)) {
    return false
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ServerPeerMessage = [id, signal]

  return true
}

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export abstract class DecentralizedGeneral extends Base {
  protected server?: isomorphic.WebSocket
  protected peers = Map<PeerID, SimplePeer.Instance>()

  protected async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      if (isServerOpeningMessage(msg)) { // sent by server to client, can replace with message containing peerIds of next round communication
        // new message contains [a,b], then client a sends to server peerMessage to connect to b
        // peer.signal(signal)
        console.debug('server sent us the list of peer to connect to:', msg)
        if (this.peers.size !== 0) {
          throw new Error('server already gave us a list of peers')
        }
        this.peers = Map(await Promise.all(msg.map(
          async (id: PeerID) => [id, await this.connectNewPeer(id, true)] as [PeerID, SimplePeer.Instance]
        )))
      } else if (isServerPeerMessage(msg)) { // how to connect two peers in simplePeers
        const [peerID, encodedSignal] = msg // peerID is initiatro, has sent the signal to server --> client
        const signal = msgpack.decode(encodedSignal)
        console.debug('server on behalf of', peerID, 'sent', signal)

        let peer = this.peers.get(peerID)
        if (peer === undefined) {
          peer = await this.connectNewPeer(peerID, false)
          this.peers = this.peers.set(peerID, peer)
        }

        peer.signal(signal) // signal from client, initializing peer relation
      }
       else {
        throw new Error('send sent an invalid msg')
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`))
      ws.onopen = () => resolve(ws)
    })
  }

  async connectNewPeer (peerID: PeerID, initiator: boolean): Promise<SimplePeer.Instance> {
    console.debug('connect new peer with initiator: ', initiator)

    // only available on node
    const wrtc = await import('wrtc')
      .then((m) => m.default)
      .catch(() => undefined)

    const peer = new SimplePeer({
      initiator,
      wrtc,
      config: {
        iceServers: List(SimplePeer.config.iceServers)
          /* .push({
            urls: 'turn:34.77.172.69:3478',
            credential: 'deai',
            username: 'deai'
          }) */
          .toArray()
      }
    })

    peer.on('signal', (signal: unknown) => {
      console.debug('local', peerID, 'is signaling', signal)

      if (this.server === undefined) {
        console.warn('server closed but received a signal')
        return
      }

      const msg: ServerPeerMessage = [peerID, msgpack.encode(signal)]
      this.server.send(msgpack.encode(msg))
    })

    peer.on('data', (data) => { this.peerOnData(peer, peerID, data) })

    peer.on('connect', () => {
      console.info('\n\n-------------------\nconnected to peer', peerID, '\n')
      console.log('Is peer', peerID, 'connected? ', peer.connected, '\n')
    })

    // TODO better error handling
    peer.on('error', (err) => { throw err })

    return peer
  }

  /**
   * Initialize the connection to the peers and to the other nodes.
   */
  async connect (): Promise<void> {
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
  }

  /**
   * Disconnection process when user quits the task.
   */
  async disconnect (): Promise<void> {
    console.log('I am a client and I am disconnecting.')
    this.peers.forEach((peer) => peer.destroy())
    this.peers = Map()

    this.server?.close()
    this.server = undefined
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }

  abstract peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void

  abstract onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights|undefined >

  public getPeerIDs (): List<PeerID> {
    return this.peers.keySeq().toList()
  }
}
