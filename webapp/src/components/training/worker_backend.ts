import * as tf from "@tensorflow/tfjs";
import { setWasmPaths } from "@tensorflow/tfjs-backend-wasm";
import wasmUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm.wasm?url";
import simdUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-simd.wasm?url";
import threadedSimdUrl from "@tensorflow/tfjs-backend-wasm/dist/tfjs-backend-wasm-threaded-simd.wasm?url";
import type { DataType } from "@epfml/discojs";

export async function initializeTrainingBackend(
  dataType: DataType,
): Promise<void> {
  // WASM provides SIMD for tabular training. Its backend does not implement
  // the Conv2D gradients used by image models, so use worker WebGL where
  // OffscreenCanvas supports it, then fall back to CPU.
  if (dataType === "tabular") {
    setWasmPaths({
      "tfjs-backend-wasm.wasm": wasmUrl,
      "tfjs-backend-wasm-simd.wasm": simdUrl,
      "tfjs-backend-wasm-threaded-simd.wasm": threadedSimdUrl,
    });
    if (!(await tf.setBackend("wasm"))) await tf.setBackend("cpu");
  } else {
    const webglReady = await tf.setBackend("webgl").catch(() => false);
    if (!webglReady) await tf.setBackend("cpu");
  }
  await tf.ready();
}
