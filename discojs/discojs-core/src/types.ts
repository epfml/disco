import { type WeightsContainer, type tf } from '.'
import { type NodeID } from './client'
import { type Map } from 'immutable'
// Filesystem reference
export type Path = string

// Weights of a model
export type Weights = tf.Tensor[]

export type MetadataKey = string
export type MetadataValue = string

export type Features = number | number[] | number[][] | number[][][] | number[][][][] | number[][][][][]

export type Contributions = Map<NodeID, WeightsContainer>
