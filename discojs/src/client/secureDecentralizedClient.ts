import { List, Map, Seq, Set } from 'immutable'
// import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
import * as secret_shares from '../secret_shares'
// import { v4 as randomUUID } from 'uuid'
import * as decentralizedGeneral from './decentralized'
import { DecentralizedGeneral } from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'

type PeerID = number

interface PeerMessage { epoch: number, weights: serialization.weights.Encoded }

// Time to wait between network checks in milliseconds.
const TICK = 100

// minimum clients we want connected in order to start sharing
const minimumReady = 3

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

interface PeerReadyMessage { peerId: PeerID, epoch: number}
function isPeerReadyMessage (data: unknown): data is PeerReadyMessage {
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
  const _: PeerReadyMessage = { peerId, epoch }
  return true
}

interface PeerPartialSumMessage { peerId: PeerID, partial: Weights}
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
  private readonly receivedReadyBuffer: PeerReadyMessage[] = []
  // private readonly receivedSharesBuffer: Set<Weights> = Set()// same as this.weights  **USE MY own field for this
  private readonly partialSumsBuffer: List<Weights> = List() // set of partial sums received by peers
  private mySum: Weights = []
  private readonly ID: number = 0 // randomUUID() // NEED TO MAKE THIS DECLARED BY TASK

  peerOnData (peer: SimplePeer.Instance, peerID: number, data: any): void {
    const message = msgpack.decode(data)
    // if message is weights sent from peers
    if (decentralizedGeneral.isPeerMessage(message)) {
      const weights = serialization.weights.decode(message.weights)

      console.debug('peer', peerID, 'sent weights', weights)
      //
      if (this.weights.get(peer)?.get(message.epoch) !== undefined) {
        throw new Error(`weights from ${peerID} already received`)
      }
      this.weights.set(peer,
        this.weights.get(peer, List<Weights>())
          .set(message.epoch, weights))
    } else if (isPeerReadyMessage(message)) {
      for (const elem of this.receivedReadyBuffer) {
        if (message.peerId === elem.peerId) {
          throw new Error(`ready message from ${peerID} already received`)
        }
      }
      this.receivedReadyBuffer.push(message)
    } else if (isPeerPartialSumMessage(message)) {
      for (const elem of this.receivedReadyBuffer) {
        if (message.peerId === elem.peerId) {
          throw new Error(`sum message from ${peerID} already received`)
        }
      }
      this.partialSumsBuffer.push(message.partial)
    } else {
      throw new Error(`invalid message received from ${peerID}`)
    }
  }

  // sends message to connected peers that they are ready to share
  private sendReadyMessage (epoch: number, trainingInformant: TrainingInformant
  ): void {
    // Broadcast our readiness
    const msg: PeerReadyMessage = {
      peerId: this.ID,
      epoch: epoch
    }
    const encodedMsg = msgpack.encode(msg)

    this.peers
      .filter((peer) => peer.connected)
      .forEach((peer, peerID) => {
        trainingInformant.addMessage(`Sending readiness to peer ${peerID}`)
        peer.send(encodedMsg)
      })
  }

  // send split shares to connected peers
  private async sendShares (updatedWeights: Weights, // WHY IS THIS ASYNC
    staleWeights: Weights,
    epoch: number,
    trainingInformant: TrainingInformant): Promise<void> {
    // identify peer connections, make weight shares, add differential privacy
    // NEED TO MAKE SURE THAT WE ARE SELF-CONNECTED AS A PEER
    const connectedPeers: Map<PeerID, SimplePeer.Instance> = this.peers.filter((peer) => peer.connected)
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
      this.weights
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
    this.sendReadyMessage(epoch, trainingInformant)

    // check if buffer is full and send/receive shares
    const timeoutError = new Error('timeout')
    await new Promise<void>((resolve, reject) => {
      const interval = setInterval(() => {
        const gotAllReadyMessages = this.receivedReadyBuffer.length >= minimumReady // will want to change to wait x seconds to see if others are ready to connect also
        if (gotAllReadyMessages) {
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

    // MAKE SURE THIS ONLY EXECUTES AFTER ALL PREVIOUS CODE HAS EXECUTED
    await this.sendShares(updatedWeights, staleWeights, epoch, trainingInformant)
    if (this.partialSumsBuffer.size === minimumReady) {
      this.sendPartialSums()
      // return []
      return secret_shares.addWeights(secret_shares.sum(this.partialSumsBuffer), this.mySum)
    }
  }
}
