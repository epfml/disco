import type { federatedMessages, Task } from "@epfml/discojs";
import {
  defaultTasks,
  mtype,
  WeightsContainer,
  weightsDecode,
  weightsEncode,
} from "@epfml/discojs";
import { assert, describe, expect, it, vi } from "vitest";
import { FederatedController } from "../../src/controllers/federated_controller.js";
import type { FederatedFakeWebSocket } from "../../tests/fake_websocket.js";
import {
  expectLastMessageOfType,
  lastMessageOfType,
  makeFederatedFakeWebSocket,
  messagesOfType,
} from "../../tests/fake_websocket.js";

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
 * Delays the execution for a specified number of milliseconds.
 * @param ms The number of milliseconds to wait.
 * @returns A promise that resolves after the specified delay.
 */
async function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Checks the NewFederatedNodeInfo message a participant received when joining.
 * @param ws The fake WebSocket instance representing the participant.
 * @param expected The expected values for the NewFederatedNodeInfo message.
 * @returns The checked NewFederatedNodeInfo message.
 */
function checkFederatedNodeInfo(
  ws: FederatedFakeWebSocket,
  expected: {
    round: number;
    nbOfParticipants: number;
    waitForMoreParticipants: boolean;
    payload: WeightsContainer | null;
    id?: string;
  },
): federatedMessages.NewFederatedNodeInfo {
  const nodeInfo = expectLastMessageOfType(
    ws,
    MessageTypes.NewFederatedNodeInfo,
  );

  expect(nodeInfo.round).toBe(expected.round);
  expect(nodeInfo.nbOfParticipants).toBe(expected.nbOfParticipants);
  expect(nodeInfo.waitForMoreParticipants).toBe(
    expected.waitForMoreParticipants,
  );
  if (expected.id !== undefined) {
    expect(nodeInfo.id).toBe(expected.id);
  }

  if (expected.payload === null) {
    expect(nodeInfo.payload).toBeNull();
  } else {
    assert.exists(nodeInfo.payload, "no weights sent to a mid-training joiner");
    expect(weightsDecode(nodeInfo.payload).equals(expected.payload)).toBe(true);
  }

  return nodeInfo;
}

/**
 * Checks the ReceiveServerPayload message a participant received from the server.
 * @param ws The fake WebSocket instance representing the participant.
 * @param expected The expected values for the ReceiveServerPayload message.
 */
function checkReceiveServerPayload(
  ws: FederatedFakeWebSocket,
  expected: {
    weights: WeightsContainer | null;
    round: number;
    nbOfParticipants: number;
  },
): void {
  const receivedPayload = expectLastMessageOfType(
    ws,
    MessageTypes.ReceiveServerPayload,
  );

  if (expected.weights === null) {
    expect(receivedPayload.payload).toBeNull();
  } else {
    assert.exists(receivedPayload.payload, "no payload received");
    expect(
      weightsDecode(receivedPayload.payload).equals(expected.weights),
    ).toBe(true);
  }
  expect(receivedPayload.round).toBe(expected.round);
  expect(receivedPayload.nbOfParticipants).toBe(expected.nbOfParticipants);
}

/**
 * Tests the join behavior of the federated controller.
 */
