import { CsvTask } from './csv/csv_task'
import { ImageTask } from './image/image_task'
import { CsvTaskHelper } from './csv/csv_task_helper'
import { ImageTaskHelper } from './image/image_task_helper'

/**
 * Constants related to tasks. Each '*_TASK' constant should
 * refer to a datatype and must have a TaskFrame and a TaskHelper
 * associated to it.
 */
export const CSV_TASK = 'csv'
export const IMAGE_TASK = 'image'
export const ALL_TASKS = [CSV_TASK, IMAGE_TASK]

export const TASK_INFO = {
  csv: {
    frameClass: CsvTask,
    helperClass: CsvTaskHelper
  },
  image: {
    frameClass: ImageTask,
    helperClass: ImageTaskHelper
  }
}
