import { List, Map, Seq, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import * as secret_shares from '../secret_shares'
import * as decentralizedGeneral from './decentralized'
import { DecentralizedGeneral } from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

type PeerID = number

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }
interface ConnectedPeerIDsMessage {peerIDs: Array<number>}
interface ClientReadyMessage { peerId: PeerID, epoch: number}
interface PeerPartialSumMessage { peerId: PeerID, partial: Weights}

// Time to wait between network checks in milliseconds.
const TICK = 100

// minimum clients we want connected in order to start sharing
const minimumReady = 3

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

// function isClientReadyMessage (data: unknown): data is ClientReadyMessage {
//   if (typeof data !== 'object') {
//     return false
//   }
//   if (data === null) {
//     return false
//   }
//
//   if (!Set(Object.keys(data)).equals(Set.of('peerId', 'epoch'))) {
//     return false
//   }
//   const { peerId, epoch } = data as Record<'peerId' | 'epoch', unknown>
//
//   if (
//     typeof epoch !== 'number' ||
//       typeof peerId !== 'number'
//   ) {
//     return false
//   }
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const _: ClientReadyMessage = { peerId, epoch }
//   return true
// }

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

function isPeerPartialSumMessage (data: unknown): data is PeerPartialSumMessage {
  if (typeof data !== 'object') {
    return false
  }
  if (data === null) {
    return false
  }

  if (!Set(Object.keys(data)).equals(Set.of('peerId', 'partial'))) {
    return false
  }
  const { peerId, partial } = data as Record<'peerId' | 'partial', unknown>

  if (typeof partial === 'number' || // this is arbitrary, want to see if praial is not a weights but can't
    typeof peerId !== 'number') {
    return false
  }
  return true
}

export class SecureDecentralized extends DecentralizedGeneral {
  private readonly receivedSharesBuffer = Map<SimplePeer.Instance, List<Weights | undefined>>()
  private readonly partialSumsBuffer: List<Weights> = List() // set of partial sums received by peers
  private mySum: Weights = []
  private readonly ID: number = 0 // randomUUID() // NEED TO MAKE THIS DECLARED BY TASK

  peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void {
    //can receive weights, partialSums from other peers
    //can receive list of peers from server
    const message = msgpack.decode(data)
    // if message is weights sent from peers
    if (decentralizedGeneral.isPeerMessage(message)) {
      const weights = serialization.weights.decode(message.weights)
      if (this.receivedSharesBuffer.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peerID} already received`)
      }
      this.receivedSharesBuffer.set(peer,
        this.receivedSharesBuffer.get(peer, List<Weights>())
          .set(message.epoch, weights))
    }
    //if message is partial sums sent by peer
    else if (isPeerPartialSumMessage(message)) {
      for (const [id, peerInstance] of this.peers) {
        if (message.peerId === id) {
          throw new Error(`sum message from ${peerID} already received`)
        }
      }
      this.partialSumsBuffer.push(message.partial)
    } else if( isConnectedPeerIDsMessage(message)){
      let peerIDList: Array<number> = message.peerIDs
      for (peerID of peerIDList){
        let initiator = false
        if(this.ID<peerID){ //THIS.ID IS NOT WORKING
          initiator = true
        }
        this.connectNewPeer(peerID, initiator)
      }
    }
    else {
      throw new Error(`invalid message received from ${peerID}`)
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

  // send split shares to connected peers
  private async sendShares (updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant): Promise<void> {
    // identify peer connections, make weight shares, add differential privacy
    let connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected) // connected error
    const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightShares: List<Weights> = secret_shares.generateAllShares(noisyWeights, connectedPeers.size, 1000)
    // List()

    // Broadcast our weights to ith peer
    for (let i = 0; i < connectedPeers.size; i++) {
      const weights: Weights = weightShares.get(i) ?? []
      const msg: PeerMessage = {
        epoch: epoch,
        weights: await serialization.weights.encode(weights)
      }
      const encodedMsg = msgpack.encode(msg)
      const peerList: number[] = Array.from(connectedPeers.keys())
      const currentPeer: SimplePeer.Instance | undefined = connectedPeers.get(peerList[i])
      if (currentPeer !== undefined) {
        currentPeer.send(encodedMsg)
      } else {
        throw new Error('Invalid peer request')
      }
    }
    // Get weights from the others
    const getWeights = (): Seq.Indexed<Weights | undefined> =>
      this.receivedSharesBuffer
        .valueSeq()
        .map((epochesWeights) => epochesWeights.get(epoch))

    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const gotAllWeights =
                    getWeights().every((weights) => weights !== undefined)

        if (gotAllWeights) {
          const receivedWeights = getWeights().filter((weights) => weights !== undefined).toSet() as Set<Weights>
          // Average weights
          trainingInformant.addMessage('Averaging weights')
          trainingInformant.updateNbrUpdatesWithOthers(1)
          this.mySum = aggregation.averageWeights(receivedWeights)
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
  }

  private sendPartialSums (): void {
    const connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected)
    // Broadcast our sum to everyone
    for (const peer of connectedPeers.keys()) {
      const msg: PeerPartialSumMessage = {
        peerId: this.ID,
        partial: this.mySum
      }
      const encodedMsg = msgpack.encode(msg)
      const currentPeer: SimplePeer.Instance | undefined = connectedPeers.get(peer)
      if (currentPeer !== undefined) {
        currentPeer.send(encodedMsg)
      } else {
        throw new Error('Invalid peer request')
      }
    }
  }

  // send message that we are ready at end of round, if enough people are ready, calls sendShares
  override async onRoundEndCommunication (updatedWeights: Weights,
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant): Promise<Weights | undefined> {
    // send ready message
    this.sendReadyMessage(epoch, trainingInformant) //don't continue from here until peers is not empty
    await this.sendShares(updatedWeights, staleWeights, epoch, trainingInformant)
    this.sendPartialSums()
    this.partialSumsBuffer.push(this.mySum)
    return secret_shares.sum(this.partialSumsBuffer)
  }
}
