/* eslint-disable no-unused-expressions */
import { expect } from 'chai'
import app from '../src/run_server'
import { agent as request } from 'supertest'
// import { request } from 'supertest'

/** Source for test setup:
 * https://dev.to/matteobruni/mocha-chai-with-typescript-37f
 */

describe('Connection tests 2', () => { // the tests container
  it('connect to valid task', async () => { // the single test
    const appResp = await request(app).get('/')

    expect(appResp.ok).to.be.true
  })

  it('connect to non existing task', async () => { // the single test
    const appResp = await request(app).get('/feai/')

    expect(appResp.ok).to.be.true
  })

  after((done) => {
    done()
  })
})
