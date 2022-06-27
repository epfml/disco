import { Weights } from '../types'
// import { generateRandomShare } from '@/secret_shares'

export function assertTrue (condition: boolean): void {
  if (!condition) {
    throw new Error('ASSERTION FAILED')
  }
}

export function assertEqualSizes (w1: Weights, w2: Weights): void {
  if (w1.length !== w2.length) {
    throw new Error('ASSERTION FAILED: w1 and w2 have different lenths!')
  }
  for (let i = 0; i < w1.length; i++) {
    if (w1[i].shape.length !== w2[i].shape.length) {
      throw new Error('ASSERTION FAILED: w1 and w2 have different shapes!')
    }
    // for (const j in w1[i].shape) {
    //   if (w1[i].shape[j] != w2[i].shape[j]) {
    //     throw new Error('ASSERTION2 FAILED: w1 and w2 have different shapes!')
    //   }
    // }
  }
}

export function assertThrowsError (f: any, args: any[]): void {
  let passing: boolean = false
  try {
    f(args)
  } catch (e) {
    passing = true
  }
  if (!passing) {
    throw new Error('FAILING TEST: Error not thrown')
  }
}

// const s1 : number[] = [1,2,5];
// const d2 : number[] = [1,2,5];

// console.log(s1 == d2);
