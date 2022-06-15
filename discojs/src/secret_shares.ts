import { Weights } from '@/types'
import {assertTrue, assertEqualSizes} from '../src/testing/assert'


import * as tf from '@tensorflow/tfjs'
require('@tensorflow/tfjs-node')

export enum RNG_CRYPTO_SECURITY {
  UNSAFE = 'Cryptographically unsafe random number generation.',
  BASIC = 'Each tf.Tensor is initialized by tf.randomUniform() using a cryptographically random seed.',
  STRICT = 'Each value is generated from a cryptographically secure pseudo-random number generator.'
}

function raiseCryptoNotImplemented (): void {
  throw new Error('No cryptographically secure random number generation implemented yet!')
}
export function addWeights(ar1: Weights, ar2: Weights): Weights{
    ""
    "Return Weights object that is sum of two weights objects"
    ""
    assertEqualSizes(ar1, ar2)
    let added: Weights = []
    for(let i=0; i <ar1.length; i++){
        added.push(tf.add(ar1[i],ar2[i]))
    }
    return added
}

export function subtractWeights(ar1: Weights, ar2: Weights): Weights{
    ""
    "Return Weights object that is difference of two weights objects"
    ""
    assertEqualSizes(ar1, ar2)
    let sub: Weights = []
    for(let i=0; i<ar1.length; i++){
        // console.log('secret', ar1[i].dataSync())
        // console.log('shares', ar2[i].dataSync())
        // console.log('diff', tf.sub(ar1[0],ar2[0]).dataSync())
        sub.push(tf.sub(ar1[0],ar2[0]));
    }
    return sub
}

export function sum(array: Array<Weights>): Weights {
    ''
    'Return sum of multiple weight objects in an array, returns weight object of sum'
    ''
    let length: number = array[0].length;
    const shape = array[0][0].shape;
    let summ: Weights= new Array<tf.Tensor>();
    summ.push(tf.zeros(shape));
    array.forEach((element: Weights) => {
        summ=addWeights(summ, element);
        });
    return summ
}

export function lastShare(currentShares: Array<Weights>, secret: Weights): Weights{
        ""
    "Return Weights in the remaining share once N-1 shares have been constructed, where N are the amount of participants"
    ""
    const last: Weights = subtractWeights(secret, sum(currentShares));
    return last
}

export function makeAllShares(secret: Weights, N: number, fieldSize: number):Array<Weights>{
    ''
    'Generate N additive shares that aggregate to the secret array'
    ''
    let shares: Array<Weights>= [];
    for(let i=0; i<N-1; i++) {
        shares.push(generateRandomShare(secret, fieldSize, RNG_CRYPTO_SECURITY.UNSAFE));
    }
    shares.push(lastShare(shares, secret))
    return shares
}

 export function shuffleArray(a: Array<any>): Array<any>{ //https://stackoverflow.com/questions/6274339/how-can-i-shuffle-an-array
    let j, x, i;
    for (i = a.length - 1; i > 0; i--) {
        j = Math.floor(Math.random() * (i + 1));
        x = a[i];
        a[i] = a[j];
        a[j] = x;
    }
             return a
         }
         // console.log(shuffle_array([secret1, secret2, secret3])[0][0].dataSync()) //randomly generates order


export function reconstructSecretSimple(shares: Array<Weights>): Weights {
    ''
    'Regenerate secret from additive shares'
    ''
    return sum(shares)
}

export function generateRandomSeed (crypto_secure: RNG_CRYPTO_SECURITY): number {
  if (crypto_secure == RNG_CRYPTO_SECURITY.UNSAFE) {
    return Math.random() * 2 ** 30
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

export function generateRandomShare (secret: Weights, max_abs: number, crypto_secure: RNG_CRYPTO_SECURITY): Weights {
  if (crypto_secure == RNG_CRYPTO_SECURITY.STRICT) {
    throw new Error('NOT IMPLEMENTED: generation of a random share (random Weights) with strict cryptographic security.')
  } else {
    const share: Weights = []
    // let shape : Array<number> = [];
    for (const t of secret) {
      // shape = t.shape;
      // console.log(t.dataSync())
      share.push(
        tf.randomUniform(
          t.shape, -max_abs, max_abs, undefined, generateRandomSeed(crypto_secure))
      )
    }
    return share
  }
}