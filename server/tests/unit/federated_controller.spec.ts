import type { Task } from "@epfml/discojs";
import {
  defaultTasks,
  mtype,
  WeightsContainer,
  weightsDecode,
  weightsEncode,
} from "@epfml/discojs";
import { describe, expect, it } from "vitest";
import { FederatedController } from "../../src/controllers/federated_controller.js";
import type { FederatedFakeWebSocket } from "./fake_websocket.js";
import {
  lastMessageOfType,
  makeFederatedFakeWebSocket,
  messagesOfType,
} from "./fake_websocket.js";

import MessageTypes = mtype.MType;

/**
 * Creates a new federated controller instance for testing purposes.
 * @param minNbOfParticipants The minimum number of participants required for training.
 * @returns A promise resolving to the created federated controller instance.
 */
async function makeController(
  minNbOfParticipants: number = 2,
): Promise<FederatedController<"image">> {
  const baseTask = await defaultTasks.tinderDog.getTask();
  const task: Task<"image", "federated"> = {
    ...baseTask,
    trainingInformation: {
      ...baseTask.trainingInformation,
      scheme: "federated",
      aggregationStrategy: "mean",
      roundDuration: 1,
      minNbOfParticipants,
    },
  };

  // Dummy initial weights
  const initialWeights = WeightsContainer.of([1, 2], [3]);
  return new FederatedController(task, await weightsEncode(initialWeights));
}

/**
 * Connects a fake WebSocket to the federated controller.
 * @param controller The federated controller instance.
 * @param ws The fake WebSocket instance.
 */
function connect(
  controller: FederatedController<"image">,
  ws: FederatedFakeWebSocket,
): void {
  controller.handle(ws);

  ws.emitMessage({
    type: MessageTypes.ClientConnected,
  });
}

const DUMMY_WEIGHTS_1 = WeightsContainer.of([1, 2], [3]);
const DUMMY_WEIGHTS_2 = WeightsContainer.of([4, 5], [6]);
const DUMMY_WEIGHTS_3 = WeightsContainer.of([7, 8], [9]);
const MEAN_WEIGHTS_12 = WeightsContainer.of(
  [(1 + 4) / 2, (2 + 5) / 2],
  [(3 + 6) / 2],
);
const MEAN_WEIGHTS_123 = WeightsContainer.of(
  [(1 + 4 + 7) / 3, (2 + 5 + 8) / 3],
  [(3 + 6 + 9) / 3],
);

/**
 * Simulates a participant contributing weights to the federated controller.
 * @param ws The fake WebSocket instance representing the participant.
 * @param weights The weights to be contributed.
 * @param round The round number for which the weights are being contributed.
 */
async function contribute(
  ws: FederatedFakeWebSocket,
  weights: WeightsContainer,
  round: number,
): Promise<void> {
  ws.emitMessage({
    type: MessageTypes.SendPayload,
    payload: await weightsEncode(weights),
    round,
  });
}

/**
 * Waits for a specified amount of time.
 * @param ms The number of milliseconds to wait.
 * @returns A promise that resolves after the specified time has elapsed.
 */
async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Tests the join behavior of the federated controller.
 */
