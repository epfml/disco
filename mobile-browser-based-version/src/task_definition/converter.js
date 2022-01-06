import { CsvTask } from './csv_task';
import { ImageTask } from './image_task';

export function getTaskClass(name) {
    switch (name) {
      case 'csv':
        return CsvTask;
      case 'image':
        return ImageTask
      default:
        console.log('No task object available');
        break;
    }
  }