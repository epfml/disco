import { FileUploadManager } from './data_validation/file_upload_manager.js';
import { createTaskHelper } from './task_definition/helper.js';

export class Actor {
  constructor(task, logger, nbrFiles, helper) {
    this.task = task;
    this.logger = logger;
    // Manager for the file uploading process
    this.fileUploadManager = new FileUploadManager(nbrFiles, this);
    // Task helper class
    this.taskHelper = helper ?? createTaskHelper(this.task);
  }
}
