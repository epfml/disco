import type { DataFormat, Dataset, RoundStatus, Task } from "@epfml/discojs";
import { defaultModels, defaultTasks } from "@epfml/discojs";
import { afterEach, beforeAll, beforeEach, describe, it } from "vitest";
import { datasets } from "../../utils.js";
import { Participant, startServer } from "../helpers.js";

/**
 * When disco.trainByRound is called for the first time, the client connects
 * to the server which returns the latest model, current round and nb of
 * participants. Then at each round the event cycle is:
 * a) onRoundBeginCommunication which updates the status to "local training"
 * b) local training (the status remains "local training")
 * c) onRoundEndCommunication which sends the local update and
 *    receives the global weights while emitting the status UPDATE
 *
 * Given this, it is important to note that a single call to
 * disco.trainByRound().next() performs a full round: a), b) and c).
 * It only resolves once the server aggregated the round, so when a client
 * is alone (minNbOfParticipants isn't met) the call stays pending until
 * another participant joins and the round completes. `Participant` therefore
 * splits a round in `startRound()` and `completeRound()`, so that the tests
 * can choreograph through the status and participants events instead of
 * awaiting a round right away.
 *
 * Every step of that choreography is a named function below asserting the
 * events it expects. Each test then plays the steps leading to the one it
 * covers and ends with that step, which keeps a failure pointing at a single
 * step of the timeline.
 */
describe("clients emit expected events", { timeout: 100_000 }, () => {
  type Client = Participant<"image", "federated">;

  /** Statuses a client goes through during a round it can complete */
  const FULL_ROUND: readonly RoundStatus[] = [
    "local training",
    "updating model",
  ];

  let task: Task<"image", "federated">;
  let url: URL;
  let dataset: Dataset<DataFormat.Raw["image"]>;
  const joined: Client[] = [];

  beforeAll(async () => {
    dataset = await datasets.loadLusCOVID();
  });

  beforeEach(async () => {
    const baseTask = await defaultTasks.lusCovid.getTask();
    task = {
      ...baseTask,
      trainingInformation: {
        ...baseTask.trainingInformation,
        roundDuration: 1,
        minNbOfParticipants: 2,
      },
    };

    url = await startServer(defaultModels.LUSClassifier, {
      ...defaultTasks.lusCovid,
      getTask: () => Promise.resolve(task),
    });
  });

  afterEach(async () => {
    await Promise.all(joined.splice(0).map(async (c) => await c.leave()));
  });

  /** Have a new client join the task, closed at the end of the test */
  function join(name: string): Client {
    const client = new Participant(name, task, url, dataset);
    joined.push(client);
    return client;
  }

  /**
   * A client joining a task nobody else is on: it trains locally right away
   * but can't share its update, so it stays pending in c).
   */
  async function joinsAlone(name: string): Promise<Client> {
    const client = join(name).startRound();

    // a) and b), the client trains without waiting for anyone
    await client.expectStatuses("local training");
    await client.expectParticipants(1);
    // c), sharing the update needs a second participant
    await client.expectStatuses("not enough participants");

    return client;
  }

  /**
   * A client joining a waiting one: both share their update, the server
   * aggregates them and answers with the new global weights.
   */
  async function joinsWaitingClient(
    waiting: Client,
    name: string,
  ): Promise<Client> {
    const client = join(name).startRound();

    // the new client connects to the server, which triggers the participant
    // event, and trains
    await client.expectParticipants(2);
    await client.expectStatuses("local training");
    // the waiting client receives the EnoughParticipants message with the
    // participants, its previous status is restored and it shares its update
    await waiting.expectParticipants(2);
    await waiting.expectStatuses("local training", "updating model");
    // the new client finishes training and shares its update too
    await client.expectStatuses("updating model");

    // the server aggregates the round and answers with the new global
    // weights along with the participants, resolving both pending rounds
    await Promise.all([waiting.completeRound(), client.completeRound()]);
    await waiting.expectParticipants(2);
    await client.expectParticipants(2);

    return client;
  }

  /** A round during which every client is present, so a), b) and c) run */
  async function runFullRound(...clients: readonly Client[]): Promise<void> {
    await Promise.all(clients.map(async (c) => await c.completeRound()));

    for (const client of clients) await client.expectStatuses(...FULL_ROUND);
    // the server payload received during c) carries the participants
    for (const client of clients)
      await client.expectParticipants(clients.length);
  }

  /**
   * A client joining a session which already has enough participants. It
   * releases nobody and completes nobody's round, it only makes the others
   * one more: the server is the only one able to tell them.
   */
  async function joinsSession(
    present: readonly Client[],
    name: string,
  ): Promise<Client> {
    const client = join(name).startRound();

    const participants = present.length + 1;
    await client.expectParticipants(participants);
    await client.expectStatuses("local training");
    for (const other of present) await other.expectParticipants(participants);

    return client;
  }

  /**
   * A client leaving a session which keeps enough participants: the others
   * carry on, one fewer.
   */
  async function leavesSession(
    leaving: Client,
    remaining: readonly Client[],
  ): Promise<void> {
    await leaving.leave();

    for (const other of remaining)
      await other.expectParticipants(remaining.length);
  }

  /** A client leaving, the remaining one is left without enough participants */
  async function leavesTask(leaving: Client, remaining: Client): Promise<void> {
    await leaving.leave();

    // the remaining client receives the WaitingForMoreParticipants message
    await remaining.expectStatuses("not enough participants");
    await remaining.expectParticipants(1);
  }

  /** A client starting a round while it knows it is the only participant */
  async function startsRoundAlone(client: Client): Promise<void> {
    client.startRound();

    // it trains, then waits in c) for another participant
    await client.expectStatuses("local training", "not enough participants");
  }

  it("a client joining alone trains then waits for a participant", async () => {
    await joinsAlone("user 1");
  });

  it("a joining client completes the round of the waiting one", async () => {
    const user1 = await joinsAlone("user 1");

    await joinsWaitingClient(user1, "user 2");
  });

  it("a round runs the whole cycle when both clients are present", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");

    await runFullRound(user1, user2);
  });

  it("a client is notified when a participant leaves", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");

    await leavesTask(user1, user2);
  });

  it("a client left alone trains but waits to share its update", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");
    await leavesTask(user1, user2);

    await startsRoundAlone(user2);
  });

  it("clients are notified when a participant joins", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");

    // the minimum is already met so user 3 changes nothing but the count,
    // which the others would otherwise only learn when a round of theirs
    // completes, if one ever does
    await joinsSession([user1, user2], "user 3");
  });

  it("clients are notified when a participant leaves", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");
    const user3 = await joinsSession([user1, user2], "user 3");

    // the remaining two still have enough participants to carry on
    await leavesSession(user3, [user1, user2]);
  });

  it("a client joining mid-training completes the pending round", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingClient(user1, "user 2");
    await leavesTask(user1, user2);
    await startsRoundAlone(user2);

    // the server should accept user 3's weights (they should not be
    // outdated) and aggregate them with user 2's pending round
    await joinsWaitingClient(user2, "user 3");
  });
});
