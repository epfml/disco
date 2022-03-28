import { Task } from './task/task'
import { Logger } from './logging/logger'
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
   * @param {Number} nbrFiles - number of files that shall be uploaded to the file upload manager
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task: Task, logger: Logger) {
    this.task = task
    this.logger = logger
  }
}
