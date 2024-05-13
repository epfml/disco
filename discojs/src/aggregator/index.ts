import type { WeightsContainer } from '../weights/index.js'
import type { Base } from './base.js'

export { Base as AggregatorBase, AggregationStep } from './base.js'
export { MeanAggregator } from './mean.js'
export { SecureAggregator } from './secure.js'

export { getAggregator, AggregatorChoice } from './get.js'

export type Aggregator = Base<WeightsContainer>
