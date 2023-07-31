import { tf, Task } from '../../..'
import { ImagePreprocessing } from './image_preprocessing'
import { TabularPreprocessing } from './tabular_preprocessing'
import { TextPreprocessing } from './text_preprocessing'

export type Preprocessing = ImagePreprocessing | TextPreprocessing | TabularPreprocessing

export interface PreprocessingFunction {
  type: Preprocessing
  apply: (x: tf.TensorContainer, task: Task) => tf.TensorContainer
}
