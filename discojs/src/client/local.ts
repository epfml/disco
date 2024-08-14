import { WeightsContainer } from "../weights/weights_container.js";
import { Client } from "./client.js";

export class Local extends Client {
  onRoundEndCommunication(
    weights: WeightsContainer,
  ): Promise<WeightsContainer> {
    return Promise.resolve(weights);
  }
}
