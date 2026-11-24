import { createHash, randomBytes } from "node:crypto";

// 256 bits
const TOKEN_BYTES = 32;

/** Generate a random token granting access to a private task */
export function generateToken(): string {
  // base64url so that it fits in a URL fragment and a header without escaping
  return randomBytes(TOKEN_BYTES).toString("base64url");
}

/**
 * Hash a token, to store it without being able to give it back.
 *
 * A plain SHA-256 is enough: slow, salted hashes protect low-entropy
 * passwords against brute force, which a 256-bit random token isn't.
 */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
