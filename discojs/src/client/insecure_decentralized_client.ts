import { List, Seq, Set, Map } from 'immutable'
// import isomorphic from 'isomorphic-ws'
import msgpack from 'msgpack-lite'
import SimplePeer from 'simple-peer'
// import { URL } from 'url'
import * as decentralizedGeneral from './decentralized'

import { aggregation, privacy, serialization, TrainingInformant, Weights } from '..'
import { DecentralizedGeneral } from './decentralized'

type PeerID = number
type EncodedSignal = Uint8Array

type clientReadyMessage = [PeerID: PeerID, round:number] //client is ready
type clientWeightsMessageServer = [PeerID: number, weights: serialization.weights.Encoded] //client weights
type clientPartialSumsMessageServer = [PeerID, EncodedSignal] //client partial sum
type serverConnectedClients = List<PeerID> //server send to client who to connect to

// Time to wait between network checks in milliseconds.
const TICK = 100

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

const minimumPeers = 3

/**
 * Class that deals with communication with the PeerJS server.
 * Collects the list of receivers currently connected to the PeerJS server.
 */
export class InsecureDecentralized extends DecentralizedGeneral {

  private sendReadyMessage (round: number, trainingInformant: TrainingInformant
  ): void {
    // Broadcast our readiness
    const msg: clientReadyMessage = [this.ID, round]

    const encodedMsg = msgpack.encode(msg)
    if (this.server === undefined){
      throw new Error('server undefined, could not connect peers')
    }
    this.server.send(encodedMsg) //why sending an encoded message?
  }

  async onRoundEndCommunication (
    updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant
  ): Promise<Weights> {
    // send message to server that we ready
    this.sendReadyMessage(round, trainingInformant)

    const noisyWeights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)

    // Broadcast our weights
    const msg: clientWeightsMessageServer = [round, await serialization.weights.encode(noisyWeights)]
    const encodedMsg = msgpack.encode(msg)

    if(this.peers.size>=minimumPeers){
      if(this.server ===undefined){
        throw new Error ('server undefined so we cannot send weights through it')
      }
      this.peerMessageTemp(encodedMsg)
    }
    // for (const [peerID_, peer_] of this.peers) {
    //   console.log('Is peer', peerID_, 'connected? ', peer_.connected)
    //   if (!peer_.connected) {
    //     const connectedPeers = this.peers.filter((peer) => peer.connected)
    //   }
    // }

    // if (this.peers.size === 0) {
    //   await new Promise<void>(resolve => setTimeout(resolve, 5 * 1000))
    //   for (const [peerID_, peer_] of this.peers) {
    //     console.log('Is peer', peerID_, 'connected? ', peer_.connected)
    //   }
    // }

    // wait until receive message of peers from server
    // console.log('waiting for message of peers')
    // this.peers
    //   .filter((peer) => peer.connected)
    //   .forEach((peer, peerID) => {
    //     trainingInformant.addMessage(`Sending weights to peer ${peerID}`)
    //     trainingInformant.updateWhoReceivedMyModel(`peer ${peerID}`)
    //     console.log('Sending weights to peer', peerID)
    //     peer.send(encodedMsg)
    //   })

    // Get weights from the others
    const getWeights = (): Seq.Indexed<Weights | undefined> =>
      this.receivedWeights
        .valueSeq()
        .map((roundWeights) => roundWeights.get(round))

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
