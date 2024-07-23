import type { Map } from 'immutable'

import type { WeightsContainer } from './index.js'
import type { NodeID } from './client/index.js'

// Filesystem reference
export type Path = string

export type Features = number | number[] | number[][] | number[][][] | number[][][][] | number[][][][][]

export type Contributions = Map<NodeID, WeightsContainer>
