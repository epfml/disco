import { TASKS } from './tasks'

describe('training page', () => {
  it('is navigable', () => {
    const m = { matchCase: false }
    cy.intercept('tasks', TASKS)
    cy.visit('')
    cy.get('button').contains('get started', m).click()
    cy.get('button').contains('train', m).click()
    cy.get('button').contains('join', m).click()
    const navigationButtons = 3
    for (let i = 0; i < navigationButtons; i++) {
      cy.get('button').contains('next', m).click()
    }
    for (let i = 0; i < navigationButtons + 1; i++) {
      cy.get('button').contains('previous', m).click()
    }
  })
})
