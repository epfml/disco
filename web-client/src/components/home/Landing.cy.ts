/* eslint-disable no-undef */
import Landing from './Landing.vue'

describe('<Landing />', () => {
  it('emits', () => {
    const spy = cy.spy().as('spy');
    (cy as any).mount(Landing, { props: { onGotStarted: spy } })
    cy.get('button').should('have.length', 1).click()
    cy.get('@spy').should('have.been.calledOnce')
  })
})
