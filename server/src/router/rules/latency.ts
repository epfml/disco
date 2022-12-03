import { SustainabilityMetrics } from '@/../../discojs/discojs-core/src/client/federated/sustainability_metrics'
import { ValidatorRule } from '../condition_validator'


export class LatencyRule implements ValidatorRule {
    public validateRule(clientId: string, features: Map<string, SustainabilityMetrics>): boolean {
        if (features.size < 10) {
            return true
        }

        return [...new Map([...features.entries()].sort(
            (a, b) => b[1].latency - a[1].latency
        )).keys()].slice(0, 10).includes(clientId)
    }
}
