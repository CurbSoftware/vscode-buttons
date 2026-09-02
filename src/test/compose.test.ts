import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { composeChunk, withoutExecute } from "../execution/compose";

describe("composeChunk", () => {
  it("writes the first token with no separator", () => {
    assert.equal(composeChunk(false, "pnpm", "space"), "pnpm");
    assert.equal(composeChunk(false, "pnpm", "newline"), "pnpm");
  });

  it("joins later tokens with a space or a newline", () => {
    assert.equal(composeChunk(true, "dev", "space"), " dev");
    assert.equal(composeChunk(true, "dev", "newline"), "\ndev");
  });
});

describe("withoutExecute", () => {
  it("passes a single-line token through", () => {
    assert.equal(withoutExecute("pnpm"), "pnpm");
    assert.equal(withoutExecute(" dev"), " dev");
  });

  it("wraps newlines in bracketed paste so they are not submitted", () => {
    assert.equal(withoutExecute("\ndev"), "\x1b[200~\ndev\x1b[201~");
    assert.equal(withoutExecute("pnpm\ndev"), "\x1b[200~pnpm\ndev\x1b[201~");
  });
});
