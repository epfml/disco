import type { AggregatorBase } from './aggregator'

export class AsyncInformant<T> {
  private _round = 0
  private _currentNumberOfParticipants = 0
  private _totalNumberOfParticipants = 0
  private _averageNumberOfParticipants = 0

  constructor (
    private readonly aggregator: AggregatorBase<T>
  ) {}

  update (): void {
    if (this.round === 0 || this.round < this.aggregator.round) {
      this._round = this.aggregator.round
      this._currentNumberOfParticipants = this.aggregator.size
      this._averageNumberOfParticipants = this.totalNumberOfParticipants / this.round
      this._totalNumberOfParticipants += this.currentNumberOfParticipants
    } else {
      this._round = this.aggregator.round
    }
  }

  // Getter functions
  get round (): number {
    return this._round
  }

  get currentNumberOfParticipants (): number {
    return this._currentNumberOfParticipants
  }

  get totalNumberOfParticipants (): number {
    return this._totalNumberOfParticipants
  }

  get averageNumberOfParticipants (): number {
    return this._averageNumberOfParticipants
  }

  getAllStatistics (): Record<
  'round' | 'currentNumberOfParticipants' | 'totalNumberOfParticipants' | 'averageNumberOfParticipants', number
  > {
    return {
      round: this.round,
      currentNumberOfParticipants: this.currentNumberOfParticipants,
      totalNumberOfParticipants: this.totalNumberOfParticipants,
      averageNumberOfParticipants: this.averageNumberOfParticipants
    }
  }
}
