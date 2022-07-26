import { Weights } from '../../types'
import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'
import { randomBytes } from 'crypto'

// returns weights that is difference of the two given weights
function subtractWeights (w1: Weights, w2: Weights): Weights {
  if (w1.length !== w2.length) {
    throw new Error('weights are not of the same size')
  }

  const sub: Weights = []
  for (let i = 0; i < w1.length; i++) {
    sub.push(tf.sub(w1[i], w2[i]))
  }

  return sub
}

// returns sum of given weights
// TODO need to test
export function sum (setSummands: List<Weights>): Weights {
  const firstWeights = setSummands.first()
  if (firstWeights === undefined) {
    return []
  }

  return setSummands.shift()
    .reduce(
      (acc, ws) => acc.zip(List(ws)).map(([a, w]) => a.push(w)),
      List(firstWeights).map((w) => List.of(w))
    ).map((ws) => tf.addN(ws.toArray()))
    .toArray()
}

// returns Weights in the remaining share once N-1 shares have been constructed, where N are the amount of participants
export function lastShare (currentShares: Weights[], secret: Weights): Weights {
  const currentShares2 = List<Weights>(currentShares)
  const last: Weights = subtractWeights(secret, sum(currentShares2))
  return last
}

// Generates N additive shares that aggregate to the secret array
export function generateAllShares (secret: Weights, nParticipants: number, maxRandNumber: number): List<Weights> {
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

// TODO not crypto secure
export function shuffleArray<T> (a: T[]): T[] {
  let j, x, i
  for (i = a.length - 1; i > 0; i--) {
    j = Math.floor(Math.random() * (i + 1))
    x = a[i]
    a[i] = a[j]
    a[j] = x
  }
  return a
}

function generateRandomNumber (maxRandNumber: number): number {
  // TODO mv to async
  const buffer = randomBytes(1)
  return buffer.readInt8()
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
