export class DatasetSample {
  features: FeatureSample[]

  constructor (
    features: FeatureSample[]
  ) {
    this.features = features
  }
}

export class FeatureSample {
  name: string

  values: string[]

  constructor (
    name: string,
    values: string[]
  ) {
    this.name = name
    this.values = values
  }
}
