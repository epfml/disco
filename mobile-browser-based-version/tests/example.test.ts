/**
 * How to write unit tests for this project!
 *
 * We use mocha for the unit test environment (describe function), chai for assertions (expect),
 * and supertest for http tests with the server router.
 *
 * To setup the testing environment we followed the following guide:
 * https://dev.to/matteobruni/mocha-chai-with-typescript-37f
 *
 *
 */

import { expect } from 'chai'

/**
  * 1. Testing functions
  *
  * If you are writing functions, then you would import them here and then test them.
  * In this example assume that the isPositive is located in src/math/functions.ts
  *
  * We would then create a file tests/math/functions.test.ts to test all relevant functions.
  * We would then import the functions e.g. import {isPositive} from '../../src/math/functions'.
  * Here we don't import anything since we are defining our function here as it is just an example.
  */

const positiveEvenNumber = 114

function isPositive (x: number) {
  return x > 0
}

function isOdd (x: number) {
  return x % 2 !== 0
}

/**
  * describe is a container for many tests, so for example, since we are testing functions
  * we indicate this.
  */
describe('Example test: testing functions', () => { // the tests container
  /**
    * We can test single functions using it, also indicating what we are testing: give a
    * brief indication here of what we are testing.
    */
  it('checking if positive number isPositive', () => { // single test
    expect(isPositive(positiveEvenNumber)).to.be.true
  })

  it('checking if even number is not Odd', () => { // single test
    expect(isOdd(positiveEvenNumber)).to.be.false
  })
})

/**
  * 2. Testing http requests
  *
  * To test http requests we use supertest, see files inside /tests/router/ for an example, note that
  * it uses the same ideas that we have just seen!
  */
