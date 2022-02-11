import { FileUploadManager } from './data_validation/file_upload_manager'
import { Task } from './task_definition/base/task'
import { TaskHelper } from './task_definition/base/taskHelper'
import { createTaskHelper } from './task_definition/helper'
import { Logger } from './logging/logger'
/**
 * Base class for all actors of the system (e.g. trainer, tester, etc.)
 * containing commonly used parameters
 */
export class Actor {
  task: Task
  logger: Logger
  taskHelper: TaskHelper<Task>
  fileUploadManager: FileUploadManager
  /**
   * Constructor for Actor
   * @param {Task} task - task on which the tasking shall be performed
   * @param {Logger} logger - logging system (e.g. toaster)
   * @param {Number} nbrFiles - number of files that shall be uploaded to the file upload manager
   * @param {TaskHelper} helper - helper containing task specific functions (e.g. preprocessing)
   */
  constructor (task, logger, nbrFiles, helper) {
    this.task = task
    this.logger = logger
    // Manager for the file uploading process
    this.fileUploadManager = new FileUploadManager(nbrFiles, this)
    // Task helper class
    this.taskHelper = helper ?? createTaskHelper(this.task)
  }
}
