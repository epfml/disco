import type { WeightsContainer } from "#weights/index";
import { Client } from "#client/client";

/**
 * A LocalClient represents a Disco user training only on their local data without collaborating
 * with anyone. Thus LocalClient doesn't do anything during communication
 */
export class LocalClient extends Client<"local"> {
  override onRoundBeginCommunication(): Promise<void> {
    return Promise.resolve();
  }
  // Return clones so the trainer can dispose the communication result without
  // disposing tensors owned by the model.
  override onRoundEndCommunication(
    weights: WeightsContainer,
  ): Promise<WeightsContainer> {
    return Promise.resolve(weights.map((weight) => weight.clone()));
  }
}