describe("Join handshake", () => {
  it("tells the first participant to wait", async () => {
    const controller = await makeController(2);
    const ws = makeFederatedFakeWebSocket();

    connect(controller, ws);

    checkFederatedNodeInfo(ws, {
      round: 0,
      nbOfParticipants: 1,
      waitForMoreParticipants: true,
      payload: null,
    });

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
    const newNodeInfo1 = expectLastMessageOfType(
      ws1,
      MessageTypes.NewFederatedNodeInfo,
    );
    connect(controller, ws2);

    // The first participant should receive an EnoughParticipants
    // but not a ParticipantsUpdate message
    const enoughParticipantsMsg1 = expectLastMessageOfType(
      ws1,
      MessageTypes.EnoughParticipants,
    );
    expect(enoughParticipantsMsg1.nbOfParticipants).toBe(2);
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );

    // The second participant should receive a NewFederatedNodeInfo message with waitForMoreParticipants=false
    // but not have received an EnoughParticipants message
    const newNodeInfo2 = checkFederatedNodeInfo(ws2, {
      round: 0,
      nbOfParticipants: 2,
      waitForMoreParticipants: false,
      payload: null,
    });
    expect(messagesOfType(ws2, MessageTypes.EnoughParticipants)).toHaveLength(
      0,
    );

    // Verify that the node ids are different for the two participants
    expect(newNodeInfo1.id).not.eq(newNodeInfo2.id);
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
    const participantsUpdate1 = expectLastMessageOfType(
      ws1,
      MessageTypes.ParticipantsUpdate,
    );
    expect(participantsUpdate1.nbOfParticipants).toBe(3);

    const participantsUpdate2 = expectLastMessageOfType(
      ws2,
      MessageTypes.ParticipantsUpdate,
    );
    expect(participantsUpdate2.nbOfParticipants).toBe(3);

    // The third participant should have received a NewFederatedNodeInfo message
    // but not a ParticipantsUpdate message
    checkFederatedNodeInfo(ws3, {
      round: 0,
      nbOfParticipants: 3,
      waitForMoreParticipants: false,
      payload: null,
    });
    expect(messagesOfType(ws3, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );
  });
});

/**
 * A client that never got its NewFederatedNodeInfo resends ClientConnected.
 * The server has to answer again without treating it as a new participant.
 */
describe("Join handshake retry", () => {
  it("answers a resent ClientConnected without counting a new participant", async () => {
    const controller = await makeController(2);
    const ws = makeFederatedFakeWebSocket();

    // emits the first ClientConnected message
    connect(controller, ws);
    ws.emitMessage({ type: MessageTypes.ClientConnected });

    const nodeInfos = messagesOfType(ws, MessageTypes.NewFederatedNodeInfo);
    expect(nodeInfos).toHaveLength(2);
    // Same websocket, so same participant: same id and still alone
    checkFederatedNodeInfo(ws, {
      round: 0,
      nbOfParticipants: 1,
      waitForMoreParticipants: true,
      payload: null,
      id: nodeInfos[0].id,
    });
  });

  it("does not tell the other participants that someone joined again", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // ws1 was told once that training can start, and never that someone joined
    expect(messagesOfType(ws1, MessageTypes.EnoughParticipants)).toHaveLength(
      1,
    );
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );

    ws2.emitMessage({ type: MessageTypes.ClientConnected });

    // The retry only concerns ws2, ws1 must not hear about it
    expect(messagesOfType(ws1, MessageTypes.EnoughParticipants)).toHaveLength(
      1,
    );
    expect(messagesOfType(ws1, MessageTypes.ParticipantsUpdate)).toHaveLength(
      0,
    );
    expect(messagesOfType(ws2, MessageTypes.NewFederatedNodeInfo)).toHaveLength(
      2,
    );
  });

  it("answers a retry with the current round and weights", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Wait for the messages to be received
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }

    ws2.emitMessage({ type: MessageTypes.ClientConnected });

    // The newFederatedNodeInfo message should contain the current round and the aggregated weights
    checkFederatedNodeInfo(ws2, {
      round: 1,
      nbOfParticipants: 2,
      waitForMoreParticipants: false,
      payload: MEAN_WEIGHTS_12,
    });
  });

  it("keeps the participant contributing after a retry", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    ws2.emitMessage({ type: MessageTypes.ClientConnected });

    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // The duplicate registration must not have broken aggregation
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });

      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(1);
    }
  });
});

/**
 * Tests the aggregation behavior of the federated controller.
 */
