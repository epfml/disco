import { List, Map, Seq, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import { URL } from 'url'

import { aggregation, privacy, serialization, informant, Weights } from '..'

import { Base } from './base'

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// TODO take it from the server sources
type PeerID = number
type EncodedSignal = Uint8Array
type ServerOpeningMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]

function isPeerMessage (data: unknown): data is PeerMessage {
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

function isServerOpeningMessage (msg: unknown): msg is ServerOpeningMessage {
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

function isServerPeerMessage (msg: unknown): msg is ServerPeerMessage {
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

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class Decentralized extends Base {
  private server?: isomorphic.WebSocket
  private peers = Map<PeerID, SimplePeer.Instance>()

  private weights = Map<SimplePeer.Instance, List<Weights | undefined>>()

  private async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    // only available on node
    const wrtc = await import('wrtc')
      .then((m) => m.default)
      .catch(() => undefined)

    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = async (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      if (isServerOpeningMessage(msg)) {
        console.debug('server sent us the list of peer to connect to:', msg)
        if (this.peers.size !== 0) {
          throw new Error('server already gave us a list of peers')
        }
        this.peers = Map(msg.map((id: PeerID) =>
          [id, this.connectNewPeer(wrtc, id, true)] as [PeerID, SimplePeer.Instance]
        ))
      } else if (isServerPeerMessage(msg)) {
        const [peerID, encodedSignal] = msg
        const signal = msgpack.decode(encodedSignal)
        console.debug('server sent signal on behalf of', peerID)

        let peer = this.peers.get(peerID)
        if (peer === undefined) {
          peer = this.connectNewPeer(wrtc, peerID, false)
          console.debug('new peer', peerID, 'connected')
          this.peers = this.peers.set(peerID, peer)
        }

        peer.signal(signal)
      } else {
        throw new Error('send sent an invalid msg')
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: isomorphic.ErrorEvent) =>
        reject(new Error(`connecting server: ${err.message}`))
      ws.onopen = () => resolve(ws)
    })
  }

  // connect a new peer
  //
  // if initiator is true, we start the connection on our side
  // see SimplePeer.Options.initiator for more info
  //
  // wrtc is used only by node
  private connectNewPeer (
    wrtc: Record<'RTCPeerConnection' | 'RTCSessionDescription' | 'RTCIceCandidate', unknown> | undefined,
    peerID: PeerID,
    initiator: boolean
  ): SimplePeer.Instance {
    console.debug('connect new peer', peerID, `with initiator=${initiator.toString()}`)

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
      console.debug('local', peerID, 'is signaling')

      if (this.server === undefined) {
        console.warn('server closed but received a signal')
        return
      }

      const msg: ServerPeerMessage = [peerID, msgpack.encode(signal)]
      this.server.send(msgpack.encode(msg))
    })

    peer.on('data', (data) => {
      const message = msgpack.decode(data)
      if (!isPeerMessage(message)) {
        throw new Error(`invalid message received from ${peerID}`)
      }
      const weights = serialization.weights.decode(message.weights)

      console.debug('peer', peerID, 'sent weights')

      if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peerID} already received`)
      }
      this.weights =
        this.weights.set(peer,
          this.weights.get(peer, List<Weights>())
            .set(message.epoch, weights))
    })

    peer.on('connect', () => console.info('connected to peer', peerID))

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
    this.peers.forEach((peer) => peer.destroy())
    this.peers = Map()

    this.server?.close()
    this.server = undefined
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: informant.DecentralizedInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    // Broadcast our weights
    const msg: PeerMessage = {
      epoch: epoch,
      weights: await serialization.weights.encode(noisyWeights)
    }
    const encodedMsg = msgpack.encode(msg)

    const activePeers = this.peers.filter((peer) => peer.connected)

    activePeers.forEach((peer, peerID) => {
      trainingInformant.addMessage(`Sending weights to peer ${peerID}`)
      peer.send(encodedMsg)
    })

    trainingInformant.update({ currentNumberOfParticipants: activePeers.size })

    // Get weights from the others
    const getWeights = (): Seq.Indexed<Weights | undefined> =>
      this.weights
        .valueSeq()
        .map((epochesWeights) => epochesWeights.get(epoch))

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const gotAllWeights =
          getWeights().every((weights) => weights !== undefined)

        if (gotAllWeights) {
          clearInterval(interval)
          resolve()
        }
      }, TICK)

      setTimeout(() => {
        clearInterval(interval)
        reject(timeoutError)
      }, MAX_WAIT_PER_ROUND)
    }).catch((err) => {
      if (err !== timeoutError) {
        throw err
      }
    })

    const receivedWeights = getWeights()
      .filter((weights) => weights !== undefined)
      .toSet() as Set<Weights>

    // Average weights
    trainingInformant.addMessage('Averaging weights')

    // Return the new "received" weights
    return aggregation.averageWeights(receivedWeights)
  }

  async onTrainEndCommunication (): Promise<void> {
    // TODO: enter seeding mode?
  }
}
