import { List, Map, Seq, Set } from 'immutable'
import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import { URL } from 'url'
import * as decentralizedGeneral from './decentralizedGeneral'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

// import { Base } from './base'
import { DecentralizedGeneral } from './decentralizedGeneral'
interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// TODO take it from the server sources
type PeerID = number
type EncodedSignal = Uint8Array
// type ServerOpeningMessage = PeerID[]
type ServerPeerMessage = [PeerID, EncodedSignal]

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class Decentralized extends DecentralizedGeneral {
  private async connectServer (url: URL): Promise<isomorphic.WebSocket> {
    const ws = new isomorphic.WebSocket(url)
    ws.binaryType = 'arraybuffer'

    ws.onmessage = (event: isomorphic.MessageEvent) => {
      if (!(event.data instanceof ArrayBuffer)) {
        throw new Error('server did not send an ArrayBuffer')
      }
      const msg: unknown = msgpack.decode(new Uint8Array(event.data))

      if (decentralizedGeneral.isServerOpeningMessage(msg)) {
        console.debug('server sent us the list of peer to connect to:', msg)
        if (this.peers.size !== 0) {
          throw new Error('server already gave us a list of peers')
        }
        this.peers = Map(List(msg)
          .map((id: PeerID) => [id, this.connectNewPeer(id, true)]))
      } else if (decentralizedGeneral.isServerPeerMessage(msg)) {
        const [peerID, encodedSignal] = msg
        const signal = msgpack.decode(encodedSignal)
        console.debug('server on behalf of', peerID, 'sent', signal)

        let peer = this.peers.get(peerID)
        if (peer === undefined) {
          peer = this.connectNewPeer(peerID, false)
          this.peers = this.peers.set(peerID, peer)
        }

        peer.signal(signal)
      } else {
        throw new Error('send sent an invalid msg')
      }
    }

    return await new Promise((resolve, reject) => {
      ws.onerror = (err: string) => reject(new Error(`connecting server: ${err}`))
      ws.onopen = () => resolve(ws)
    })
  }

  // connect a new peer
  //
  // if initiator is true, we start the connection on our side
  // see SimplePeer.Options.initiator for more info
  private connectNewPeer (peerID: PeerID, initiator: boolean): SimplePeer.Instance {
    console.debug('connect new peer with initiator: ', initiator)

    const peer = new SimplePeer({
      initiator,
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
        throw new Error('server closed but received a signal')
      }

      const msg: ServerPeerMessage = [peerID, msgpack.encode(signal)]
      this.server.send(msgpack.encode(msg))
    })

    peer.on('data', (data) => {
      const message = msgpack.decode(data)
      if (!decentralizedGeneral.isPeerMessage(message)) {
        throw new Error(`invalid message received from ${peerID}`)
      }
      const weights = serialization.weights.decode(message.weights)

      console.debug('peer', peerID, 'sent weights', weights)

      if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peerID} already received`)
      }
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
    serverURL.pathname += `/deai/tasks/${this.task.taskID}`

    this.server = await this.connectServer(serverURL)
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    // Broadcast our weights
    const msg: PeerMessage = {
      epoch: epoch,
      weights: await serialization.weights.encode(noisyWeights)
    }
    const encodedMsg = msgpack.encode(msg)

    this.peers
      .filter((peer) => peer.connected)
      .forEach((peer, peerID) => {
        trainingInformant.addMessage(`Sending weights to peer ${peerID}`)
        trainingInformant.updateWhoReceivedMyModel(`peer ${peerID}`)

        peer.send(encodedMsg)
      })

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
    trainingInformant.updateNbrUpdatesWithOthers(1)

    // Return the new "received" weights
    return aggregation.averageWeights(receivedWeights)
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