describe("The aggregation mechanism", () => {
  it("aggregates weights from multiple participants", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // After both participants have sent their weights, the controller should aggregate them
    // and send the aggregated weights back to both participants
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });

      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(1);
    }
  });

  it("does not aggregate until enough participants have contributed", async () => {
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

    // Wait for the server to handle both contributions
    await wait(100);

    // Since we require 3 participants for aggregation,
    // no ReceiveServerPayload message should have been sent yet
    for (const ws of [ws1, ws2, ws3]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }

    // Now, the third participant contributes their weights
    await contribute(ws3, DUMMY_WEIGHTS_3, 0);

    // Wait for the aggregation to complete
    await vi.waitFor(() => {
      for (const ws of [ws1, ws2, ws3]) {
        expect(
          messagesOfType(ws, MessageTypes.ReceiveServerPayload),
        ).toHaveLength(1);
      }
    });

    // Now all participants should receive the aggregated weights
    for (const ws of [ws1, ws2, ws3]) {
      checkReceiveServerPayload(ws, {
        weights: MEAN_WEIGHTS_123,
        round: 1,
        nbOfParticipants: 3,
      });
    }
  });

  it("ignores duplicate contributions from the same participant in the same round", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Client 1 contributes its weights for round 0 twice
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws1, DUMMY_WEIGHTS_1, 0); // Duplicate contribution from ws1

    // Wait for a short period to allow any potential aggregation to occur
    await wait(100);

    // At this point, no aggregation should have occurred yet
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }

    // Client 2 contributes its weights for round 0
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Now both participants should receive the aggregated weights
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });

      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(1);
    }
  });

  it("discards contributions from participants for further rounds", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Now both participants should receive the aggregated weights for round 0
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }

    // Now, both participants attempt to contribute weights for round 10, which should be ignored
    await contribute(ws1, DUMMY_WEIGHTS_3, 10);
    await contribute(ws2, DUMMY_WEIGHTS_3, 10);

    // The server should have ignored the contributions for round 10
    // Cannot use vi.waitFor here because we cannot wait for something that should not happen
    await wait(100);

    // No new aggregation should have occurred for round 10
    for (const ws of [ws1, ws2]) {
      checkReceiveServerPayload(ws, {
        weights: MEAN_WEIGHTS_12,
        round: 1,
        nbOfParticipants: 2,
      });
    }
  });

  it("allows participants to catch up and contribute to the current round after missing previous rounds", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // First 2 participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Make sure the two participants received the aggregated weights for round 0
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }

    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The third participant contributes its weights for round 0 late
    await contribute(ws3, DUMMY_WEIGHTS_3, 0);
    await vi.waitFor(() => {
      checkReceiveServerPayload(ws3, {
        weights: MEAN_WEIGHTS_12,
        round: 1,
        nbOfParticipants: 3,
      });
    });
  });

  it("ensures that a joining participant receives the latest global weights", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Both participants contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Wait for both participants to receive the aggregated weights
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }

    // Third participant joins after the aggregation of round 0
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The third participant should receive the latest global weights (mean of ws1 and ws2)
    checkFederatedNodeInfo(ws3, {
      round: 1,
      nbOfParticipants: 3,
      waitForMoreParticipants: false,
      payload: MEAN_WEIGHTS_12,
    });
  });

  it("ensures that a participant that is not connected cannot contribute weights", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    controller.handle(ws2); // ws2 is connected but never sends ClientConnected

    // clients 1 and 2 contribute their weights for round 0
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Wait for a short period to allow any potential aggregation to occur
    await wait(100);

    // Both participants should not have received any aggregated weights
    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }
  });

  it("ensures that a participant that is not connected should not block the training", async () => {
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

    await vi.waitFor(() => {
      // ws1 should have received the aggregated weights for round 0
      checkReceiveServerPayload(ws1, {
        weights: MEAN_WEIGHTS_12,
        round: 1,
        nbOfParticipants: 2,
      });
    });
  });
});

