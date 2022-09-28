import { tf } from '@epfml/discojs'

export type Weights = tf.Tensor[]

export interface HTMLInputEvent extends Event {
  target: HTMLInputElement
}

export interface HTMLDragEvent extends DragEvent {
  dataTransfer: DataTransfer
}
