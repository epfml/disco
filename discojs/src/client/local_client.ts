import { WeightsContainer } from "../index.js";
import { Client } from "./client.js";

/**
 * A LocalClient represents a Disco user training only on their local data without collaborating
 * with anyone. Thus LocalClient doesn't do anything during communication
 */
export class LocalClient extends Client {

  getNbOfParticipants(): number {
    return 1;
  }

  onRoundBeginCommunication(): Promise<void> {
    return Promise.resolve();
  }
  // Simply return the local weights 
  onRoundEndCommunication(weights: WeightsContainer): Promise<WeightsContainer> {
    return Promise.resolve(weights);
  }
}