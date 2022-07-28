import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import * as crypto from 'crypto'

import { Weights } from '../..'

/*
Return Weights object that is difference of two weights object
 */
export function subtractWeights (w1: Weights, w2: Weights): Weights {
  if (w1.length !== w2.length) {
    throw new Error('weights not of the same lenght')
  }

  const sub: Weights = []
  for (let i = 0; i < w1.length; i++) {
    sub.push(tf.sub(w1[i], w2[i]))
  } return sub
}

/*
Return sum of multiple weight objects in an array, returns weight object of sum
 */
export function sum (setSummands: List<Weights>): Weights {
  const summedWeights: Weights = new Array<tf.Tensor>()
  let tensors: Weights = new Array<tf.Tensor>() // list of different sized tensors of 0
  const shapeOfWeight: Weights = setSummands.get(0) ?? []
  for (let j = 0; j < shapeOfWeight.length; j++) {
    for (let i = 0; i < setSummands.size; i++) {
      const modelUpdate: Weights = setSummands.get(i) ?? []
      tensors.push(modelUpdate[j])
    }
  }
  summedWeights.push(tf.addN(tensors))
  tensors = new Array<tf.Tensor>()
  return summedWeights
}

/*
Return Weights in the remaining share once N-1 shares have been constructed (where N is number of ready clients)
 */
export function lastShare (currentShares: Weights[], secret: Weights): Weights {
  const currentShares2 = List<Weights>(currentShares)
  const last: Weights = subtractWeights(secret, sum(currentShares2))
  return last
}

/*
Generate N additive shares that aggregate to the secret weights array (where N is number of ready clients)
 */
export function generateAllShares (secret: Weights, nParticipants: number, noiseMagnitude: number): List<Weights> {
  const shares: Weights[] = []
  for (let i = 0; i < nParticipants - 1; i++) {
    shares.push(generateRandomShare(secret, noiseMagnitude))
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
  const seed: number = crypto.randomInt(2**47)
  for (const t of secret) {
    share.push(
      tf.randomUniform(
        t.shape, -maxShareValue, maxShareValue, 'float32', seed)
    )
  }
  return share
}
