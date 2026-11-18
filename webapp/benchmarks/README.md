# Worker peer transport benchmark

This benchmark measures the production `workerPeerFactory` and
`servePeerTransport` adapter with a real dedicated Web Worker. It runs outside the
normal app and is excluded from regular Cypress tests. There are no performance
thresholds in CI.

Run from the repository root with Chrome installed:

```sh
pnpm install --frozen-lockfile
pnpm -F webapp benchmark:peer-transport
pnpm -F webapp benchmark:peer-transport:summary
```

Results are written to `webapp/benchmarks/results/latest.json`, which is ignored
by Git. Reports include CPU, OS, memory capacity, Node/browser versions, and the
checked-out Git revision. Memory capacity is metadata, not a peak-memory measurement.
The summary command also accepts a report filename. For a custom browser
binary, start Vite in `webapp` and run Cypress separately:

```sh
pnpm exec vite --mode test --port 1351 --strictPort
# In another terminal, also in webapp:
DISCO_PEER_BENCHMARK=1 pnpm exec cypress run --e2e --headless \
  --browser /path/to/chrome --spec cypress/e2e/benchmarks/peer_transport.cy.ts
```

Wait for builds, lint and other CPU-intensive jobs to finish before collecting
results. Record browser version, CPU model, OS, power mode and browser flags when
sharing results. Background applications and Cypress itself can add noise.

## Cases

| Mode            | What is measured                                                                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `direct`        | A page-local asynchronous echo peer, with no payload copy. This is the latency floor, not a network or memory-bandwidth measurement.                               |
| `transfer`      | Raw page/worker MessagePort echo, transferring and recycling the owned buffer. This diagnostic permits detachment and cannot replace the production API unchanged. |
| `copy-transfer` | The same raw echo, copying into a new owned array before each transfer in both directions.                                                                         |
| `clone`         | The same raw echo using structured cloning in both directions.                                                                                                     |
| `bridge`        | The unmodified production peer adapter, backed by the page-local echo peer. It copies into owned buffers before transferring them.                                 |
| `webrtc-direct` | Page-local caller and a pair of real production WebRTC peers connected over local host candidates.                                                                 |
| `webrtc-bridge` | Worker caller, production adapter, and the same page-owned WebRTC echo topology.                                                                                   |

The WebRTC echo uses the production fragmentation, flow control, reassembly and
ACKs. Signaling is wired locally; there is no signaling server or remote participant. Production peers still use their normal STUN discovery configuration; this is a same-browser loopback comparison.
Each logical peer gets an independent WebRTC pair. Successful received bytes are
sent back through WebRTC, not acknowledged through a cheaper control path.

Payloads are 1 KiB, 64 KiB, 1 MiB, 16 MiB and 64 MiB, with one or four peers.
Combinations with more than 64 MiB of payload in flight are omitted to limit
memory use. Each peer has one outstanding request; peers run concurrently.
Each case has two unrecorded warmup exchanges and 6–60 recorded exchanges per
peer, targeting 32 MiB per case before those iteration limits. Three repetitions rotate/reverse case
order to reduce order bias. The largest cases have only 18 RTT samples per peer
across repetitions, so tail estimates need more runs for precise conclusions.

For payload-only cases, initial caller-owned buffers are allocated and filled before timing. Copies and clones performed during exchange remain inside the timed path. Length, peer/sequence
bytes, midpoint and last-byte probes reject truncation, stale replies and obvious
corruption. Validation is sampled rather than a full checksum to avoid adding a
second large memory scan. The transfer-only control captures probes before its
input is detached. It recycles the buffer returned by the other side.

RTT is timed on the caller's clock; no cross-thread clock subtraction is used. Very fast direct controls may be below the clock resolution and legitimately report zero.
Throughput counts both directions and is computed from the whole measured loop,
not by summing overlapping per-peer latencies. Adapter setup, WebRTC connection
establishment, payload allocation, warmup, and cleanup are outside these timers.
The direct echo and transfer-only control report logical throughput, not physical memory bandwidth. RTT ends when the echoed payload arrives; the final echo receipt ACK/drain can still complete during cleanup.

The adapter explicitly allocates/copies one full buffer in each direction: for a
payload B and P peers, that is 2 × B × P bytes per round trip, in addition to
WebRTC's own work. Reports do not measure peak memory or native allocations.

## Training workload

A second comparison trains the production Titanic TFJS model on 128 deterministic
synthetic samples with its expected 11 encoded input features and batch size 32.
Each measured round trains one epoch, serializes weights with `weightsEncode`,
echoes them through real WebRTC, decodes and reapplies them. Five rounds are run
per repetition. Both modes start from the same serialized initial model and use
the CPU backend. A separate unmeasured model warms each execution path first.

The direct workload runs training and transport on the page. The bridged workload
runs training and serialization in the worker with WebRTC on the page. Their
end-to-end difference includes moving execution to another thread; it must not be
attributed entirely to the adapter. Separate phase timings and the payload cases
help explain the difference. This is a training-and-exchange workload, not a full
multi-participant Disco session: it excludes server coordination, aggregation,
validation, disk loading, GPU contention and final-model saving. The echoed model
is not a measurement of distributed learning quality.

A 5 ms page timer and Long Tasks observer also record responsiveness. These span
the **whole case**, including setup, allocation, warmup and cleanup, rather than
only the timed exchanges. Long Tasks are available only in supporting browsers;
sub-50 ms stalls still appear in timer lag. Compare this signal across repeated
runs rather than treating the largest single stall as a stable benchmark score.

## Recorded run

[Chrome 154 on Linux, 18 November 2026](results/chrome-154-linux-2026-11-18.md)
includes the raw JSON, observed overhead, training/page-lag comparison, and limits.
