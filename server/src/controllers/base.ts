import express from 'express'
import type WebSocket from 'ws'

import type { Model, Task } from '@epfml/discojs'

/**
 * The Controller abstraction is commonly used in Express
 * and comes from the MVC pattern (model-view-controller)
 * In short, the controller is where the backend logic happens
 * when the server receives a client request
 * 
 * In this case, the controller handles the training logic:
 * what happens when a new task (DISCOllaborative) is created
 * and what happens when receiving messages from participants
 * of a training session.
 * 
 * More info on controllers:
 * https://developer.mozilla.org/en-US/docs/Learn/Server-side/Express_Nodejs/routes
 * 
 */
export abstract class TrainingController {

  constructor(protected readonly task: Task) { }

  abstract initTask (model: Model): void

  abstract handle(
    ws: WebSocket,
    model: Model,
    req: express.Request,
  ): void
}