import { tf, Task } from '../../..'
import { ImagePreprocessing } from './image_preprocessing'
import { TabularPreprocessing } from './tabular_preprocessing'
import { TextPreprocessing } from './text_preprocessing'

/**
 * All available preprocessing type enums.
 */
export type Preprocessing = ImagePreprocessing | TextPreprocessing | TabularPreprocessing

/**
 * Preprocessing function associating a preprocessing type enum to a sample transformation.
 */
export interface PreprocessingFunction {
  type: Preprocessing
  apply: (x: tf.TensorContainer, task: Task) => tf.TensorContainer
}
