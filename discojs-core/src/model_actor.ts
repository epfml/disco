import { Logger } from './logging/logger'
import { Task } from './task'
/**
 * Base class for all actors of the system (e.g. trainer, tester, etc.)
 * containing commonly used parameters
 */
export class ModelActor {
  task: Task
  logger: Logger
  /**
   * Constructor for Actor
   * @param {Task} task - task on which the tasking shall be performed
   * @param {Logger} logger - logging system (e.g. toaster)
   */
  constructor (task: Task, logger: Logger) {
    this.task = task
    this.logger = logger
  }
}
