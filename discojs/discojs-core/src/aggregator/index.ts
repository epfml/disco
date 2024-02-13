import { type WeightsContainer } from '../weights'
import { type Base } from './base'

export { Base as AggregatorBase, AggregationStep } from './base'
export { MeanAggregator } from './mean'
export { RobustAggregator } from './robust'
export { SecureAggregator } from './secure'

export { getAggregator, AggregatorChoice } from './get'

export type Aggregator = Base<WeightsContainer>
