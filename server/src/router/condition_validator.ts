import { SustainabilityMetrics } from '../../../discojs/discojs-core/src/client/federated/sustainability_metrics'


export interface ValidatorRule {
    validateRule(clientId: string, features: Map<string, SustainabilityMetrics>): boolean
}

export class ConditionValidator {
    private clientFeatures = new Map<string, SustainabilityMetrics>()

    private ruleList: ValidatorRule[] = []

    public addRule(rule: ValidatorRule) {
        this.ruleList.push(rule)
    }

    public updateSustainabilityMetrics(clientId: string, sustainabilityMetrics: SustainabilityMetrics) {
        this.clientFeatures.set(clientId, sustainabilityMetrics)
        console.log(this.clientFeatures)
    }

    public validate(clientId: string) {
        if (!this.clientFeatures.has(clientId)) {
            throw new Error("clientId has no features")
        }
        return this.ruleList.every((rule) => rule.validateRule(clientId, this.clientFeatures))
    }
}
