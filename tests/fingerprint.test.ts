import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { generateFingerprint } from "../lib/fingerprint";

describe("Fingerprinting — dynamic value stripping", () => {
  it("strips UUIDs", () => {
    const r = generateFingerprint(
      "Error for user a1b2c3d4-e5f6-7890-abcd-ef1234567890"
    );
    assert.ok(!r.fingerprint.includes("a1b2c3d4"));
    assert.ok(r.fingerprint.includes("<id>"));
  });

  it("strips IPv4 addresses", () => {
    const r = generateFingerprint(
      "Connection refused to 192.168.1.100:5432"
    );
    assert.ok(!r.fingerprint.includes("192.168"));
    assert.ok(r.fingerprint.includes("<ip>"));
  });

  it("strips hex addresses", () => {
    const r = generateFingerprint("Segfault at address 0x7fff5fbff8d0");
    assert.ok(!r.fingerprint.includes("0x7fff"));
    assert.ok(r.fingerprint.includes("<addr>"));
  });

  it("strips timestamps", () => {
    const r = generateFingerprint(
      "2026-08-22T10:00:01.123Z ERROR Something failed"
    );
    assert.ok(!r.fingerprint.includes("2026-08-22"));
    assert.ok(r.fingerprint.includes("<ts>"));
  });

  it("strips file paths", () => {
    const r = generateFingerprint(
      "Cannot read property of undefined at /home/app/src/utils.ts:42"
    );
    assert.ok(!r.fingerprint.includes("/home/app"));
    assert.ok(r.fingerprint.includes("<path>"));
  });

  it("strips large numbers (IDs)", () => {
    const r = generateFingerprint("Order 12345678 not found");
    assert.ok(!r.fingerprint.includes("12345678"));
    assert.ok(r.fingerprint.includes("<n>"));
  });

  it("lowercases the fingerprint", () => {
    const r = generateFingerprint("ERROR Database Connection Failed");
    assert.equal(r.fingerprint, r.fingerprint.toLowerCase());
  });
});

describe("Fingerprinting — category detection", () => {
  it("detects Connection errors", () => {
    const r = generateFingerprint("Connection refused to database");
    assert.equal(r.category, "Connection");
  });

  it("detects Timeout errors", () => {
    const r = generateFingerprint("Request timed out after 30s");
    assert.equal(r.category, "Timeout");
  });

  it("detects Permission errors", () => {
    const r = generateFingerprint("Permission denied for user admin");
    assert.equal(r.category, "Permission");
  });

  it("detects Authentication errors", () => {
    const r = generateFingerprint("Authentication token expired");
    assert.equal(r.category, "Authentication");
  });

  it("detects Out of Memory errors", () => {
    const r = generateFingerprint("JavaScript heap out of memory");
    assert.equal(r.category, "Out of Memory");
  });

  it("detects Crash errors", () => {
    const r = generateFingerprint("Segfault in main process");
    assert.equal(r.category, "Crash");
  });

  it("detects generic failure errors", () => {
    const r = generateFingerprint("Failed to connect to Redis");
    assert.equal(r.category, "Failure");
  });

  it("defaults to General for unmatched", () => {
    const r = generateFingerprint("Something went wrong with the widget");
    assert.equal(r.category, "General");
  });
});

describe("Fingerprinting — service extraction", () => {
  it("detects PostgreSQL", () => {
    const r = generateFingerprint("PostgreSQL connection pool exhausted");
    assert.ok(r.services.includes("PostgreSQL"));
  });

  it("detects Redis", () => {
    const r = generateFingerprint("Redis timeout after 5000ms");
    assert.ok(r.services.includes("Redis"));
  });

  it("detects MongoDB", () => {
    const r = generateFingerprint("MongoDB write concern error");
    assert.ok(r.services.includes("MongoDB"));
  });

  it("detects multiple services", () => {
    const r = generateFingerprint(
      "Failed to sync PostgreSQL to Redis cache"
    );
    assert.ok(r.services.includes("PostgreSQL"));
    assert.ok(r.services.includes("Redis"));
    assert.ok(r.services.includes("Cache"));
  });

  it("returns empty services for unknown", () => {
    const r = generateFingerprint("Widget failed to render");
    assert.equal(r.services.length, 0);
  });
});

describe("Fingerprinting — clean message", () => {
  it("preserves semantic meaning after stripping", () => {
    const r = generateFingerprint(
      "ERROR: Connection refused to 10.0.0.1:5432 at 2026-01-01T00:00:00Z"
    );
    assert.ok(r.cleanMessage.includes("Connection refused"));
    assert.ok(r.cleanMessage.includes("<ip>"));
    assert.ok(r.cleanMessage.includes("<port>"));
    assert.ok(r.cleanMessage.includes("<ts>"));
  });

  it("normalizes whitespace", () => {
    const r = generateFingerprint("Too   many    spaces   here");
    assert.ok(!r.cleanMessage.includes("  "));
  });
});

describe("Fingerprinting — grouping equivalence", () => {
  it("same error with different dynamic values produces same fingerprint", () => {
    const r1 = generateFingerprint(
      "User a1b2c3d4-e5f6-7890-abcd-ef1234567890 not found"
    );
    const r2 = generateFingerprint(
      "User 9f8e7d6c-5b4a-3210-fedc-ba9876543210 not found"
    );
    assert.equal(r1.fingerprint, r2.fingerprint);
  });

  it("different errors produce different fingerprints", () => {
    const r1 = generateFingerprint("Connection refused to database");
    const r2 = generateFingerprint("Timeout waiting for response");
    assert.notEqual(r1.fingerprint, r2.fingerprint);
  });
});
