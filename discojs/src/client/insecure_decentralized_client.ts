import { List, Seq, Set, Map } from 'immutable'
// import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'
import * as decentralizedGeneral from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

type PeerID = number

import { DecentralizedGeneral } from './decentralized'
interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }
interface ConnectedPeerIDsMessage {peerIDs: Array<number>}
interface ClientReadyMessage { peerId: PeerID, epoch: number}

function isClientReadyMessage (data: unknown): data is ClientReadyMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('peerId', 'epoch'))) {
    return false
  }
  const { peerId, epoch } = data as Record<'peerId' | 'epoch', unknown>

  if (
    typeof epoch !== 'number' ||
      typeof peerId !== 'number'
  ) {
    return false
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ClientReadyMessage = { peerId, epoch }
  return true
}

function isConnectedPeerIDsMessage (data: unknown): data is ConnectedPeerIDsMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('peerIDs'))) {
    return false
  }
  const { peerIDs } = data as Record<'peerIDs', unknown>

  if (!(peerIDs instanceof Array)
  ) {
    return false
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _: ConnectedPeerIDsMessage = { peerIDs }
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
export class InsecureDecentralized extends DecentralizedGeneral {
  private readonly receivedWeights = Map<SimplePeer.Instance, List<Weights | undefined>>()
  private ID: number = 0

  peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void {
    const message = msgpack.decode(data)
    if (decentralizedGeneral.isPeerMessage(message)) {
      const weights = serialization.weights.decode(message.weights)
      console.debug('peer', peerID, 'sent weights', weights)

      if (this.receivedWeights.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peerID} already received`)
      }
      this.receivedWeights.set(peer,
          this.receivedWeights.get(peer, List<Weights>())
              .set(message.epoch, weights))
    }
    else if (isConnectedPeerIDsMessage(message)){
            let peerIDList: Array<number> = message.peerIDs
      for (peerID of peerIDList){
        let initiator = false
        if(this.ID<=peerID){ //THIS.ID IS NOT WORKING
          initiator = true
        }
        this.connectNewPeer(peerID, initiator)
      }
    }
  }
  // sends message to server that they are ready to share
  private sendReadyMessage (epoch: number, trainingInformant: TrainingInformant
  ): void {
    // Broadcast our readiness
    const msg: ClientReadyMessage = {
      peerId: this.ID,
      epoch: epoch
    }

    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined){
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg)
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    // send message to server that we ready
    this.sendReadyMessage(epoch, trainingInformant)

    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    // Broadcast our weights
    const msg: PeerMessage = {
      epoch: epoch,
      weights: await serialization.weights.encode(noisyWeights)
    }
    const encodedMsg = msgpack.encode(msg)

    // wait until receive message of peers from server
    console.log('waiting for message of peers')
    this.peers
      .filter((peer) => peer.connected)
      .forEach((peer, peerID) => {
        trainingInformant.addMessage(`Sending weights to peer ${peerID}`)
        trainingInformant.updateWhoReceivedMyModel(`peer ${peerID}`)
        console.log('Sending weights to peer', peerID)
        peer.send(encodedMsg)
      })

    // Get weights from the others
    const getWeights = (): Seq.Indexed<Weights | undefined> =>
      this.receivedWeights
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

    const weights = getWeights()
      .filter((weights) => weights !== undefined)
      .toSet() as Set<Weights>

    // Add my own weights (noisied by DP) to the set of weights to average.
    const finalWeights = weights.add(noisyWeights)

    // Average weights
    trainingInformant.addMessage('Averaging weights')
    trainingInformant.updateNbrUpdatesWithOthers(1)
    // Return the new "received" weights
    return aggregation.averageWeights(finalWeights)
  }

  async onTrainEndCommunication (_: Weights, trainingInformant: TrainingInformant): Promise<void> {
    // TODO: enter seeding mode?
    trainingInformant.addMessage('Training finished.')
  }
}
