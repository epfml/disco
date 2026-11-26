import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { env } from "@xenova/transformers";
import { afterEach, assert, describe, expect, it } from "vitest";

interface CachedEntry {
  headers: Headers;
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly body: ReadableStream<Uint8Array> | null;
}

interface AtomicCache {
  match(key: string): Promise<CachedEntry | undefined>;
  put(key: string, response: Response): Promise<void>;
}

function isAtomicCache(value: unknown): value is AtomicCache {
  return (
    typeof value === "object" &&
    value !== null &&
    "match" in value &&
    typeof value.match === "function" &&
    "put" in value &&
    typeof value.put === "function"
  );
}

function getCacheAndDir(): { cache: AtomicCache; atomicCacheDir: string } {
  const rawCache: unknown = env.customCache;
  assert(isAtomicCache(rawCache), "customCache must implement match and put");
  const rawDir: unknown = env.cacheDir;
  assert(typeof rawDir === "string", "env.cacheDir must be a string");
  return { cache: rawCache, atomicCacheDir: path.join(rawDir, "atomic") };
}

async function readAll(stream: ReadableStream<Uint8Array>): Promise<Buffer> {
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

describe("atomic transformers cache", () => {
  const createdKeys: string[] = [];

  afterEach(async () => {
    const { atomicCacheDir } = getCacheAndDir();
    await Promise.all(
      createdKeys.splice(0).map(async (key) => {
        const hash = crypto.createHash("sha256").update(key).digest("hex");
        await fs.rm(path.join(atomicCacheDir, hash), { force: true });
      }),
    );
  });

  it("replaces transformers.js FS cache with the atomic custom cache", () => {
    expect(env.useFSCache).toBe(false);
    expect(env.useCustomCache).toBe(true);
    getCacheAndDir();
  });

  it("returns undefined for non-URL local paths and uncached URLs", async () => {
    const { cache } = getCacheAndDir();

    expect(await cache.match("/models/Xenova/gpt2/model.onnx")).toBeUndefined();
    expect(
      await cache.match(
        `https://example.invalid/${crypto.randomUUID()}/missing.bin`,
      ),
    ).toBeUndefined();
  });

  it("round-trips cached payloads via arrayBuffer and body stream", async () => {
    const { cache } = getCacheAndDir();
    const key = `https://example.invalid/${crypto.randomUUID()}/weights.bin`;
    createdKeys.push(key);
    const payload = new Uint8Array([1, 2, 3, 4, 250, 251, 252, 255]);

    await cache.put(key, new Response(payload));
    const matched = await cache.match(key);
    assert(matched !== undefined);

    expect(matched.headers.get("Content-Length")).toBe(
      String(payload.byteLength),
    );
    const fromArrayBuffer = new Uint8Array(await matched.arrayBuffer());
    expect(Buffer.compare(fromArrayBuffer, payload)).toBe(0);

    assert(matched.body !== null);
    const fromStream = await readAll(matched.body);
    expect(Buffer.compare(fromStream, payload)).toBe(0);
  });

  it("never serves partial writes or leaves temp files during concurrent writes", async () => {
    const { cache, atomicCacheDir } = getCacheAndDir();
    const key = `https://example.invalid/${crypto.randomUUID()}/concurrent.onnx`;
    createdKeys.push(key);

    const size = 2 * 1024 * 1024;
    const payload = new Uint8Array(size);
    const view = new DataView(payload.buffer);
    for (let i = 0; i < size; i += 4) {
      view.setUint32(i, (i * 1103515245 + 12345) >>> 0, true);
    }

    const writers = Array.from({ length: 6 }, () =>
      cache.put(key, new Response(payload)),
    );
    const readers = Array.from({ length: 12 }, async () => {
      for (let i = 0; i < 10; i++) {
        const entry = await cache.match(key);
        if (entry === undefined) continue;
        const bytes = new Uint8Array(await entry.arrayBuffer());
        expect(bytes.byteLength).toBe(size);
        expect(Buffer.compare(bytes, payload)).toBe(0);
      }
    });

    await Promise.all([...writers, ...readers]);

    const finalEntry = await cache.match(key);
    assert(finalEntry !== undefined);
    const finalBytes = new Uint8Array(await finalEntry.arrayBuffer());
    expect(Buffer.compare(finalBytes, payload)).toBe(0);

    const hash = crypto.createHash("sha256").update(key).digest("hex");
    const entries = await fs.readdir(atomicCacheDir);
    expect(entries.filter((name) => name.startsWith(`${hash}.`))).toEqual([]);
    expect(entries.filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });
});
