import type { Task } from "@epfml/discojs";
import { defaultTasks, mtype } from "@epfml/discojs";
import { v4 as randomUUID } from "uuid";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DecentralizedController } from "./decentralized_controller.js";
import type { DecentralizedFakeWebSocket } from "../../tests/fake_websocket.js";
import {
  expectLastMessageOfType,
  makeDecentralizedFakeWebSocket,
} from "../../tests/fake_websocket.js";

import MessageTypes = mtype.MType;

// UUIDs practically never collide, so the generator is mocked to make them
vi.mock("uuid", () => ({ v4: vi.fn() }));
const mockedUUID = vi.mocked(randomUUID) as unknown as {
  mockReturnValueOnce: (id: string) => unknown;
  mockReset: () => void;
};

/** Have the next ids generated be `ids`, in order */
function nextIds(...ids: string[]): void {
  for (const id of ids) mockedUUID.mockReturnValueOnce(id);
}

async function makeController(): Promise<DecentralizedController<"image">> {
  const baseTask = await defaultTasks.cifar10.getTask();
  const task: Task<"image", "decentralized"> = {
    ...baseTask,
    trainingInformation: {
      ...baseTask.trainingInformation,
      scheme: "decentralized",
      aggregationStrategy: "mean",
      roundDuration: 1,
      minNbOfParticipants: 2,
      maxConnectionRetry: 3,
      maxPeerConnectionTime: 60_000,
      maxModelSyncTime: 30_000,
    },
  };
  return new DecentralizedController(task);
}

/** Connects a client and returns the id the server gave it */
function connect(
  controller: DecentralizedController<"image">,
  ws: DecentralizedFakeWebSocket,
): string {
  controller.handle(ws);
  ws.emitMessage({ type: MessageTypes.ClientConnected });
  return expectLastMessageOfType(ws, MessageTypes.NewDecentralizedNodeInfo).id;
}

/**
 * The server gives every open socket a distinct id, even if the generator
 * repeats itself, and frees the id when the socket closes.
 */
describe("TrainingController client ids", () => {
  beforeEach(() => {
    mockedUUID.mockReset();
  });

  it("doesn't give an id already in use", async () => {
    const controller = await makeController();
    nextIds("a", "a", "b");

    const [ws1, ws2] = [
      makeDecentralizedFakeWebSocket(),
      makeDecentralizedFakeWebSocket(),
    ];
    expect(connect(controller, ws1)).to.equal("a");
    expect(connect(controller, ws2)).to.equal("b");
  });

  it("reserves the id of a socket that hasn't joined yet", async () => {
    const controller = await makeController();
    nextIds("a", "a", "b");

    // the first socket is open but never sends ClientConnected
    controller.handle(makeDecentralizedFakeWebSocket());
    expect(connect(controller, makeDecentralizedFakeWebSocket())).to.equal("b");
  });

  it("gives again the id of a socket that closed", async () => {
    const controller = await makeController();
    nextIds("a", "b", "a");

    const ws1 = makeDecentralizedFakeWebSocket();
    expect(connect(controller, ws1)).to.equal("a");
    expect(connect(controller, makeDecentralizedFakeWebSocket())).to.equal("b");

    ws1.emitClose();
    expect(connect(controller, makeDecentralizedFakeWebSocket())).to.equal("a");
  });
});
