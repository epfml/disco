import { List, Range } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import * as crypto from 'crypto'

import { WeightsContainer, aggregation } from '../..'

const maxSeed: number = 2 ** 47
/*
Return Weights in the remaining share once N-1 shares have been constructed (where N is number of ready clients)
 */
function lastShare (currentShares: List<WeightsContainer>, secret: WeightsContainer): WeightsContainer {
  if (currentShares.size === 0) {
    throw new Error('Need at least one current share to be able to subtract secret from')
  }
  return secret.sub(aggregation.sum(currentShares))
}

/*
Generate N additive shares that aggregate to the secret weights array (where N is number of ready clients)
 */
export function generateAllShares (secret: WeightsContainer, nParticipants: number, maxShareValue: number): List<WeightsContainer> {
  if (nParticipants < 1) {
    throw new Error('too few participants to genreate shares')
  }

  const randomShares =
    Range(0, nParticipants - 1)
      .map(() => generateRandomShare(secret, maxShareValue))
      .toList()

  return randomShares
    .push(lastShare(randomShares, secret))
}

/*
generates one share in the same shape as the secret that is populated with values randomly chosend from
a uniform distribution between (-maxShareValue, maxShareValue).
 */
function generateRandomShare (secret: WeightsContainer, maxShareValue: number): WeightsContainer {
  const seed = crypto.randomInt(maxSeed)
  return secret.map((t) => tf.randomUniform(t.shape, -maxShareValue, maxShareValue, 'float32', seed))
}
