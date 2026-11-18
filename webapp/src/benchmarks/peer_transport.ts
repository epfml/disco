import "@/buffer-polyfill";
import { EventEmitter, Peer, defaultTasks, modelEncode } from "@epfml/discojs";
import type {
  PeerEvents,
  PeerTransport,
  PeerFactory,
  NodeID,
} from "@epfml/discojs";
import { servePeerTransport } from "../components/training/peer_transport";
import { measure, peerDriver, withDeadline } from "./peer_transport_shared";
import type { Case, Measurement, Mode } from "./peer_transport_shared";

class EchoPeer extends EventEmitter<PeerEvents> implements PeerTransport {
  constructor() {
    super();
    queueMicrotask(() => this.emit("connect", undefined));
  }
  signal = () => undefined;
  send(data: Uint8Array): void {
    queueMicrotask(() => this.emit("data", data));
  }
  drain = () => Promise.resolve();
  destroy(): Promise<void> {
    this.emit("close", undefined);
    return Promise.resolve();
  }
}

interface PageMetrics {
  timerTicks: number;
  maxTimerLagMs: number;
  longTasks: number;
  longestTaskMs: number;
}
export interface Row extends Measurement, PageMetrics {
  mode: Mode;
  kind: Case["kind"];
  bytes: number;
  peers: number;
  iterations: number;
  repetition: number;
}
export interface Report {
  userAgent: string;
  hardwareConcurrency: number;
  timerIntervalMs: number;
  startedAt: string;
  repetitions: number;
  rows: Row[];
}

function pageProbe(): { finish: () => Promise<PageMetrics> } {
  const result: PageMetrics = {
    timerTicks: 0,
    maxTimerLagMs: 0,
    longTasks: 0,
    longestTaskMs: 0,
  };
  let expected = performance.now() + 5;
  const timer = setInterval(() => {
    const now = performance.now();
    result.timerTicks++;
    result.maxTimerLagMs = Math.max(result.maxTimerLagMs, now - expected);
    expected = now + 5;
  }, 5);
  const consume = (entries: PerformanceEntry[]) => {
    for (const entry of entries) {
      result.longTasks++;
      result.longestTaskMs = Math.max(result.longestTaskMs, entry.duration);
    }
  };
  const observer = PerformanceObserver.supportedEntryTypes.includes("longtask")
    ? new PerformanceObserver((list) => consume(list.getEntries()))
    : undefined;
  observer?.observe({ entryTypes: ["longtask"] });
  return {
    finish: async () => {
      // Allow the timer and observer to report stalls spanning the final operation.
      await new Promise((resolve) => setTimeout(resolve, 10));
      clearInterval(timer);
      if (observer !== undefined) {
        consume(observer.takeRecords());
        observer.disconnect();
      }
      return result;
    },
  };
}

function loopbackFactory(owned: Peer[]): PeerFactory {
  return (id) => {
    const local = new Peer(id, true);
    const remote = new Peer(id, false);
    owned.push(local, remote);
    local.on("signal", (signal) => remote.signal(signal));
    remote.on("signal", (signal) => local.signal(signal));
    remote.on("data", (data) => remote.send(data));
    return local;
  };
}

async function runCase(
  worker: Worker,
  config: Case,
): Promise<Measurement & PageMetrics> {
  const owned: Peer[] = [];
  const factory: PeerFactory = config.mode.startsWith("webrtc")
    ? loopbackFactory(owned)
    : () => new EchoPeer();
  let close: (() => void) | undefined;
  let probe: ReturnType<typeof pageProbe> | undefined = pageProbe();
  try {
    let result: Measurement;
    if (config.mode === "direct" || config.mode === "webrtc-direct") {
      const driver = await peerDriver(
        Array.from({ length: config.peers }, (_, index) =>
          factory(`${index}` as NodeID, true),
        ),
      );
      result = await withDeadline(measure(config, driver), config.mode);
    } else {
      const channel = new MessageChannel();
      if (config.mode === "bridge" || config.mode === "webrtc-bridge")
        close = servePeerTransport(channel.port1, factory);
      else {
        channel.port1.onmessage = ({
          data,
        }: MessageEvent<{ peer: number; bytes: Uint8Array }>) => {
          const bytes =
            config.mode === "copy-transfer"
              ? Uint8Array.from(data.bytes)
              : data.bytes;
          channel.port1.postMessage(
            { peer: data.peer, bytes },
            config.mode === "clone" ? [] : [bytes.buffer],
          );
        };
        close = () => channel.port1.close();
      }
      // A control message starts one case. The measured payload path uses only
      // this MessagePort, including production workerPeerFactory/servePeerTransport.
      result = await new Promise<Measurement>((resolve, reject) => {
        const timeout = setTimeout(
          () => reject(new Error(`Timed out: ${config.mode}`)),
          120_000,
        );
        worker.onmessage = ({
          data,
        }: MessageEvent<{ result?: Measurement; error?: string }>) => {
          clearTimeout(timeout);
          if (data.error !== undefined) reject(new Error(data.error));
          else if (data.result !== undefined) resolve(data.result);
          else reject(new Error("Invalid worker response"));
        };
        worker.onerror = (event) => {
          clearTimeout(timeout);
          reject(new Error(event.message));
        };
        worker.postMessage({ ...config, port: channel.port2 }, [channel.port2]);
      });
    }
    const metrics = await probe.finish();
    probe = undefined;
    return { ...result, ...metrics };
  } finally {
    await probe?.finish();
    close?.();
    await Promise.all(owned.map((peer) => peer.destroy()));
  }
}

