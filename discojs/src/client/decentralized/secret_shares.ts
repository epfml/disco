import { List, Range } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import * as crypto from 'crypto'

import { Weights, aggregation } from '../..'

const maxSeed: number = 2 ** 47
/*
Return Weights in the remaining share once N-1 shares have been constructed (where N is number of ready clients)
 */
function lastShare (currentShares: List<Weights>, secret: Weights): Weights {
  if (currentShares.size === 0) {
    throw new Error('Need at least one current share to be able to subtract secret from')
  }
  return aggregation.subtractWeights(List([secret, aggregation.sumWeights(currentShares)]))
}

/*
Generate N additive shares that aggregate to the secret weights array (where N is number of ready clients)
 */
export function generateAllShares (secret: Weights, nParticipants: number, maxShareValue: number): List<Weights> {
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
function generateRandomShare (secret: Weights, maxShareValue: number): Weights {
  const share: Weights = []
  const seed: number = crypto.randomInt(maxSeed)
  for (const t of secret) {
    share.push(
      tf.randomUniform(
        t.shape, -maxShareValue, maxShareValue, 'float32', seed)
    )
  }
  return share
}
