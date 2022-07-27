import * as tf from '@tensorflow/tfjs'
import { List } from 'immutable'

import { Weights } from '../..'
import { UnitTester } from '../../testing/unit_tester'
import * as secret_shares from './secret_shares'

function makeWeights (values: any): Weights {
  const w: Weights = []
  for (let i = 0; i < 1; i++) {
    w.push(tf.tensor(values))
  }
  return w
}
/*
NOTE** Need to implement tests with Mocha/Chai, currently manually approving print statements
 */
class TestSecretShares extends UnitTester {
  makeAllSharesTest (): void {
    // const secret1: Weights = makeWeights([[1, 2, 3], [4, 5, 6]])
    // const client1shares: Weights[] = secret_shares.generateAllShares(secret1, 3, 500)
    // console.log(client1shares[0][0].dataSync())
    // console.log(client1shares[1][0].dataSync())
    // console.log(client1shares[2][0].dataSync())
    // console.log(secret_shares.sum(client1shares)[0].dataSync())
    // console.log(secret1[0].dataSync())
  }

  toyExampleTest (): void {
    'shows additive implementation with 3 users'

    const secret1: Weights = makeWeights([[1, 2, 3], [4, 5, 6]]) // secrets
    const secret2: Weights = makeWeights([[2, 3, 7], [10, 4, 5]])
    const secret3: Weights = makeWeights([[3, 1, 5], [15, 3, 19]])

    // // assertTrue(Array.from(shareGenExamples.addWeights(person1, person2)[0].dataSync()).isEquals([3,5,10])) //==[3,5,10])
    // console.log(Array.from(secret_shares.addWeights(person1, person2)[0].dataSync())) //==[3,5,10])
    // console.log(Array.from(secret_shares.subtractWeights(person1, person2)[0].dataSync())) // [-1,-1,-4]
    // console.log(Array.from(secret_shares.sum(Array(person1, person2, person1))[0].dataSync())) // [4,7,13]

    const client1shares: List<Weights> = secret_shares.generateAllShares(secret1, 3)
    const client2shares: List<Weights> = secret_shares.generateAllShares(secret2, 3)
    const client3shares: List<Weights> = secret_shares.generateAllShares(secret3, 3)

    const person1shares: List<Weights> = List([client1shares.get(0, []), client2shares.get(0, []), client3shares.get(0, [])])
    const person2shares: List<Weights> = List([client1shares.get(1, []), client2shares.get(1, []), client3shares.get(1, [])])
    const person3shares: List<Weights> = List([client1shares.get(2, []), client2shares.get(2, []), client3shares.get(2, [])])

    const person1partialSum: Weights = secret_shares.sum(person1shares)
    const person2partialSum: Weights = secret_shares.sum(person2shares)
    const person3partialSum: Weights = secret_shares.sum(person3shares)

    console.log('person1 partial sum', person1partialSum)
    // console.log('person2 shares', secret_shares.sum(List(finalShares[1]))[0].dataSync())
    // console.log('person3 shares', secret_shares.sum(List(finalShares[2]))[0].dataSync())

    console.log('all shares added', secret_shares.sum(List([person1partialSum, person2partialSum, person3partialSum])))
  }

  runTests (): string {
    // this.makeAllSharesTest()
    this.toyExampleTest()
    return 'All tests passed'
  }
}

const tester: TestSecretShares = new TestSecretShares()
tester.test()
