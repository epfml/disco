import { describe, expect, it } from "vitest";

import { assertCanSendToken } from "#utils/token_transport";

describe("assertCanSendToken", () => {
  it("accepts encrypted URLs", () => {
    for (const url of ["https://disco.example", "wss://disco.example/task"])
      expect(() => assertCanSendToken(new URL(url))).not.toThrow();
  });

  it("accepts plain URLs to the loopback interface", () => {
    for (const url of [
      "http://localhost:8080",
      "ws://localhost:8080/federated/task",
      "http://127.0.0.1",
      "http://127.1", // short for 127.0.0.1
      "http://[::1]:8080",
    ])
      expect(() => assertCanSendToken(new URL(url))).not.toThrow();
  });

  it("refuses plain URLs to any other host", () => {
    for (const url of [
      "http://disco.example",
      "ws://disco.example/task",
      "http://192.168.1.10:8080",
      "http://localhost.disco.example",
    ])
      expect(() => assertCanSendToken(new URL(url))).toThrow("without TLS");
  });
});
