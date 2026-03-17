import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { mergeDocuments } from "../config/configHelpers";
import { ButtonsDiagnostic, ButtonsDocument } from "../models/types";

function makeDoc(overrides?: Partial<ButtonsDocument>): ButtonsDocument {
  return { version: 1, ...overrides };
}

describe("mergeDocuments", () => {
  it("merges included groups into root", () => {
    const root = makeDoc({
      groups: { root: { buttons: [{ command: "echo root" }] } },
    });
    const included = makeDoc({
      groups: { api: { buttons: [{ command: "echo api" }] } },
    });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "api/.buttons", diagnostics);

    assert.strictEqual(Object.keys(root.groups!).length, 2);
    assert.ok("root" in root.groups!);
    assert.ok("api" in root.groups!);
    assert.strictEqual(diagnostics.length, 0);
  });

  it("root groups win on ID collision with warning", () => {
    const root = makeDoc({
      groups: { shared: { name: "Root Shared", buttons: [{ command: "echo root" }] } },
    });
    const included = makeDoc({
      groups: { shared: { name: "Included Shared", buttons: [{ command: "echo included" }] } },
    });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "other/.buttons", diagnostics);

    assert.strictEqual(Object.keys(root.groups!).length, 1);
    assert.strictEqual(root.groups!.shared.name, "Root Shared");
    assert.strictEqual(diagnostics.length, 1);
    assert.ok(diagnostics[0].message.includes("already exists"));
    assert.strictEqual(diagnostics[0].severity, "warning");
  });

  it("merges variables — root wins on collision", () => {
    const root = makeDoc({ variables: { port: "3000", name: "root" } });
    const included = makeDoc({ variables: { port: "4000", region: "us-east-1" } });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "inc.buttons", diagnostics);

    assert.strictEqual(root.variables!.port, "3000"); // root wins
    assert.strictEqual(root.variables!.name, "root");
    assert.strictEqual(root.variables!.region, "us-east-1"); // filled from included
  });

  it("merges macros — root wins on collision", () => {
    const root = makeDoc({ macros: { run: "npm run" } });
    const included = makeDoc({ macros: { run: "pnpm run", build: "pnpm build" } });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "inc.buttons", diagnostics);

    assert.strictEqual(root.macros!.run, "npm run"); // root wins
    assert.strictEqual(root.macros!.build, "pnpm build"); // filled from included
  });

  it("initializes root groups/variables/macros if absent", () => {
    const root = makeDoc();
    const included = makeDoc({
      groups: { api: { buttons: [{ command: "echo api" }] } },
      variables: { port: "3000" },
      macros: { run: "npm run" },
    });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "inc.buttons", diagnostics);

    assert.strictEqual(Object.keys(root.groups!).length, 1);
    assert.strictEqual(root.variables!.port, "3000");
    assert.strictEqual(root.macros!.run, "npm run");
  });

  it("ignores included file top-level settings", () => {
    const root = makeDoc({ title: "Root Title", layout: "grid" });
    const included = makeDoc({
      title: "Included Title",
      layout: "table",
      description: "Included desc",
    });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "inc.buttons", diagnostics);

    // Root settings unchanged
    assert.strictEqual(root.title, "Root Title");
    assert.strictEqual(root.layout, "grid");
    assert.strictEqual(root.description, undefined); // not copied from included
  });

  it("merges multiple included documents in order", () => {
    const root = makeDoc({
      groups: { root: { buttons: [{ command: "echo root" }] } },
    });
    const inc1 = makeDoc({
      groups: { api: { buttons: [{ command: "echo api" }] } },
    });
    const inc2 = makeDoc({
      groups: { web: { buttons: [{ command: "echo web" }] } },
    });
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, inc1, "api/.buttons", diagnostics);
    mergeDocuments(root, inc2, "web/.buttons", diagnostics);

    assert.strictEqual(Object.keys(root.groups!).length, 3);
    assert.ok("root" in root.groups!);
    assert.ok("api" in root.groups!);
    assert.ok("web" in root.groups!);
    assert.strictEqual(diagnostics.length, 0);
  });

  it("handles empty included document gracefully", () => {
    const root = makeDoc({
      groups: { root: { buttons: [{ command: "echo root" }] } },
    });
    const included = makeDoc();
    const diagnostics: ButtonsDiagnostic[] = [];
    mergeDocuments(root, included, "empty.buttons", diagnostics);

    assert.strictEqual(Object.keys(root.groups!).length, 1);
    assert.strictEqual(diagnostics.length, 0);
  });
});
