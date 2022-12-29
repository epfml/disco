import { tf } from '.'

// Filesystem reference
export type Path = string

// Weights of a model
export type Weights = tf.Tensor[]

export type MetadataID = string

export type Features = number | number[] | number[][] | number[][][] | number[][][][] | number[][][][][]