describe("Join handshake", () => {
  it("tells the first participant to wait", async () => {
    const controller = await makeController(2);
    const ws = makeFederatedFakeWebSocket();

    connect(controller, ws);

    const newNodeInfo = lastMessageOfType(
      ws,
      MessageTypes.NewFederatedNodeInfo,
    );
    expect(newNodeInfo).toBeDefined();
    expect(newNodeInfo?.waitForMoreParticipants).toBe(true);
    expect(newNodeInfo?.payload).toBeNull();
    expect(newNodeInfo?.round).toBe(0);
    expect(newNodeInfo?.nbOfParticipants).toBe(1);

    // We do not receive a WaitingForMoreParticipants as we already receive the NewFederatedNodeInfo
    expect(
      messagesOfType(ws, MessageTypes.WaitingForMoreParticipants),
    ).toHaveLength(0);
  });

  it("tells the waiting participants when there are enough participants", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    const newNodeInfo1 = lastMessageOfType(
      ws1,
      MessageTypes.NewFederatedNodeInfo,
    );
    connect(controller, ws2);

    // The first participant should receive an EnoughParticipants
    // but not a ParticipantsUpdate message
    const enoughParticipantsMsg1 = lastMessageOfType(
      ws1,
      MessageTypes.EnoughParticipants,
    );
    expect(enoughParticipantsMsg1).toBeDefined();
    expect(enoughParticipantsMsg1?.nbOfParticipants).toBe(2);
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );

    // The second participant should receive a NewFederatedNodeInfo message with waitForMoreParticipants=false
    // but not have received a EnoughParticipants message
    const newNodeInfo2 = lastMessageOfType(
      ws2,
      MessageTypes.NewFederatedNodeInfo,
    );
    expect(newNodeInfo2).toBeDefined();
    expect(newNodeInfo2?.waitForMoreParticipants).toBe(false);
    expect(newNodeInfo2?.payload).toBeNull();
    expect(newNodeInfo2?.round).toBe(0);
    expect(newNodeInfo2?.nbOfParticipants).toBe(2);
    expect(messagesOfType(ws2, MessageTypes.EnoughParticipants)).toHaveLength(
      0,
    );

    // Verify that their client IDs are different
    expect(newNodeInfo1?.id).not.toEqual(newNodeInfo2?.id);
  });

  it("tells participants when one joins an ongoing session", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // A third participant joins
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The first two participants should have received a ParticipantsUpdate message
    const participantsUpdate1 = lastMessageOfType(
      ws1,
      MessageTypes.ParticipantsUpdate,
    );
    expect(participantsUpdate1).toBeDefined();
    expect(participantsUpdate1?.nbOfParticipants).toBe(3);

    const participantsUpdate2 = lastMessageOfType(
      ws2,
      MessageTypes.ParticipantsUpdate,
    );
    expect(participantsUpdate2).toBeDefined();
    expect(participantsUpdate2?.nbOfParticipants).toBe(3);

    // The third participant should have received a NewFederatedNodeInfo message
    // but not a ParticipantsUpdate message
    const newNodeInfo3 = lastMessageOfType(
      ws3,
      MessageTypes.NewFederatedNodeInfo,
    );
    expect(newNodeInfo3).toBeDefined();
    expect(newNodeInfo3?.waitForMoreParticipants).toBe(false);
    expect(newNodeInfo3?.payload).toBeNull();
    expect(newNodeInfo3?.round).toBe(0);
    expect(newNodeInfo3?.nbOfParticipants).toBe(3);
    expect(messagesOfType(ws3, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );
  });
});

/**
 * Tests the aggregation behavior of the federated controller.
 */
