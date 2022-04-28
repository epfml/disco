import { ModelActor } from '../model_actor'

export class Tester extends ModelActor {
  async testModel (): Promise<boolean> {
    return true
  }
}

export default Tester
