import { List, Set } from 'immutable'

import type { Task } from '../../index.js'

import { GraphInformant } from '../graph_informant.js'

export abstract class Base {
  // written feedback
  private messages = List<string>()

  // graph feedback
  protected readonly trainingGraphInformant = new GraphInformant()
  protected readonly validationGraphInformant = new GraphInformant()

  private _losses = List<number>()

  // statistics
  protected currentRound = 0
  protected currentNumberOfParticipants = 0
  protected totalNumberOfParticipants = 0
  protected averageNumberOfParticipants = 0

  constructor (
    public readonly task: Task,
    private readonly nbrMessagesToShow: number = 10
  ) {}

  abstract update (statistics: Record<string, number>): void

  addMessage (msg: string): void {
    if (this.messages.size >= this.nbrMessagesToShow) {
      this.messages = this.messages.shift()
    }
    this.messages = this.messages.push(msg)
  }

  getMessages (): string[] {
    return this.messages.toArray()
  }

  /**
   *
   * @returns the training round incremented by 1 (to start at 1 rather than 0)
   */
  round (): number {
    return this.currentRound + 1
  }

  participants (): number {
    return this.currentNumberOfParticipants
  }

  totalParticipants (): number {
    return this.totalNumberOfParticipants
  }

  averageParticipants (): number {
    return this.averageNumberOfParticipants
  }

  updateTrainingGraph (accuracy: number): void {
    this.trainingGraphInformant.updateAccuracy(accuracy)
  }

  updateValidationGraph (accuracy: number): void {
    this.validationGraphInformant.updateAccuracy(accuracy)
  }

  trainingAccuracy (): number {
    return this.trainingGraphInformant.accuracy()
  }

  validationAccuracy (): number {
    return this.validationGraphInformant.accuracy()
  }

  set loss (loss: number | undefined) {
    if (loss === undefined) throw new Error('loss is undefined')
    this._losses = this._losses.push(loss)
  }

  get loss (): number | undefined {
    return this._losses.last()
  }

  /** return loss of each round */
  get losses (): List<number> {
    return this._losses
  }

  trainingAccuracyData (): List<number> {
    return this.trainingGraphInformant.data()
  }

  validationAccuracyData (): List<number> {
    return this.validationGraphInformant.data()
  }

  isDecentralized (): boolean {
    return false
  }

  isFederated (): boolean {
    return false
  }

  static isTrainingInformant (raw: unknown): raw is Base {
    if (typeof raw !== 'object') {
      return false
    }

    if (raw === null) {
      return false
    }

    // TODO
    const requiredFields = Set<string>()
    if (!(requiredFields.every((field) => field in raw))) {
      return false
    }

    return true
  }
}
