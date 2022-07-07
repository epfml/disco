import { Weights } from './types'
import { assertEqualSizes } from './testing/assert'
import { List } from 'immutable'

import * as tf from '@tensorflow/tfjs'
// require('@tensorflow/tfjs-node')

export enum RNG_CRYPTO_SECURITY {
  UNSAFE = 'Cryptographically unsafe random number generation.',
  BASIC = 'Each tf.Tensor is initialized by tf.randomUniform() using a cryptographically random seed.',
  STRICT = 'Each value is generated from a cryptographically secure pseudo-random number generator.'
}

function raiseCryptoNotImplemented (): void {
  throw new Error('No cryptographically secure random number generation implemented yet!')
}

export function addWeights (w1: Weights, w2: Weights): Weights {
  ''
  'Return Weights object that is sum of two weights objects'
  ''
  console.log('w1 length', w1.length)
  console.log('w2 length', w2.length)
  assertEqualSizes(w1, w2)
  const added: Weights = []
  for (let i = 0; i < w1.length; i++) {
    added.push(tf.add(w1[i], w2[i]))
  }
  return added
}

export function subtractWeights (w1: Weights, w2: Weights): Weights {
  ''
  'Return Weights object that is difference of two weights objects'
  ''
  assertEqualSizes(w1, w2)
  const sub: Weights = []
  for (let i = 0; i < w1.length; i++) {
    sub.push(tf.sub(w1[0], w2[0]))
  }
  return sub
}

export function sum (setSummands: List<Weights>): Weights { //need to test
  ''
  'Return sum of multiple weight objects in an array, returns weight object of sum'
  ''
  if (setSummands.size<1){
    return []
  }
  let summedWeights: Weights = new Array<tf.Tensor>()
  let tensors: Weights = new Array<tf.Tensor>() //list of different sized tensors of 0
  for(let j=0; j<setSummands.get(0).length; j++) {
    for(let i=0; i<setSummands.size; i++){
      tensors.push(setSummands.get(i)[j])
    }
    summedWeights.push(tf.addN(tensors))
    tensors = new Array<tf.Tensor>()
  }
  return summedWeights
  //
  // const summands = Array.from(setSummands.values())
  // let summ: Weights = new Array<tf.Tensor>()
  // // let emptyWeights: Weights = new Array<tf.Tensor>() //list of different sized tensors of 0
  // for(let i=0; i<summands[0].length; i++){ //assuming all weights in summands have same length
  //     const shape = summands[0][i].shape
  //     emptyWeights.push(tf.zeros(shape))
  //   }
  // for(let i=0; i<summands[0].length; i++){
  //     summ = addWeights(emptyWeights[j], summands[i][j])
  //   }
  // summands.forEach((element: Weights) => {
  //   summ = addWeights(summ, element)
  // })
  // return summ
}

export function lastShare (currentShares: Weights[], secret: Weights): Weights {
  ''
  'Return Weights in the remaining share once N-1 shares have been constructed, where N are the amount of participants'
  ''
  const currentShares2 = List<Weights>(currentShares)
  const last: Weights = subtractWeights(secret, sum(currentShares2))
  return last
}

export function generateAllShares (secret: Weights, nParticipants: number, maxRandNumber: number): List<Weights> {
  ''
  'Generate N additive shares that aggregate to the secret array'
  ''
  const shares: Weights[] = []
  for (let i = 0; i < nParticipants - 1; i++) {
    shares.push(generateRandomShare(secret, Math.random() * maxRandNumber, RNG_CRYPTO_SECURITY.UNSAFE))
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

export function generateRandomNumber (maxRandNumber: number, cryptoSecure: RNG_CRYPTO_SECURITY): number {
  if (cryptoSecure === RNG_CRYPTO_SECURITY.UNSAFE) {
    // added this math.random times maxRandNumber so adversaries cannot identify range of shares received
    return Math.random() * maxRandNumber+maxRandNumber/2
  } else {
    raiseCryptoNotImplemented()
    return -1
    // const array = new Uint32Array(1);
    // //generate empty array
    // const intsResult: Uint32Array = crypto.getRandomValues(array)
    // //fill array with 1 crypotgraphically strong number
    // return toNumber(intsResult[0])
    // //index into array to extract number
  }
}

export function generateRandomShare (secret: Weights, maxRandNumber: number, cryptoSecure: RNG_CRYPTO_SECURITY): Weights {
  if (cryptoSecure === RNG_CRYPTO_SECURITY.STRICT) {
    throw new Error('NOT IMPLEMENTED: generation of a random share (random Weights) with strict cryptographic security.')
  } else {
    const share: Weights = []
    for (const t of secret) {
      share.push(
        tf.randomUniform(
          t.shape, -maxRandNumber, maxRandNumber, undefined, generateRandomNumber(maxRandNumber, cryptoSecure))
      )
    }
    return share
  }
}
