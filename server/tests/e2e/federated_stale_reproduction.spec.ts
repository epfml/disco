import { EventEmitter } from "node:events";
import * as msgpack from "@msgpack/msgpack";
import * as tf from "@tensorflow/tfjs-node";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type WebSocket from "ws";
import type { Encoded, Task, federatedMessages } from "@epfml/discojs";
import {
  defaultTasks,
  MeanAggregator,
  mtype,
  WeightsContainer,
  weightsDecode,
  weightsEncode,
} from "@epfml/discojs";

import { FederatedController } from "../../src/controllers/federated_controller.js";

const MType = mtype.MType;

// Regression tests cover the staleness behavior at the controller boundary.
// Only the socket transport is simulated; controller, aggregation, tensors, and
// message/weight serialization are the production implementations.
describe("federated stale contribution reproductions", () => {
  const controllers: FederatedController<"image">[] = [];

  beforeAll(async () => {
    // Avoid the native backend's dependency on Node's removed
    // util.isNullOrUndefined; real tensor operations still run on the CPU.
    await tf.setBackend("cpu");
    await tf.ready();
  });

  afterEach(() => {
    controllers.splice(0).forEach((controller) => controller.reset());
  });

  async function encode(value: number): Promise<Encoded> {
    const weights = WeightsContainer.of([value]);
    try {
      return await weightsEncode(weights);
    } finally {
      weights.dispose();
    }
  }

  function scalar(payload: Encoded): number {
    const weights = weightsDecode(payload);
    try {
      return weights.weights[0].dataSync()[0];
    } finally {
      weights.dispose();
    }
  }

  async function makeController(minNbOfParticipants: number) {
    const base = await defaultTasks.cifar10.getTask();
    const task: Task<"image", "federated"> = {
      ...base,
      trainingInformation: {
        ...base.trainingInformation,
        scheme: "federated",
        aggregationStrategy: "mean",
        minNbOfParticipants,
      },
    };
    const controller = new FederatedController(task, await encode(10));
    controllers.push(controller);
    return controller;
  }

  function connect(controller: FederatedController<"image">) {
    const socket = new EventEmitter();
    const updates: federatedMessages.ReceiveServerPayload[] = [];
    const ws = Object.assign(socket, {
      send(data: Uint8Array) {
        const message = msgpack.decode(
          data,
        ) as federatedMessages.MessageFederated;
        if (message.type === MType.ReceiveServerPayload) updates.push(message);
      },
    });
    controller.handle(ws as unknown as WebSocket);
    socket.emit("message", msgpack.encode({ type: MType.ClientConnected }));
    return {
      updates,
      close: () => socket.emit("close"),
      async submit(round: number, value: number) {
        socket.emit(
          "message",
          msgpack.encode({
            type: MType.SendPayload,
            round,
            payload: await encode(value),
          }),
        );
      },
    };
  }

  it("labels the same cached weights one round lower on stale replies, repeatedly", async () => {
    const controller = await makeController(1);
    const client = connect(controller);
    await client.submit(0, 20);
    await vi.waitFor(() => expect(client.updates).toHaveLength(1));
    expect(client.updates[0].round).toBe(1);
    expect(scalar(client.updates[0].payload)).toBe(20);

    // Simulate an out-of-sync client. This is the exact setRound operation
    // FederatedClient performs upon receiving each server response.
    const clientRound = new MeanAggregator();
    for (let attempt = 0; attempt < 3; attempt++) {
      await client.submit(clientRound.round, 99);
      expect(client.updates).toHaveLength(attempt + 2);
      const response = client.updates.at(-1)!;
      clientRound.setRound(response.round);
      expect(response.round).toBe(0);
      expect(clientRound.round).toBe(0);
      expect(scalar(response.payload)).toBe(20);
    }
    clientRound.dispose();
  });

  it("waits for remaining clients after a contributor leaves", async () => {
    const controller = await makeController(2);
    const a = connect(controller);
    const b = connect(controller);
    const c = connect(controller);
    const d = connect(controller);

    await a.submit(0, 3);
    expect(a.updates).toHaveLength(0);
    a.close();
    await b.submit(0, 6);
    expect(b.updates).toHaveLength(0);
    await c.submit(0, 9);
    expect(b.updates).toHaveLength(0);
    expect(c.updates).toHaveLength(0);
    expect(d.updates).toHaveLength(0);
    expect(a.updates).toHaveLength(0);

    await d.submit(0, 100);
    await vi.waitFor(() => expect(b.updates).toHaveLength(1));

    // Only the remaining connected contributors are aggregated:
    // (B=6 + C=9 + D=100) / 3 = 115 / 3.
    expect(scalar(b.updates[0].payload)).toBeCloseTo(115 / 3);
    expect(b.updates[0].round).toBe(1);
    expect(scalar(c.updates[0].payload)).toBeCloseTo(115 / 3);
    expect(c.updates[0].round).toBe(1);
    expect(scalar(d.updates[0].payload)).toBeCloseTo(115 / 3);
    expect(d.updates[0].round).toBe(1);
  });

  it("returns initial weights with round -1 for a rejected first-round submission", async () => {
    const controller = await makeController(1);
    const client = connect(controller);
    await client.submit(-1, 99);
    expect(client.updates).toHaveLength(1);
    expect(client.updates[0].round).toBe(-1);
    expect(scalar(client.updates[0].payload)).toBe(10);
  });
});
