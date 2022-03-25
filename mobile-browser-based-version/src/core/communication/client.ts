import { Task } from '../task/task'
import { TrainingInformant } from '../training/training_informant'
import { LayersModel } from '@tensorflow/tfjs'

export abstract class Client {
  serverURL: string;
  task: Task;
  constructor (serverURL: string, task: Task) {
    this.serverURL = serverURL
    this.task = task
  }

  /**
   * Handles the connection process from the client to any sort of
   * centralized server.
   */
  abstract connect (epochs?:number): Promise<any>

  /**
   * Handles the disconnection process of the client from any sort
   * of centralized server.
   */
  abstract disconnect (): Promise<any>

  /**
   * The training manager matches this function with the training loop's
   * onTrainEnd callback when training a TFJS model object. See the
   * training manager for more details.
   */
  abstract onTrainEndCommunication (model: LayersModel, trainingInformant: TrainingInformant): Promise<void>

  /**
   * This function will be called whenever a local round has ended.
   *
   * @param model
   * @param round
   * @param trainingInformant
   */
  abstract onRoundEndCommunication (model: LayersModel, round: number, trainingInformant: TrainingInformant): Promise<void>
}
