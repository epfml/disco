import { ModelActor } from '../model_actor'

export class Tester extends ModelActor {
  async testModel (downloadPredictions) {
    return true
  }
}

export default Tester
