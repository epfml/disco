/* eslint-disable no-undef */

import TASK_LIST from './tasks'

describe('tasks page', () => {
  it('displays tasks', () => {
    cy.intercept({ hostname: 'server', pathname: 'tasks' }, TASK_LIST).as('tasks')

    cy.visit('/#/list')
    cy.get('div[id="tasks"]').children().should('have.length', TASK_LIST.length)
  })

  it('redirects to training', () => {
    cy.intercept({ hostname: 'server', pathname: 'tasks' }, TASK_LIST).as('tasks')

    cy.visit('/#/list')
    TASK_LIST.forEach((task) => {
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
