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

const pause = async (statement: () => boolean, maxWeight: number): Promise<void> => {
  return await new Promise<void>((resolve, reject) => {
    const timeWas = new Date().getTime()
    const wait = setInterval(function () {
      if (statement()) {
        console.log('resolved after', new Date().getTime() - timeWas, 'ms')
        clearInterval(wait)
        resolve()
      } else if (new Date().getTime() - timeWas > maxWeight) { // Timeout
        console.log('rejected after', new Date().getTime() - timeWas, 'ms')
        clearInterval(wait)
        reject(new Error('timeout'))
      }
    }, TICK)
  })
}

async function resolvePause (func: () => boolean): Promise<void> {
  try {
    await pause(func, MAX_WAIT_PER_ROUND)
  } catch {
    throw new Error('timeout error')
  }
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

    await resolvePause(() => this.peers.size >= minimumPeers)
    await this.sendShares(updatedWeights, staleWeights, round, trainingInformant)

    await resolvePause(() => this.receivedWeights.size >= minimumPeers)
    await this.sendPartialSums()

    await resolvePause(() => this.receivedPartialSums.size >= minimumPeers)
    const setWeights: Set<Weights> = this.receivedPartialSums.toSet()
    return aggregation.averageWeights(setWeights)
  }
}
