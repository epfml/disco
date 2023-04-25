import { WeightsContainer } from '../weights'
import { Base } from './base'

export { Base as AggregatorBase, AggregationStep } from './base'
export { MeanAggregator } from './mean'
export { RobustAggregator } from './robust'
export { SecureAggregator } from './secure'

export { getAggregator, AggregatorChoice } from './get'

export type Aggregator = Base<WeightsContainer>
