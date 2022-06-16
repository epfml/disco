import { assertTrue, assertEqualSizes } from './testing/assert'
import { UnitTester } from './testing/unit_tester'
import * as secret_shares from './secret_shares'
import { Weights } from './types'

import * as tf from '@tensorflow/tfjs'
import {lastShare, RNG_CRYPTO_SECURITY} from "./secret_shares";
require('@tensorflow/tfjs-node');

function makeWeights(values: any) : Weights {
            let w : Weights = [];
            for (let i = 0; i< 1; i++){
                w.push(tf.tensor(values));
            }
            return w
        }
/*
NOTE** Need to implement tests with Mocha/Chai, currently manually approving print statements
 */
class TestSecretShares extends UnitTester {

    makeAllSharesTest(){
        let secret1: Weights = makeWeights([[1,2,3], [4,5,6]])
        let client1shares: Array<Weights> = secret_shares.generateAllShares(secret1, 3, 500)
        // console.log(client1shares[0][0].dataSync())
        // console.log(client1shares[1][0].dataSync())
        // console.log(client1shares[2][0].dataSync())
        // console.log(secret_shares.sum(client1shares)[0].dataSync())
        // console.log(secret1[0].dataSync())
    }

     toyExampleTest(): void {
         'shows additive implementation with 3 users'

        let secret1: Weights = makeWeights([[1,2,3], [4,5,6]]) //secrets
        let secret2: Weights = makeWeights([[2,3,7], [10,4,5]])
         let secret3: Weights = makeWeights([[3,1,5], [15,3,19]])

    // // assertTrue(Array.from(shareGenExamples.addWeights(person1, person2)[0].dataSync()).isEquals([3,5,10])) //==[3,5,10])
    // console.log(Array.from(secret_shares.addWeights(person1, person2)[0].dataSync())) //==[3,5,10])
    // console.log(Array.from(secret_shares.subtractWeights(person1, person2)[0].dataSync())) // [-1,-1,-4]
    // console.log(Array.from(secret_shares.sum(Array(person1, person2, person1))[0].dataSync())) // [4,7,13]


         let client1shares: Array<Weights> = secret_shares.shuffleArray(secret_shares.generateAllShares(secret1, 3, 500))
         let client2shares: Array<Weights> = secret_shares.shuffleArray(secret_shares.generateAllShares(secret2, 3, 500))
         let client3shares: Array<Weights> = secret_shares.shuffleArray(secret_shares.generateAllShares(secret3, 3, 500))

         let final_shares: Array<Array<Weights>> = [[],[],[]] //distributing shares
         for (let i=0; i<3; i++){
             final_shares[i].push(client1shares[i], client2shares[i], client3shares[i])
         }
    //
    console.log('person1 shares', secret_shares.sum(final_shares[0])[0].dataSync())
         console.log('person2 shares', secret_shares.sum(final_shares[1])[0].dataSync())
         console.log('person3 shares', secret_shares.sum(final_shares[2])[0].dataSync())

         let person1sharesFinal: Weights = secret_shares.sum(final_shares[0])
         let person2sharesFinal: Weights =secret_shares.sum(final_shares[1])
         let person3sharesFinal: Weights =secret_shares.sum(final_shares[2])
         console.log('all shares added', secret_shares.sum([person1sharesFinal,person2sharesFinal,person3sharesFinal])[0].dataSync())
        }



    runTests() : string {
        // this.makeAllSharesTest()
        this.toyExampleTest();
        return "All tests passed";
    }
}

let tester : TestSecretShares = new TestSecretShares();
tester.test();