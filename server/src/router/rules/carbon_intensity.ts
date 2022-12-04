import { SustainabilityMetrics } from '@/../../discojs/discojs-core/src/client/federated/sustainability_metrics'
import { ValidatorRule } from '../condition_validator'


export class CarbonIntensityRule implements ValidatorRule {
    public validateRule(clientId: string, features: Map<string, SustainabilityMetrics>): boolean {
        let curFeatures = features.get(clientId);
        if (curFeatures === undefined) {
            return true
        } else if (curFeatures.carbonIntensity > 300) {
            // failsafe
            return false
        }

        return [...new Map([...features.entries()].sort(
            (a, b) => b[1].latency - a[1].latency
        )).keys()].slice(0, 10).includes(clientId)
    }
}
