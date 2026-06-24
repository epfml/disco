import { Buffer } from "buffer";

(globalThis as unknown as Record<string, unknown>).Buffer ??= Buffer;
