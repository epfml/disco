import { WeightsContainer } from "#weights/index";
import { Client } from "./client.js";

/**
 * A LocalClient represents a Disco user training only on their local data without collaborating
 * with anyone. Thus LocalClient doesn't do anything during communication
 */
export class LocalClient extends Client<"local"> {
  override onRoundBeginCommunication(): Promise<void> {
    return Promise.resolve();
  }
  // Simply return the local weights
  override onRoundEndCommunication(
    weights: WeightsContainer,
  ): Promise<WeightsContainer> {
    return Promise.resolve(weights);
  }
}
