import * as secret_shares from './secret_shares'
import { List } from 'immutable'

import { tf, Weights } from '../..'

// TODO currently manually approving print statements
describe('secret shares', () => {
  it('shows additive implementation with 3 users', () => {
    const secrets = [
      [tf.tensor([[1, 2, 3], [4, 5, 6]])],
      [tf.tensor([[2, 3, 7], [10, 4, 5]])],
      [tf.tensor([[3, 1, 5], [15, 3, 19]])]
    ]

    const client1shares = Array.from(secret_shares.generateAllShares(secrets[0], 3, 500).values())
    const client2shares = Array.from(secret_shares.generateAllShares(secrets[1], 3, 500).values())
    const client3shares = Array.from(secret_shares.generateAllShares(secrets[2], 3, 500).values())

    const finalShares: Weights[][] = [[], [], []] // distributing shares
    for (let i = 0; i < 3; i++) {
      finalShares[i].push(client1shares[i], client2shares[i], client3shares[i])
    }

    console.log('person1 shares', secret_shares.sum(List(finalShares[0]))[0].dataSync())
    console.log('person2 shares', secret_shares.sum(List(finalShares[1]))[0].dataSync())
    console.log('person3 shares', secret_shares.sum(List(finalShares[2]))[0].dataSync())

    const person1sharesFinal: Weights = secret_shares.sum(List(finalShares[0]))
    const person2sharesFinal: Weights = secret_shares.sum(List(finalShares[1]))
    const person3sharesFinal: Weights = secret_shares.sum(List(finalShares[2]))

    const allShares = List.of(
      person1sharesFinal,
      person2sharesFinal,
      person3sharesFinal
    )
    console.log('all shares added', secret_shares.sum(allShares)[0].dataSync())
  })
})
