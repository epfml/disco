import { List, Set } from 'immutable'
import msgpack from 'msgpack-lite'
import * as secret_shares from '../secret_shares'
import { DecentralizedGeneral } from './decentralized'
import * as messages from '../messages'

import { aggregation, serialization, TrainingInformant, Weights } from '..'

// Time to wait between network checks in milliseconds.
const TICK = 100

// minimum clients we want connected in order to start sharing
const minimumPeers = 3

// Time to wait for the others in milliseconds.
const MAX_WAIT_PER_ROUND = 10_000

async function pause (statement: boolean): Promise<void> {
  const timeoutError = new Error('timeout')
  await new Promise<void>((resolve, reject) => {
    const interval = setInterval(() => {
      if (statement) {
        clearInterval(interval)
        resolve()
      }
    }, TICK)

    setTimeout(() => {
      clearInterval(interval)
      reject(timeoutError)
    }, MAX_WAIT_PER_ROUND)
  }).catch((err) => { // doesn't throw error correctly
    if (err !== timeoutError) {
      throw err
    // } else {
    //   throw new Error('statement untrue in pause function')
    }
  })
}

export class SecureDecentralized extends DecentralizedGeneral {
  // send split shares to connected peers
  private async sendShares (updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant): Promise<void> {
    // identify peer connections, make weight shares, add differential privacy
    // const noisyWeights: Weights = privacy.addDifferentialPrivacy(updatedWeights, staleWeights, this.task)
    const weightShares: List<Weights> = await secret_shares.generateAllShares(updatedWeights, this.peers.size, 1000)

    // Broadcast our weights to ith peer in the SERVER LIST OF PEERS
    for (let i = 0; i < this.peers.size; i++) {
      const weights = weightShares.get(i)
      if (weights === undefined) {
        throw new Error('weight shares generated incorrectly')
      }
      const msg: messages.clientWeightsMessageServer = {
        type: messages.messageType.clientWeightsMessageServer,
        peerID: this.ID,
        weights: await serialization.weights.encode(weights),
        destination: i // this.peers.get(i) ?? -1
      }
      const encodedMsg = msgpack.encode(msg)
      this.peerMessageTemp(encodedMsg)
    }
  }

  private async sendPartialSums (): Promise<void> {
    let receivedWeightsList: List<Weights> = List()
    for (let i = 0; i < this.receivedWeights.size; i++) {
      if (this.receivedWeights.get(i) === undefined) {
        throw new Error('received weights dictionary is wrong')
      } else {
        // @ts-expect-error
        receivedWeightsList = receivedWeightsList.push(this.receivedWeights.get(i))
      }
    }
    this.mySum = secret_shares.sum(receivedWeightsList)
    for (let i = 0; i < this.peers.size; i++) {
      const msg: messages.clientPartialSumsMessageServer = {
        type: messages.messageType.clientPartialSumsMessageServer,
        peerID: this.ID,
        partials: await serialization.weights.encode(this.mySum),
        destination: i
      }
      const encodedMsg = msgpack.encode(msg)
      this.peerMessageTemp(encodedMsg)
    }
  }

  // send message that we are ready at end of round, if enough people are ready, calls sendShares
  override async onRoundEndCommunication (updatedWeights: Weights,
    staleWeights: Weights,
    round: number,
    trainingInformant: TrainingInformant): Promise<Weights> {
    // send ready message
    this.sendReadyMessage(round)

    // don't continue from here until peers is not empty
    await pause(this.peers.size >= minimumPeers)
    await this.sendShares(updatedWeights, staleWeights, round, trainingInformant)

    // don't send partial sum until we have all weights
    await pause(this.receivedWeights.size >= minimumPeers)
    console.log('received size', this.receivedWeights.size)
    await this.sendPartialSums()

    await pause(this.receivedPartialSums.size >= minimumPeers)
    // this.receivedPartialSums.push(this.mySum)
    console.log('partial sum size,', this.receivedPartialSums.size)
    const setWeights: Set<Weights> = this.receivedPartialSums.toSet()
    return aggregation.averageWeights(setWeights)
  }
}
