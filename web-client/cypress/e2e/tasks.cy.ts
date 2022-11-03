/* eslint-disable no-undef */
import { defaultTasks } from '@epfml/discojs'

// most basic disco tasks
export const TASK_LIST = [
  defaultTasks.titanic.getTask(),
  defaultTasks.mnist.getTask(),
  defaultTasks.cifar10.getTask()
]

describe('tasks page', () => {
  it('displays tasks', () => {
    cy.intercept('tasks', TASK_LIST).as('tasks')
    cy.visit('list')
    cy.wait('@tasks').then((interception) => {
      assert.lengthOf(interception.response.body, TASK_LIST.length)
    })
    cy.get('div[id="tasks"]').children().should('have.length', TASK_LIST.length)
  })
  it('redirects to training', () => {
    cy.intercept('tasks', TASK_LIST).as('tasks')
    cy.visit('list')
    cy.wait('@tasks')
    TASK_LIST.forEach((task) => {
      cy.get(`div[id="${task.taskID}"]`).find('button').click()
      cy.url().should('eq', Cypress.config().baseUrl + task.taskID)
      cy.get('button').contains('previous', { matchCase: false }).click()
      cy.url().should('eq', Cypress.config().baseUrl + 'list')
    })
  })
  it('displays error message', () => {
    cy.intercept('tasks', (req) => {
      req.reply({ statusCode: 404 })
    }).as('tasks')
    cy.visit('list')
    cy.wait('@tasks')
    cy.get('button').contains('reload page', { matchCase: false })
  })
})