describe("The departure mechanism of a participant", () => {
  it("ensures we can still progress when the minimum number of participants is still met", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws3 leaves the session
    ws3.emitClose();

    // ws1 and ws2 should still be connected and able to contribute
    // The absolute threshold and minimum number of participants are met
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }

    // ws3 should not have received any aggregated weights since it left
    expect(messagesOfType(ws3, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );
  });

  it("ensures we cannot progress when the minimum number of participants is no longer met", async () => {
    const controller = await makeController(3);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws3 leaves the session, minimum number of participants is no longer met
    ws3.emitClose();

    // ws1 and ws2 should not be able to contribute successfully since the minimum is not met
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    await wait(100); // Wait for any potential updates to propagate

    for (const ws of [ws1, ws2]) {
      expect(
        messagesOfType(ws, MessageTypes.ReceiveServerPayload),
      ).toHaveLength(0);
    }
  });

  it("ensures we handle correctly when a participant departs while already waiting", async () => {
    const controller = await makeController(3);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // ws1 contribute
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);

    // ws2 leaves while ws1 is waiting for aggregation
    ws2.emitClose();
    await wait(100); // Wait for the handler to process the departure

    // ws1 should not receive any aggregated weights
    expect(messagesOfType(ws1, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );

    // ws1 should receive a ParticipantsUpdate message
    // and not a WaitingForMoreParticipants
    // (It has not received one yet as when ws2 joined it received a EnoughParticipants message)
    const lastParticipantsUpdateMsg = expectLastMessageOfType(
      ws1,
      MessageTypes.ParticipantsUpdate,
    );
    expect(lastParticipantsUpdateMsg.nbOfParticipants).toBe(1);
    expect(
      messagesOfType(ws1, MessageTypes.WaitingForMoreParticipants),
    ).toHaveLength(0);
  });

  it("ensures correct behavior when a participant rejoins after dropping below the minimum", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // ws2 leaves, dropping below the minimum
    ws2.emitClose();

    // ws1 should not be able to contribute successfully
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await wait(100); // Wait for any potential updates to propagate

    // ws1 should not have received any server payload since the minimum number of participants was not met
    expect(messagesOfType(ws1, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );

    // new ws joins
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // ws1 and ws3 should now be able to contribute successfully
    await contribute(ws3, DUMMY_WEIGHTS_2, 0);

    for (const ws of [ws1, ws3]) {
      await vi.waitFor(() => {
        checkReceiveServerPayload(ws, {
          weights: MEAN_WEIGHTS_12,
          round: 1,
          nbOfParticipants: 2,
        });
      });
    }
  });

  it("ensures the controller resets when all participants leave", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);

    // Make one round
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);

    // Make sure we have a ReceiveServerPayload
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        expect(
          messagesOfType(ws, MessageTypes.ReceiveServerPayload),
        ).toHaveLength(1);
      });
    }

    // both participants leave
    ws1.emitClose();
    ws2.emitClose();

    // new participant joins
    const ws3 = makeFederatedFakeWebSocket();
    connect(controller, ws3);

    // The received lastGlobalModel should be the initial model since the controller has been reset
    checkFederatedNodeInfo(ws3, {
      round: 0,
      nbOfParticipants: 1,
      waitForMoreParticipants: true,
      // As it is the first round we do not transmit the weights
      payload: null,
    });
  });

  it("ensures a contributor leaving before aggregation invalidates their contribution", async () => {
    const controller = await makeController(2);
    const ws1 = makeFederatedFakeWebSocket();
    const ws2 = makeFederatedFakeWebSocket();
    const ws3 = makeFederatedFakeWebSocket();

    connect(controller, ws1);
    connect(controller, ws2);
    connect(controller, ws3);

    // ws1 contributes
    await contribute(ws1, DUMMY_WEIGHTS_1, 0);

    // ws1 leaves before ws2 contributes
    ws1.emitClose();

    // ws2 contributes
    await contribute(ws2, DUMMY_WEIGHTS_2, 0);
    await wait(100); // Wait for any asynchronous operations to complete

    // Close remove the contribution and thus no aggregation should occur
    expect(messagesOfType(ws2, MessageTypes.ReceiveServerPayload)).toHaveLength(
      0,
    );
  });

  it("ensures the aggregation is done when the absolute thresholds is now met after departure", async () => {
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

    // ws3 leaves before aggregation
    ws3.emitClose();

    // Now both the relative threshold and the absolute
    // threshold are validated
    for (const ws of [ws1, ws2]) {
      await vi.waitFor(() => {
        expect(
          messagesOfType(ws, MessageTypes.ReceiveServerPayload),
        ).toHaveLength(1);
      });
    }
  });
});
