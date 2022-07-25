import { Weights } from '../../types'
import { assertEqualSizes } from '../../testing/assert'
import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import * as crypto from 'crypto'

export function subtractWeights (w1: Weights, w2: Weights): Weights {
  ''
  'Return Weights object that is difference of two weights objects'
  ''
  assertEqualSizes(w1, w2)
  const sub: Weights = []
  for (let i = 0; i < w1.length; i++) {
    sub.push(tf.sub(w1[i], w2[i]))
  }
  return sub
}

export function sum (setSummands: List<Weights>): Weights { // need to test
  ''
  'Return sum of multiple weight objects in an array, returns weight object of sum'
  ''
  if (setSummands.size < 1) {
    return []
  }
  const summedWeights: Weights = new Array<tf.Tensor>()
  let tensors: Weights = new Array<tf.Tensor>() // list of different sized tensors of 0
  // @ts-expect-error
  for (let j = 0; j < setSummands.get(0).length; j++) {
    for (let i = 0; i < setSummands.size; i++) {
      // @ts-expect-error
      tensors.push(setSummands.get(i)[j])
    }
    summedWeights.push(tf.addN(tensors))
    tensors = new Array<tf.Tensor>()
  }
  return summedWeights
}

export function lastShare (currentShares: Weights[], secret: Weights): Weights {
  ''
  'Return Weights in the remaining share once N-1 shares have been constructed, where N are the amount of participants'
  ''
  const currentShares2 = List<Weights>(currentShares)
  const last: Weights = subtractWeights(secret, sum(currentShares2))
  return last
}

export async function generateAllShares (secret: Weights, nParticipants: number, maxRandNumber: number): Promise<List<Weights>> {
  ''
  'Generate N additive shares that aggregate to the secret array'
  ''
  const shares: Weights[] = []
  for (let i = 0; i < nParticipants - 1; i++) {
    const share: Weights = []
    for (const t of secret) {
      share.push(
        tf.randomUniform(
          t.shape, -maxRandNumber, maxRandNumber, undefined, generateRandomNumber(maxRandNumber))
      )
    }
    shares.push(share)
  }
  shares.push(lastShare(shares, secret))
  const shares2 = List<Weights>(shares)
  return shares2
}

export function shuffleArray (a: any[]): any[] { // https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

export function generateRandomNumber (maxRandNumber: number): number {
  const array = new Uint32Array(1)
  // generate empty array
  const intsResult: Uint32Array = crypto.webcrypto.getRandomValues(array)
  // fill array with 1 crypotgraphically strong number
  return Number(intsResult[0])
  // index into array to extract number
}

export function generateRandomShare (secret: Weights, maxRandNumber: number): Weights {
  const share: Weights = []
  for (const t of secret) {
    share.push(
      tf.randomUniform(
        t.shape, -maxRandNumber, maxRandNumber, undefined, generateRandomNumber(maxRandNumber))
    )
  }
  return share
}
