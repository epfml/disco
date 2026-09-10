import type {
  DataFormat,
  DataType,
  Dataset,
  Network,
  RoundLogs,
  RoundStatus,
  Task,
} from "@epfml/discojs";
import { Disco, WeightsContainer } from "@epfml/discojs";
import { List } from "immutable";
import { expect } from "vitest";

import { Queue } from "../utils.js";

// Array.fromAsync not yet widely used (2024)
export async function arrayFromAsync<T>(iter: AsyncIterable<T>): Promise<T[]> {
  const ret: T[] = [];
  for await (const e of iter) {
    // TODO trick to allow other Promises to run
    // else one client might progress alone without communicating with others
    // will be fixed when client orchestrations in the server is correctly done
    await new Promise((resolve) => setTimeout(resolve, 10));

    ret.push(e);
  }
  return ret;
}

async function WSIntoList(ws: WeightsContainer): Promise<List<List<number>>> {
  return List(
    (await Promise.all(ws.weights.map(async (w) => await w.data()))).map(
      (arr) => List(arr),
    ),
  );
}

export async function expectWSToBeClose(
  left: WeightsContainer,
  right: WeightsContainer,
): Promise<void> {
  for (const tensors of (await WSIntoList(left)).zip(await WSIntoList(right)))
    for (const [l, r] of tensors[0].zip(tensors[1]))
      expect(l).to.be.closeTo(r, 1e-4);
}

/** Every given model should be close to the first one */
export async function expectAllWSToBeClose(
  ...weights: readonly WeightsContainer[]
): Promise<void> {
  const [reference, ...others] = weights;

  await Promise.all(
    others.map(async (current) => await expectWSToBeClose(reference, current)),
  );
}

/** The models a participant held at round boundaries */
export interface ModelRecording {
  /** Every recorded model, oldest first. Only the last one with `keep: "latest"`. */
  all: () => readonly WeightsContainer[];
  /** The most recently recorded model, throws if there is none yet. */
  latest: () => WeightsContainer;
  /** Release every recorded model */
  dispose: () => void;
}

/**
 * Records the model a peer holds at each round boundary: once
 * onRoundEndCommunication has returned and before the next local round trains
 * on it. Peers hold the very same model at those points, whereas
 * `trainer.model.weights` read afterwards also contains each peer's own local
 * training, which is not reproducible across peers.
 *
 * Pass `keep: "latest"` in the tests measuring tensor memory so that the
 * recorded models don't grow with the number of rounds.
 */
export function recordModelsAtRoundBoundary<
  D extends DataType,
  N extends Network,
>(
  disco: Disco<D, N>,
  { keep = "all" }: { keep?: "all" | "latest" } = {},
): ModelRecording {
  const models: WeightsContainer[] = [];

  disco.on("status", (status) => {
    if (status !== "local training") return;
    if (keep === "latest") models.splice(0).forEach((m) => m.dispose());
    models.push(
      new WeightsContainer(
        disco.trainer.model.weights.weights.map((w) => w.clone()),
      ),
    );
  });

  return {
    all: () => models,
    latest: () => {
      const model = models.at(-1);
      if (model === undefined)
        throw new Error("the peer hasn't reached a round boundary yet");
      return model;
    },
    dispose: () => models.splice(0).forEach((m) => m.dispose()),
  };
}

/** The peers should hold the same model at their latest round boundary */
export async function expectPeersToAgreeOnModel(
  ...recordings: readonly Pick<ModelRecording, "latest">[]
): Promise<void> {
  const [first, ...others] = recordings;
  for (const other of others)
    await expectWSToBeClose(first.latest(), other.latest());
}

/**
 * A client taking part in a task, with the events it emits recorded so that a
 * test can assert them in the order they were emitted.
 *
 * Rounds are driven in two steps because a single call to
 * `trainByRound().next()` performs a whole round and only resolves once the
 * other participants completed theirs: {@link startRound} kicks a round off and
 * {@link completeRound} awaits it. A test can therefore assert the events
 * emitted while a round is still in flight, which is how a participant waiting
 * for others is observed.
 */
export class Participant<D extends DataType, N extends Network> {
  readonly disco: Disco<D, N>;
  /** The models held at round boundaries, only the latest one is kept */
  readonly modelsAtRoundBoundary: ModelRecording;

  readonly #name: string;
  readonly #rounds: AsyncGenerator<RoundLogs>;
  readonly #statuses = new Queue<RoundStatus>();
  readonly #participants = new Queue<number>();
  readonly #syncedModel: Promise<WeightsContainer>;

  #pendingRound: Promise<IteratorResult<RoundLogs>> | undefined;
  #left = false;

  constructor(
    name: string,
    task: Task<D, N>,
    url: URL,
    dataset: Dataset<DataFormat.Raw[D]>,
  ) {
    this.#name = name;
    this.disco = new Disco(task, url, {
      preprocessOnce: true,
      debugLabel: name,
    });

    this.disco.on("status", (status) => this.#statuses.put(status));
    this.disco.on("participants", (participants) =>
      this.#participants.put(participants),
    );
    this.#syncedModel = new Promise((resolve) =>
      this.disco.on("modelSynced", (weights) => {
        if (weights !== undefined) resolve(weights);
      }),
    );

    this.modelsAtRoundBoundary = recordModelsAtRoundBoundary(this.disco, {
      keep: "latest",
    });
    this.#rounds = this.disco.trainByRound(dataset);
  }

  /** Start a round without waiting for it to complete */
  startRound(): this {
    if (this.#pendingRound !== undefined)
      throw new Error(`${this.#name} is already running a round`);

    const round = this.#rounds.next();
    // a round can stay pending forever, e.g. when the participant ends up
    // alone, and leaving the task then rejects it: never let that surface as
    // an unhandled rejection
    round.catch(() => undefined);
    this.#pendingRound = round;

    return this;
  }

  /** Wait for the current round, starting one if none is running */
  async completeRound(): Promise<RoundLogs> {
    if (this.#pendingRound === undefined) this.startRound();
    const pending = this.#pendingRound;
    if (pending === undefined) throw new Error("unreachable");

    const round = await pending;
    this.#pendingRound = undefined;

    if (round.done)
      throw new Error(`${this.#name} stopped training earlier than expected`);

    return round.value;
  }

  /** Assert the next emitted statuses, in order */
  async expectStatuses(...expected: readonly RoundStatus[]): Promise<void> {
    for (const status of expected)
      expect(await this.#statuses.next(), `${this.#name} status`).to.equal(
        status,
      );
  }

  /** Assert the next emitted participant counts, in order */
  async expectParticipants(...expected: readonly number[]): Promise<void> {
    for (const count of expected)
      expect(
        await this.#participants.next(),
        `${this.#name} participants`,
      ).to.equal(count);
  }

  /**
   * The model the participant synced with when joining mid-training,
   * only resolves for a participant which joined an ongoing session.
   */
  syncedModel(): Promise<WeightsContainer> {
    return this.#syncedModel;
  }

  /** Leave the task, releasing everything the participant holds */
  async leave(): Promise<void> {
    if (this.#left) return;
    this.#left = true;

    try {
      await this.disco.close();
    } finally {
      this.modelsAtRoundBoundary.dispose();
    }
  }
}
