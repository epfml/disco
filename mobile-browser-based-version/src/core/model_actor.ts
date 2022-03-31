import { FileUploadManager } from './dataset/data_format_check/file_upload_manager'
import { Task } from './task/base/task'
import { TaskHelper } from './task/base/task_helper'
import { createTaskHelper } from './task/task_builder'
import { Logger } from './logging/logger'
/**
 * Base class for all actors of the system (e.g. trainer, tester, etc.)
 * containing commonly used parameters
 */
export class ModelActor {
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
  constructor (task: Task, logger: Logger, nbrFiles: number, helper: TaskHelper<Task>) {
    this.task = task
    this.logger = logger
    // Manager for the file uploading process
    this.fileUploadManager = new FileUploadManager(nbrFiles, this)
    // Task helper class
    this.taskHelper = helper ?? createTaskHelper(this.task)
  }
}
