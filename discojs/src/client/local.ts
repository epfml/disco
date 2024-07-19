import { WeightsContainer } from "../weights/weights_container.js";
import { Base } from "./base.js";

export class Local extends Base {
  onRoundEndCommunication(
    weights: WeightsContainer,
  ): Promise<WeightsContainer> {
    return Promise.resolve(weights);
  }
}
