import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import * as crypto from 'crypto'

import { Weights, aggregation } from '../..'

const maxSeed: number = 2 ** 47
/*
Return Weights in the remaining share once N-1 shares have been constructed (where N is number of ready clients)
 */
export function lastShare (currentShares: Weights[], secret: Weights): Weights {
  if (currentShares.length === 0) {
    throw new Error('Need at least one current share to be able to subtract secret from')
  }
  const currentShares2 = List<Weights>(currentShares)
  const last: Weights = aggregation.subtractWeights(List([secret, aggregation.sumWeights(currentShares2)]))
  return last
}

/*
Generate N additive shares that aggregate to the secret weights array (where N is number of ready clients)
 */
export function generateAllShares (secret: Weights, nParticipants: number, maxShareValue: number): List<Weights> {
  const shares: Weights[] = []
  for (let i = 0; i < nParticipants - 1; i++) {
    shares.push(generateRandomShare(secret, maxShareValue))
  }
  shares.push(lastShare(shares, secret))
  const sharesFinal = List<Weights>(shares)
  return sharesFinal
}

/*
generates one share in the same shape as the secret that is populated with values randomly chosend from
a uniform distribution between (-maxShareValue, maxShareValue).
 */
export function generateRandomShare (secret: Weights, maxShareValue: number): Weights {
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
