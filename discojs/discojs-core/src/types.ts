import type tf from '@tensorflow/tfjs'
import type { Map } from 'immutable'

import type { WeightsContainer } from '.'
import type { NodeID } from './client'

// Filesystem reference
export type Path = string

// Weights of a model
export type Weights = tf.Tensor[]

export type MetadataKey = string
export type MetadataValue = string

export type Features = number | number[] | number[][] | number[][][] | number[][][][] | number[][][][][]

export type Contributions = Map<NodeID, WeightsContainer>
