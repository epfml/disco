import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { AutoModelForCausalLM, AutoTokenizer, env } from "@xenova/transformers";

interface CachedResponse {
  headers: Headers;
  arrayBuffer(): Promise<ArrayBuffer>;
  readonly body: ReadableStream<Uint8Array>;
}

interface AtomicFileCache {
  match(key: string): Promise<CachedResponse | undefined>;
  put(key: string, response: Response): Promise<void>;
}

function cachePathForKey(cacheDir: string, key: string): string | undefined {
  if (!key.startsWith("http://") && !key.startsWith("https://")) {
    return undefined;
  }
  const hash = crypto.createHash("sha256").update(key).digest("hex");
  return path.join(cacheDir, hash);
}

/**
 * Creates a file-system cache whose writes are staged to a unique temporary file
 * and renamed atomically, preventing concurrent Vitest workers from reading
 * partially written `@xenova/transformers` model files.
 */
function createAtomicFileCache(cacheDir: string): AtomicFileCache {
  return {
    async match(key: string): Promise<CachedResponse | undefined> {
      const filePath = cachePathForKey(cacheDir, key);
      if (filePath === undefined) return undefined;

      let size: number;
      try {
        size = (await fs.stat(filePath)).size;
      } catch (err) {
        if (err instanceof Error && "code" in err && err.code === "ENOENT") {
          return undefined;
        }
        throw err;
      }

      // Read lazily because transformers.js calls match() just to check existence before put().
      return {
        headers: new Headers({ "Content-Length": String(size) }),
        async arrayBuffer(): Promise<ArrayBuffer> {
          const data = await fs.readFile(filePath);
          return new Uint8Array(data).buffer;
        },
        get body(): ReadableStream<Uint8Array> {
          return new ReadableStream<Uint8Array>({
            async start(controller) {
              try {
                const data = await fs.readFile(filePath);
                controller.enqueue(new Uint8Array(data));
                controller.close();
              } catch (err) {
                controller.error(err);
              }
            },
          });
        },
      };
    },

    async put(key: string, response: Response): Promise<void> {
      const filePath = cachePathForKey(cacheDir, key);
      if (filePath === undefined) return;

      const buffer = Buffer.from(await response.arrayBuffer());
      await fs.mkdir(cacheDir, { recursive: true });
      const tmpPath = `${filePath}.${process.pid}.${crypto.randomUUID()}.tmp`;
      try {
        await fs.writeFile(tmpPath, buffer);
        await fs.rename(tmpPath, filePath);
      } catch (err) {
        await fs.rm(tmpPath, { force: true }).catch(() => undefined);
        throw err;
      }
    },
  };
}

let atomicCacheDir: string | undefined;

if (env.useFSCache && typeof env.cacheDir === "string") {
  atomicCacheDir = path.join(env.cacheDir, "atomic");
  Object.assign(env, {
    useFSCache: false,
    useCustomCache: true,
    customCache: createAtomicFileCache(atomicCacheDir),
  });
}

/**
 * Vitest globalSetup hook for the `discojs` project: populates the atomic
 * cache with `Xenova/gpt2` once before parallel workers start, avoiding
 * duplicate 128 MB downloads that can exceed per-test timeouts on cold runs.
 */
export async function setup(): Promise<void> {
  if (atomicCacheDir === undefined) return;

  const sentinelPath = path.join(atomicCacheDir, ".gpt2-prewarmed");
  try {
    await fs.stat(sentinelPath);
    return;
  } catch (err) {
    if (!(err instanceof Error && "code" in err && err.code === "ENOENT")) {
      throw err;
    }
  }

  await AutoTokenizer.from_pretrained("Xenova/gpt2");
  const model = await AutoModelForCausalLM.from_pretrained("Xenova/gpt2");
  await model.dispose();

  await fs.mkdir(atomicCacheDir, { recursive: true });
  const tmpSentinel = `${sentinelPath}.${process.pid}.${crypto.randomUUID()}.tmp`;
  try {
    await fs.writeFile(tmpSentinel, "");
    await fs.rename(tmpSentinel, sentinelPath);
  } catch (err) {
    await fs.rm(tmpSentinel, { force: true }).catch(() => undefined);
    throw err;
  }
}
