/* eslint-disable no-undef */
import GetStarted from './GetStarted.vue'

describe('<Landing />', () => {
  it('changes route', () => {
    // TODO: find a way to mock router with the composition API
    (cy as any).mount(GetStarted)
    cy.get('button').should('have.length', 3)
  })
})
