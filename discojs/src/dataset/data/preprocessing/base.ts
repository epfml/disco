import type tf from '@tensorflow/tfjs'

import type { Task } from '../../../index.js'
import type { ImagePreprocessing } from './image_preprocessing.js'
import type { TabularPreprocessing } from './tabular_preprocessing.js'
import type { TextPreprocessing } from './text_preprocessing.js'

/**
 * All available preprocessing type enums.
 */
export type Preprocessing = ImagePreprocessing | TextPreprocessing | TabularPreprocessing

/**
 * Preprocessing function associating a preprocessing type enum to a sample transformation.
 */
export interface PreprocessingFunction {
  type: Preprocessing
  apply: (x: Promise<tf.TensorContainer>, task: Task) => Promise<tf.TensorContainer>
}
