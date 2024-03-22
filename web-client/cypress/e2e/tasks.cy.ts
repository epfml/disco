import { TASKS } from './tasks'

describe('tasks page', () => {
  it('displays tasks', () => {
    cy.intercept({ hostname: 'server', pathname: 'tasks' }, TASKS).as('tasks')

    cy.visit('/#/list')
    cy.get('div[id="tasks"]').children().should('have.length', TASKS.size)
  })

  it('redirects to training', () => {
    cy.intercept({ hostname: 'server', pathname: 'tasks' }, TASKS).as('tasks')

    cy.visit('/#/list')
    TASKS.forEach((task) => {
      cy.get(`div[id="${task.id}"]`).find('button').click()
      cy.url().should('eq', `${Cypress.config().baseUrl}#/${task.id}`)
      cy.get('button').contains('previous', { matchCase: false }).click()
    })
  })

  it('displays error message', () => {
    cy.intercept({ hostname: 'server', pathname: 'tasks' }, { statusCode: 404 }).as('tasks')

    cy.visit('/#/list')
    cy.get('button').contains('reload page', { matchCase: false })
  })
})
