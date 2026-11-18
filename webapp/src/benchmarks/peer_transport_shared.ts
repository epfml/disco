import "@/buffer-polyfill";
import {
  Dataset,
  modelDecode,
  weightsEncode,
  weightsDecode,
} from "@epfml/discojs";
import type { DataFormat, Model, PeerTransport } from "@epfml/discojs";
import { List } from "immutable";
import * as tf from "@tensorflow/tfjs";

export type Mode =
  | "direct"
  | "transfer"
  | "copy-transfer"
  | "clone"
  | "bridge"
  | "webrtc-direct"
  | "webrtc-bridge";
export interface Case {
  mode: Mode;
  peers: number;
  bytes: number;
  iterations: number;
  warmup: number;
  kind: "payload" | "training";
  model?: Uint8Array;
}
export interface Measurement {
  elapsedMs: number;
  latenciesMs: number[];
  logicalBytes: number;
  trainingMs: number;
  encodingMs: number;
  applyingMs: number;
}
export interface Driver {
  exchange(data: Uint8Array, peer: number): Promise<Uint8Array>;
  close(): Promise<void>;
}

export function withDeadline<T>(
  promise: Promise<T>,
  label: string,
  milliseconds = 120_000,
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out: ${label}`)),
      milliseconds,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error) => {
        clearTimeout(timer);
        reject(error instanceof Error ? error : new Error(String(error)));
      },
    );
  });
}

export async function peerDriver(peers: PeerTransport[]): Promise<Driver> {
  const pending = new Map<
    number,
    { resolve: (data: Uint8Array) => void; reject: (error: Error) => void }
  >();
  await withDeadline(
    Promise.all(
      peers.map(
        (peer, index) =>
          new Promise<void>((resolve, reject) => {
            peer.on("connect", resolve);
            peer.on("error", (error) => {
              reject(error);
              pending.get(index)?.reject(error);
            });
            peer.on("data", (data) => {
              const request = pending.get(index);
              if (request === undefined)
                throw new Error("Unsolicited benchmark reply");
              pending.delete(index);
              request.resolve(data);
            });
          }),
      ),
    ),
    "peer connection",
    15_000,
  );
  return {
    exchange: (data, index) =>
      new Promise((resolve, reject) => {
        if (pending.has(index))
          throw new Error("Only one outstanding message per peer is allowed");
        pending.set(index, { resolve, reject });
        peers[index].send(data);
      }),
    close: async () => {
      await Promise.all(
        peers.map(async (peer) => {
          await peer.drain();
          await peer.destroy();
        }),
      );
    },
  };
}

export async function measure(
  config: Case,
  driver: Driver,
): Promise<Measurement> {
  const result: Measurement = {
    elapsedMs: 0,
    latenciesMs: [],
    logicalBytes: 0,
    trainingMs: 0,
    encodingMs: 0,
    applyingMs: 0,
  };
  let model: Model<"tabular"> | undefined;
  // Each case starts from the same serialized model; setup is outside the timer.
  if (config.kind === "training") {
    await tf.setBackend("cpu");
    await tf.ready();
    if (config.model === undefined)
      throw new Error("Missing initial training model");
    model = (await modelDecode(config.model)) as Model<"tabular">;
  }
  const dataset = new Dataset(
    Array.from(
      { length: 128 },
      (_, row): DataFormat.ModelEncoded["tabular"] => [
        List(
          Array.from(
            { length: 11 },
            (_, column) => ((row * 17 + column * 13) % 101) / 100,
          ),
        ),
        row % 2,
      ],
    ),
  ).batch(32);
  let buffers: Uint8Array[] = Array.from({ length: config.peers }, () =>
    new Uint8Array(config.bytes).fill(0x5a),
  );
  try {
    // Payload warmup uses the same path and buffer sizes. Training kernel warmup
    // uses a separate unmeasured model instance in the runner.
    for (
      let iteration = -config.warmup;
      iteration < config.iterations;
      iteration++
    ) {
      if (iteration === 0) result.elapsedMs = performance.now();
      if (model !== undefined) {
        let start = performance.now();
        for await (const log of model.train(dataset)) {
          if (!Number.isFinite(log.loss))
            throw new Error("Training produced a non-finite loss");
        }
        if (iteration >= 0) result.trainingMs += performance.now() - start;
        start = performance.now();
        const encoded = await weightsEncode(model.weights);
        if (iteration >= 0) result.encodingMs += performance.now() - start;
        buffers = Array.from({ length: config.peers }, () => encoded);
      }
      const replies = await Promise.all(
        buffers.map(async (buffer, peer) => {
          // Payload probes detect truncation, stale messages and peer mixups.
          if (model === undefined) {
            buffer[0] = peer;
            buffer[1] = (iteration + config.warmup) % 256;
          }
          const expected = [
            buffer.byteLength,
            buffer[0],
            buffer[1],
            buffer[Math.floor(buffer.length / 2)],
            buffer.at(-1),
          ];
          const start = performance.now();
          const reply = await driver.exchange(buffer, peer);
          const duration = performance.now() - start;
          if (
            reply.byteLength !== expected[0] ||
            reply[0] !== expected[1] ||
            reply[1] !== expected[2] ||
            reply[Math.floor(reply.length / 2)] !== expected[3] ||
            reply.at(-1) !== expected[4]
          )
            throw new Error("Corrupted benchmark payload");
          if (iteration >= 0) {
            result.latenciesMs.push(duration);
            result.logicalBytes += 2 * reply.byteLength;
          }
          return reply;
        }),
      );
      // Recycle the owned buffer for the zero-copy diagnostic control.
      if (config.mode === "transfer") buffers = replies;
      if (model !== undefined) {
        const start = performance.now();
        const weights = weightsDecode(replies[0]);
        try {
          model.weights = weights;
        } finally {
          weights.dispose();
        }
        if (iteration >= 0) result.applyingMs += performance.now() - start;
      }
    }
    result.elapsedMs = performance.now() - result.elapsedMs;
    return result;
  } finally {
    model?.dispose();
    await driver.close();
  }
}
