import { List, Set } from 'immutable'

import { Task } from '../../task'
import { GraphInformant } from '../graph_informant'

export abstract class Base {
  // written feedback
  private messages = List<string>()

  // graph feedback
  protected readonly trainingGraphInformant = new GraphInformant()
  protected readonly validationGraphInformant = new GraphInformant()

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

  round (): number {
    // + 1 because rounds start at 0
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
