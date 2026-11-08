import type { DataFormat, Dataset, RoundStatus, Task } from "@epfml/discojs";
import { defaultModels } from "@epfml/discojs";
import { afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { datasets } from "../../utils.js";
import {
  Participant,
  expectPeersToAgreeOnModel,
  expectWSToBeClose,
  lusCovidDecentralized,
  startServer,
} from "../helpers.js";

/**
 * At each round (each call to `disco.trainByRound().next()`) the event cycle is:
 * a) During onRoundBeginCommunication,
 *   1. a peer that joined mid-training syncs its model with the latest one
 *   2. the peer notifies the server that they want to join the next round
 *   3. the peer waits until there are enough participants, setting the status
 *      to "not enough participants" while it does
 *   4. finishes by updating the status to "local training"
 * b) local training (the status remains "local training")
 * c) During onRoundEndCommunication
 *   1. the peer sets its status to "waiting for peers to share weights"
 *      and notifies the server that they are ready to share weights
 *   2. wait for the server to answer with the current round's peers list
 *      this is where the nb of participants is updated
 *   3. set status to "connecting to peers" and establish the connections
 *   4. set status to "updating model" and exchange weight updates
 *
 * A single call to next() performs a full round: a), b) and c). It only
 * resolves once the peers exchanged their weight updates, so a call made
 * while the round can't complete stays pending. `Participant` therefore
 * splits a round in `startRound()` and `completeRound()`, so that the tests
 * can choreograph through the status and participants events instead of
 * awaiting a round right away.
 * Note that RoundLogs.participants is the count seen at the end of local
 * training, before the weight exchange.
 *
 * Every step of that choreography is a named function below asserting the
 * events it expects. Each test then plays the steps leading to the one it
 * covers and ends with that step, which keeps a failure pointing at a single
 * step of the timeline. Put end to end, the steps make up the timeline:
 * - User 1 joins the task
 * - User 2 joins
 * - User 2 leaves (Since minNbOfParticipants condition is not satisfied, the training stops)
 * - User 3 joins (User 3 gets the latest model from User 1 and start local training from that model)
 */
describe("emit expected events", { timeout: 150_000 }, () => {
  type Peer = Participant<"image", "decentralized">;

  /** Statuses a peer goes through in c), once it is done training */
  const SHARES_WEIGHTS: readonly RoundStatus[] = [
    "waiting for peers to share weights",
    "connecting to peers",
    "updating model",
  ];
  /** Statuses a peer goes through during a round it can complete */
  const FULL_ROUND: readonly RoundStatus[] = [
    "local training",
    ...SHARES_WEIGHTS,
  ];

  let task: Task<"image", "decentralized">;
  let url: URL;
  let dataset: Dataset<DataFormat.Raw["image"]>;
  const joined: Peer[] = [];

  beforeAll(async () => {
    dataset = await datasets.loadLusCOVID();
  });

  beforeEach(async () => {
    const decentralized = await lusCovidDecentralized();
    task = decentralized.task;
    url = await startServer(
      defaultModels.LUSClassifier,
      decentralized.taskProvider,
    );
  });

  afterEach(async () => {
    await Promise.all(joined.splice(0).map(async (p) => await p.leave()));
  });

  /** Have a new peer join the task, closed at the end of the test */
  function join(name: string): Peer {
    const peer = new Participant(name, task, url, dataset);
    joined.push(peer);
    return peer;
  }

  /**
   * A peer joining a task nobody else is on: it waits in a) and doesn't even
   * start training, so its round can't complete.
   */
  async function joinsAlone(name: string): Promise<Peer> {
    const peer = join(name).startRound();

    await peer.expectStatuses("not enough participants");
    await peer.expectParticipants(1);

    return peer;
  }

  /** A peer joining a waiting one, releasing it from a) so that both train */
  async function joinsWaitingPeer(waiting: Peer, name: string): Promise<Peer> {
    const peer = join(name).startRound();

    // the newcomer has enough participants right away and goes to b)
    await peer.expectStatuses("local training");
    // the waiting peer is released from a) and trains too
    await waiting.expectParticipants(2);
    await waiting.expectStatuses("local training");
    await peer.expectParticipants(2);

    return peer;
  }

  /**
   * Complete the round every peer started, expecting each of them to go
   * through the given statuses and to have seen every other peer.
   */
  async function completesRound(
    peers: readonly Peer[],
    statuses: readonly RoundStatus[],
  ): Promise<void> {
    const logs = await Promise.all(
      peers.map(async (peer) => await peer.completeRound()),
    );
    for (const log of logs) expect(log.participants).equal(peers.length);

    for (const peer of peers) await peer.expectStatuses(...statuses);
    // receiving the round's peers list updates the participants
    for (const peer of peers) await peer.expectParticipants(peers.length);
  }

  /** Peers done with their local training exchange their weight updates */
  const exchangesWeights = (...peers: readonly Peer[]) =>
    completesRound(peers, SHARES_WEIGHTS);

  /** A round during which every peer is present, so a), b) and c) run */
  const runsFullRound = (...peers: readonly Peer[]) =>
    completesRound(peers, FULL_ROUND);

  /** A peer starting a round which it can't complete on its own */
  async function startsRoundAndWaitsForWeights(peer: Peer): Promise<void> {
    peer.startRound();

    // the peer trains and then enters c). It cannot reach "connecting to
    // peers" yet: that only happens once the server answers with the round's
    // peers list
    await peer.expectStatuses(
      "local training",
      "waiting for peers to share weights",
    );
  }

  /** A peer leaving, dropping the remaining one below minNbOfParticipants */
  async function leavesTask(leaving: Peer, remaining: Peer): Promise<void> {
    await leaving.leave();

    await remaining.expectParticipants(1);
    await remaining.expectStatuses("not enough participants");
  }

  /** A newcomer joining a peer which is stuck in c) waiting for weights */
  async function joinsPeerWaitingForWeights(
    waiting: Peer,
    name: string,
  ): Promise<Peer> {
    const peer = join(name).startRound();

    await peer.expectParticipants(2);
    // the newcomer syncs its model in a) then trains
    await peer.expectStatuses("local training");
    // the waiting peer learns the newcomer joined and is still in c) waiting
    // for it to be ready, so it rolls back to the status it had before
    // waiting for more participants
    await waiting.expectParticipants(2);
    await waiting.expectStatuses("waiting for peers to share weights");

    return peer;
  }

  /** The waiting peer and the newcomer exchange their weight updates */
  async function exchangesWeightsWithNewcomer(
    waiting: Peer,
    newcomer: Peer,
  ): Promise<void> {
    const logs = await Promise.all([
      waiting.completeRound(),
      newcomer.completeRound(),
    ]);
    // both trained while two participants were around: the waiting peer
    // before the other one left, the newcomer after it joined
    for (const log of logs) expect(log.participants).equal(2);

    // the waiting peer already announced it was waiting for weights
    await waiting.expectStatuses("connecting to peers", "updating model");
    await waiting.expectParticipants(2);
    await newcomer.expectStatuses(...SHARES_WEIGHTS);
    await newcomer.expectParticipants(2);
  }

  it("a peer joining alone waits for a second participant", async () => {
    await joinsAlone("user 1");
  });

  it("a joining peer lets both of them train", async () => {
    const user1 = await joinsAlone("user 1");

    await joinsWaitingPeer(user1, "user 2");
  });

  it("peers exchange their weights at the end of the round", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingPeer(user1, "user 2");

    await exchangesWeights(user1, user2);
  });

  // regression test, peer used to display missing participants when
  // it was not the case
  it("doesn't report missing participants while a peer trains", async () => {
    const user1 = await joinsAlone("user 1");
    await joinsWaitingPeer(user1, "user 2");

    // user 1 is done training first and has to wait for user 2 to be ready,
    // but shouldn't be told that participants are missing: user 2 is here,
    // only still training. The status following "local training" must go
    // straight to the weight exchange.
    await user1.expectStatuses("waiting for peers to share weights");
  });

  it("a round runs the whole cycle when both peers are present", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingPeer(user1, "user 2");
    await exchangesWeights(user1, user2);

    await runsFullRound(user1, user2);

    // weights should have converged after exchanging updates
    await expectPeersToAgreeOnModel(
      user1.modelsAtRoundBoundary,
      user2.modelsAtRoundBoundary,
    );
  });

  it("a peer waiting for weights is told when the other leaves", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingPeer(user1, "user 2");
    await exchangesWeights(user1, user2);
    await startsRoundAndWaitsForWeights(user1);

    await leavesTask(user2, user1);
  });

  it("a peer joining mid-training syncs the latest model", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingPeer(user1, "user 2");
    await exchangesWeights(user1, user2);
    await startsRoundAndWaitsForWeights(user1);
    await leavesTask(user2, user1);

    const user3 = await joinsPeerWaitingForWeights(user1, "user 3");

    // user 3's model should have been synced to the latest global model,
    // i.e. the result of user 1 and user 2's last aggregation. User 1 hasn't
    // completed a new round, so that is still its latest round boundary.
    await expectWSToBeClose(
      await user3.syncedModel(),
      user1.modelsAtRoundBoundary.latest(),
    );

    // the server should accept user 3's weights (they should not be
    // outdated) and let both peers complete their round
    await exchangesWeightsWithNewcomer(user1, user3);
  });

  it("a peer which joined mid-training then runs full rounds", async () => {
    const user1 = await joinsAlone("user 1");
    const user2 = await joinsWaitingPeer(user1, "user 2");
    await exchangesWeights(user1, user2);
    await startsRoundAndWaitsForWeights(user1);
    await leavesTask(user2, user1);
    const user3 = await joinsPeerWaitingForWeights(user1, "user 3");
    await exchangesWeightsWithNewcomer(user1, user3);

    await runsFullRound(user1, user3);

    // weights should have converged between user 1 and user 3 too
    await expectPeersToAgreeOnModel(
      user1.modelsAtRoundBoundary,
      user3.modelsAtRoundBoundary,
    );
  });
});
