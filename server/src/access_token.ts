import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

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

/** Whether the token is the one whose hash is given */
export function matchesHash(token: string, hash: string): boolean {
  // constant time, so that response times don't tell how close a guess is
  return timingSafeEqual(
    Buffer.from(hashToken(token), "hex"),
    Buffer.from(hash, "hex"),
  );
}