describe("Aggregation", () => {
  it("aggregates weights from multiple participants", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for the aggregation to complete as it is asynchronous

    // After both participants have sent their weights, the controller should aggregate them
    // and send the aggregated weights back to both participants
    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();

      const aggregatedWeights = weightsDecode(aggregatedWeightsMsg!.payload);

      expect(aggregatedWeights.equals(MEAN_WEIGHTS_12)).toBe(true);
      expect(aggregatedWeightsMsg?.round).toBe(1);
      expect(aggregatedWeightsMsg?.nbOfParticipants).toBe(2);
    }
  });

  it("not aggregating until enough participants have contributed", async () => {
    const controller = await makeController(3); // Require 3 participants for aggregation
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // Only two participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for any potential aggregation to complete

    // Since we require 3 participants for aggregation,
    // No ReceiveServerPayload messages should have been sent yet
    for (const ws of [ws1, ws2, ws3]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }

    // Now, the third participant contributes their weights
    const weights3 = WeightsContainer.of([7, 8], [9]);
    await contribute(ws3, weights3, 0);
    await wait(100); // Wait for the aggregation to complete

    // Now all participants should receive the aggregated weights
    for (const ws of [ws1, ws2, ws3]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();

      const aggregatedWeights = weightsDecode(aggregatedWeightsMsg!.payload);

      expect(aggregatedWeights.equals(MEAN_WEIGHTS_123)).toBe(true);
      expect(aggregatedWeightsMsg!.round).toBe(1);
      expect(aggregatedWeightsMsg!.nbOfParticipants).toBe(3);
    }
  });

  it("duplicate contribution from the same participant in the same round is ignored", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Client 1 contributes its weights for round 0 twice
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws1, DUMMY_WEIGHTS_1, 0); // Duplicate contribution from ws1
    await wait(100);

    // Make sure that no aggregation has occurred yet, as we require 2 participants
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }

    // Client 2 contributes its weights for round 0
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // Now both participants should receive the aggregated weights
    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();

      const aggregatedWeights = weightsDecode(aggregatedWeightsMsg!.payload);

      expect(aggregatedWeights.equals(MEAN_WEIGHTS_12)).toBe(true);
      expect(aggregatedWeightsMsg!.round).toBe(1);
      expect(aggregatedWeightsMsg!.nbOfParticipants).toBe(2);
    }
  });

  it("participants cannot contribute weights for further rounds", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for the aggregation to complete

    // Now both participants should receive the aggregated weights for round 0
    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();
      expect(aggregatedWeightsMsg!.round).toBe(1); // The next round is 1
    }

    // Now, both participants attempt to contribute weights for round 10, which should be ignored
    await contribute(ws1, DUMMY_WEIGHTS_3, 10);
    await contribute(ws2, DUMMY_WEIGHTS_3, 10);
    await wait(100);

    // No new aggregation should have occurred for round 10
    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();
      expect(aggregatedWeightsMsg!.round).toBe(1); // Still round 1, no new aggregation
    }
  });

  it("participants can catch up and contribute to the current round after missing previous rounds", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // First 2 participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for the aggregation to complete

    // Make sure the two participants received the aggregated weights for round 0
    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      expect(aggregatedWeightsMsg).toBeDefined();
      expect(aggregatedWeightsMsg!.round).toBe(1); // The next round is 1
    }

    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The third participant contributes its weights for round 0 late
    await contribute(ws3, DUMMY_WEIGHTS_3, 0);
    await wait(100);

    // The third participant should receive the aggregated weights for round 0, and the next round should be 1
    const aggregatedWeightsMsg3 = lastMessageOfType(
      ws3,
      MessageTypes.ReceiveServerPayload,
    );
    const aggregatedWeights3 = weightsDecode(aggregatedWeightsMsg3!.payload);
    expect(aggregatedWeightsMsg3).toBeDefined();
    expect(aggregatedWeights3.equals(MEAN_WEIGHTS_12)).toBe(true);
    expect(aggregatedWeightsMsg3!.round).toBe(1); // The next round is 1
  });

  it("joining participant receives the latest global weights", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for the aggregation to complete

    // Third participant joins after the aggregation of round 0
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The third participant should receive the latest global weights (mean of ws1 and ws2)
    const newNodeInfo3 = lastMessageOfType(
      ws3,
      MessageTypes.NewFederatedNodeInfo,
    );
    expect(newNodeInfo3).toBeDefined();
    expect(newNodeInfo3?.waitForMoreParticipants).toBe(false);
    expect(newNodeInfo3?.round).toBe(1); // The next round is 1
    expect(newNodeInfo3?.nbOfParticipants).toBe(3);

    const latestWeights = weightsDecode(newNodeInfo3!.payload!);
    expect(latestWeights.equals(MEAN_WEIGHTS_12)).toBe(true);
  });

  it("a participant that is not connected cannot contribute weights", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    controller.handle(ws2); // ws2 is connected but never sends ClientConnected

    // ws1 contributes its weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await wait(100); // Wait for any potential aggregation to complete

    // ws2 attempts to contribute its weights for round 0
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // Both participants should not have received any aggregated weights
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }
  });

  /**
  it("a participant that is not conected should not block the training", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    controller.handle(ws3); // ws3 is connected but never sends ClientConnected

    // ws1 and ws2 contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // ws1 should have received the aggregated weights for round 0
    const aggregatedWeightsMsg1 = lastMessageOfType(
      ws1,
      MessageTypes.ReceiveServerPayload,
    );
    const aggregatedWeights1 = weightsDecode(
      aggregatedWeightsMsg1!.payload,
    );
    expect(aggregatedWeights1.equals(MEAN_WEIGHTS_12)).toBe(true); // Should be the aggregated weights
    expect(aggregatedWeightsMsg1!.round).toBe(1);
  });
  */
});

