import { List, Repeat } from 'immutable'

export class GraphInformant {
  public static readonly NB_EPOCHS_ON_GRAPH = 10
  private currentAccuracy: number
  private accuracyDataSeries: List<number>

  constructor () {
    this.currentAccuracy = 0
    this.accuracyDataSeries = Repeat(0, GraphInformant.NB_EPOCHS_ON_GRAPH).toList()
  }

  updateAccuracy (accuracy: number): void {
    this.accuracyDataSeries = this.accuracyDataSeries.shift().push(accuracy)
    this.currentAccuracy = accuracy
  }

  data (): List<number> {
    return this.accuracyDataSeries
  }

  accuracy (): number {
    return this.currentAccuracy
  }
}
