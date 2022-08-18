/* eslint-disable no-undef */
import { tasks } from '@epfml/discojs'

// most basic disco tasks
const TASK_LIST = [
  tasks.titanic.task,
  tasks.mnist.task,
  tasks.cifar10.task
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