describe("leaving and reset", () => {
  it("departure when the minimum is still met", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws3 leaves the session
    ws3.emitClose();

    await wait(100); // Wait for any potential updates to propagate

    // ws1 and ws2 should still be connected and able to contribute
    // The absolute threshold and minimum number of participants are met
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    for (const ws of [ws1, ws2]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      const aggregatedWeights = weightsDecode(aggregatedWeightsMsg!.payload);
      expect(aggregatedWeights.equals(MEAN_WEIGHTS_12)).toBe(true);
      expect(aggregatedWeightsMsg!.round).toBe(1);
    }

    // ws3 should not have received any aggregated weights since it left
    expect(messagesOfType(ws3, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );
  });

  it("departure when the minimum is no longer met", async () => {
    const controller = await makeController(3);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws3 leaves the session, minimum number of participants is no longer met
    ws3.emitClose();

    await wait(100); // Wait for any potential updates to propagate

    // ws1 and ws2 should not be able to contribute successfully since the minimum is not met
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }
  });

  it("departure when already waiting", async () => {
    const controller = await makeController(3);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    await wait(100); // Make sure ws1 receives
    connect(controller, ws2);

    // ws1 contribute
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);

    // ws2 leaves while ws1 is waiting for aggregation
    ws2.emitClose();
    await wait(100);

    // ws1 should not receive any aggregated weights
    expect(messagesOfType(ws1, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );

    // ws1 should receive a ParticipantsUpdate message
    // and not a WaitingForMoreParticipants
    // (It has not received one yet as when ws2 joined it received a EnoughParticipants message)
    const lastParticipantsUpdateMsg = lastMessageOfType(
      ws1,
      MessageTypes.ParticipantsUpdate,
    );
    expect(lastParticipantsUpdateMsg!.nbOfParticipants).toBe(1);
    expect(
      messagesOfType(ws1, MessageTypes.WaitingForMoreParticipants),
    ).toHaveLength(0);
  });

  it("Rejoin after dropping below the minimum", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // ws2 leaves, dropping below the minimum
    ws2.emitClose();
    await wait(100);

    // ws1 should not be able to contribute successfully
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await wait(100);
    expect(messagesOfType(ws1, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );

    // new ws joins
    const ws2Rejoin = makeFederatedFakeWebSocket();
    connect(controller, ws2Rejoin);
    await wait(100);

    // ws1 and ws2Rejoin should now be able to contribute successfully
    await contribute(ws2Rejoin, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    for (const ws of [ws1, ws2Rejoin]) {
      const aggregatedWeightsMsg = lastMessageOfType(
        ws,
        MessageTypes.ReceiveServerPayload,
      );
      const aggregatedWeights = weightsDecode(aggregatedWeightsMsg!.payload);
      expect(aggregatedWeights.equals(MEAN_WEIGHTS_12)).toBe(true);
      expect(aggregatedWeightsMsg!.round).toBe(1);
    }
  });

  it("Reset when all participants leave", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Make one round
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // Make sure we have a ReceiveServerPayload
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(1);
    }

    // both participants leave
    ws1.emitClose();
    ws2.emitClose();
    await wait(100);

    // new participant joins
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);
    await wait(100);

    // The received lastGlobalModel should be the initial model since the controller has been reset
    const clientConnected = lastMessageOfType(
      ws3,
      MessageTypes.NewFederatedNodeInfo,
    );
    expect(clientConnected).not.toBeNull();
    expect(clientConnected!.round).toBe(0);
    expect(clientConnected?.payload).toBeNull(); // As it is the first round and we do not transmit the weights
  });

  it("Contributor leaves before aggregation, invalidation of contribution", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws1 contributes
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await wait(100);

    // ws1 leaves before ws2 contributes
    ws1.emitClose();
    await wait(100);

    // ws2 contributes
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // Close remove the contribution and thus no aggregation should occur
    expect(messagesOfType(ws2, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );
  });

  it("Participant leaves and threshold is now validated", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws1 and ws2 contribute
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100);

    // ws3 leaves before aggregation
    ws3.emitClose();
    await wait(100);

    // Now both the relative threshold and the absolute
    // threshold are validated
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(1);
    }
  });
});