export async function runPeerTransportBenchmark(): Promise<Report> {
  const worker = new Worker(
    new URL("./peer_transport.worker.ts", import.meta.url),
    { type: "module" },
  );
  const report: Report = {
    userAgent: navigator.userAgent,
    hardwareConcurrency: navigator.hardwareConcurrency,
    timerIntervalMs: 5,
    startedAt: new Date().toISOString(),
    repetitions: 3,
    rows: [],
  };
  const progress = document.getElementById("progress");
  try {
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(
        () => reject(new Error("Benchmark worker did not initialize")),
        60_000,
      );
      worker.onmessage = ({ data }: MessageEvent<{ ready?: boolean }>) => {
        if (data.ready) {
          clearTimeout(timeout);
          resolve();
        }
      };
      worker.onerror = (event) => {
        clearTimeout(timeout);
        reject(new Error(event.message));
      };
    });
    const modes: Mode[] = [
      "direct",
      "transfer",
      "copy-transfer",
      "clone",
      "bridge",
      "webrtc-direct",
      "webrtc-bridge",
    ];
    const cases: Case[] = [];
    for (const bytes of [
      1024,
      64 * 1024,
      1024 * 1024,
      16 * 1024 * 1024,
      64 * 1024 * 1024,
    ])
      for (const peers of [1, 4]) {
        if (bytes * peers > 64 * 1024 * 1024) continue;
        for (const mode of modes)
          cases.push({
            mode,
            bytes,
            peers,
            iterations: Math.max(
              6,
              Math.min(60, Math.ceil((32 * 1024 * 1024) / bytes / peers)),
            ),
            warmup: 2,
            kind: "payload",
          });
      }
    const initial = await defaultTasks.titanic.modelCard.getModel();
    let encoded: Uint8Array;
    try {
      encoded = await modelEncode(initial);
    } finally {
      initial.dispose();
    }
    for (const mode of ["webrtc-direct", "webrtc-bridge"] as const) {
      // Exercise training once before recording comparisons (kernel/JIT warmup).
      await runCase(worker, {
        mode,
        bytes: 1,
        peers: 1,
        iterations: 1,
        warmup: 0,
        kind: "training",
        model: encoded,
      });
      cases.push({
        mode,
        bytes: 1,
        peers: 1,
        iterations: 5,
        warmup: 0,
        kind: "training",
        model: encoded,
      });
    }
    for (let repetition = 0; repetition < report.repetitions; repetition++) {
      // Rotate/reverse the order to avoid always favoring the first path.
      const ordered = repetition % 2 === 0 ? [...cases] : [...cases].reverse();
      if (repetition === 2)
        ordered.push(...ordered.splice(0, Math.floor(ordered.length / 2)));
      for (const config of ordered) {
        if (progress !== null)
          progress.textContent = `Repetition ${repetition + 1}/${report.repetitions}: ${config.kind} ${config.mode}, ${config.bytes} bytes × ${config.peers} peers`;
        const result = await runCase(worker, config);
        report.rows.push({
          ...result,
          mode: config.mode,
          kind: config.kind,
          bytes: result.logicalBytes / (2 * config.iterations * config.peers),
          peers: config.peers,
          iterations: config.iterations,
          repetition,
        });
        // Let UI work and pending collection proceed between measured cases.
        await new Promise((resolve) => setTimeout(resolve, 20));
      }
    }
    if (progress !== null)
      progress.textContent = JSON.stringify(report, null, 2);
    return report;
  } finally {
    worker.terminate();
  }
}

declare global {
  interface Window {
    runPeerTransportBenchmark: typeof runPeerTransportBenchmark;
  }
}
window.runPeerTransportBenchmark = runPeerTransportBenchmark;
document.getElementById("progress")?.replaceChildren("Benchmark ready");
