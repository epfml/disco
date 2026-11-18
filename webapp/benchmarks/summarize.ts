import { readFileSync } from "node:fs";

// The report is a JSON artifact, deliberately independent of the app's TS project.
interface Row {
  mode: string;
  kind: string;
  bytes: number;
  peers: number;
  iterations: number;
  repetition: number;
  elapsedMs: number;
  latenciesMs: number[];
  logicalBytes: number;
  maxTimerLagMs: number;
  longestTaskMs: number;
  trainingMs: number;
  encodingMs: number;
  applyingMs: number;
}
const filename = process.argv[2] ?? "benchmarks/results/latest.json";
const report = JSON.parse(readFileSync(filename, "utf8")) as {
  rows: Row[];
  userAgent: string;
  hardwareConcurrency: number;
  startedAt: string;
  environment?: Record<string, unknown>;
};
if (!Array.isArray(report.rows) || report.rows.length === 0)
  throw new Error("No benchmark rows found");
const percentile = (values: number[], fraction: number): number => {
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * fraction;
  const low = Math.floor(index);
  return sorted[low] + (sorted[Math.ceil(index)] - sorted[low]) * (index - low);
};
const groups = new Map<string, Row[]>();
for (const row of report.rows) {
  const key = `${row.kind}:${row.bytes}:${row.peers}:${row.mode}`;
  const group = groups.get(key) ?? [];
  group.push(row);
  groups.set(key, group);
}
if (report.environment !== undefined)
  console.log(JSON.stringify(report.environment, null, 2));
console.log(
  `Started: ${report.startedAt}\nBrowser: ${report.userAgent}\nLogical CPUs reported by browser: ${report.hardwareConcurrency}\n`,
);
console.log(
  "RTT includes both directions. MiB/s counts logical payload bytes in both directions.",
);
console.log(
  "Page lag is the median of per-case maximum 5 ms timer delays; it includes setup/warmup/cleanup.\n",
);
console.log(
  "| Workload | Payload MiB | Peers | Mode | RTT p50 ms | RTT p95 ms | MiB/s | Page lag ms | Longest task ms |",
);
console.log("|---|---:|---:|---|---:|---:|---:|---:|---:|");
for (const group of groups.values()) {
  const first = group[0];
  const values = group.flatMap((row) => row.latenciesMs);
  const throughput =
    first.mode === "direct"
      ? "—"
      : percentile(
          group.map(
            (row) => row.logicalBytes / 2 ** 20 / (row.elapsedMs / 1000),
          ),
          0.5,
        ).toFixed(1);
  const lag = percentile(
    group.map((row) => row.maxTimerLagMs),
    0.5,
  ).toFixed(1);
  const longest = Math.max(...group.map((row) => row.longestTaskMs)).toFixed(1);
  console.log(
    `| ${first.kind} | ${(first.bytes / 2 ** 20).toFixed(4)} | ${first.peers} | ${first.mode} | ${percentile(values, 0.5).toFixed(3)} | ${percentile(values, 0.95).toFixed(3)} | ${throughput} | ${lag} | ${longest} |`,
  );
}
console.log(
  "\nTraining workload, median milliseconds per round (training / encoding / exchange RTT / applying / total):",
);
for (const group of groups.values()) {
  if (group[0].kind !== "training") continue;
  const phase = (
    name: "trainingMs" | "encodingMs" | "applyingMs" | "elapsedMs",
  ) =>
    percentile(
      group.map((row) => row[name] / row.iterations),
      0.5,
    ).toFixed(3);
  console.log(
    `${group[0].mode}: ${phase("trainingMs")} / ${phase("encodingMs")} / ${percentile(
      group.flatMap((row) => row.latenciesMs),
      0.5,
    ).toFixed(3)} / ${phase("applyingMs")} / ${phase("elapsedMs")}`,
  );
}
