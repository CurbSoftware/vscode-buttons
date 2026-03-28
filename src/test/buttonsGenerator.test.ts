import { describe, it } from "node:test";
import * as assert from "node:assert/strict";
import { generateButtonsToml } from "../generator/tomlGenerator";
import { DiscoveredScript } from "../scanner/types";

describe("generateButtonsToml", () => {
  it("generates valid TOML from a single script", () => {
    const scripts: DiscoveredScript[] = [
      { label: "dev", command: "npm run dev", source: "package.json", group: "npm", icon: "play" },
    ];
    const toml = generateButtonsToml(scripts);
    assert.ok(toml.includes('version = 1'));
    assert.ok(toml.includes('[groups.npm]'));
    assert.ok(toml.includes('command = "npm run dev"'));
    assert.ok(toml.includes('icon = "play"'));
  });

  it("groups scripts by their group field", () => {
    const scripts: DiscoveredScript[] = [
      { label: "dev", command: "npm run dev", source: "package.json", group: "npm" },
      { label: "build", command: "make build", source: "Makefile", group: "make" },
    ];
    const toml = generateButtonsToml(scripts);
    assert.ok(toml.includes('[groups.npm]'));
    assert.ok(toml.includes('[groups.make]'));
    assert.ok(toml.includes('[[groups.npm.buttons]]'));
    assert.ok(toml.includes('[[groups.make.buttons]]'));
  });

  it("uses custom title", () => {
    const scripts: DiscoveredScript[] = [
      { label: "test", command: "npm test", source: "package.json", group: "npm" },
    ];
    const toml = generateButtonsToml(scripts, "My App");
    assert.ok(toml.includes('title = "My App"'));
  });

  it("includes description when provided", () => {
    const scripts: DiscoveredScript[] = [
      {
        label: "dev",
        command: "npm run dev",
        description: "vite dev server",
        source: "package.json",
        group: "npm",
      },
    ];
    const toml = generateButtonsToml(scripts);
    assert.ok(toml.includes('description = "vite dev server"'));
  });

  it("escapes special characters in TOML strings", () => {
    const scripts: DiscoveredScript[] = [
      {
        label: 'say "hello"',
        command: 'echo "hello \\ world"',
        source: "package.json",
        group: "npm",
      },
    ];
    const toml = generateButtonsToml(scripts);
    assert.ok(toml.includes('label = "say \\"hello\\""'));
    assert.ok(toml.includes('command = "echo \\"hello \\\\ world\\""'));
  });

  it("handles multiple scripts in one group", () => {
    const scripts: DiscoveredScript[] = [
      { label: "dev", command: "npm run dev", source: "package.json", group: "npm" },
      { label: "build", command: "npm run build", source: "package.json", group: "npm" },
      { label: "test", command: "npm test", source: "package.json", group: "npm" },
    ];
    const toml = generateButtonsToml(scripts);
    const buttonCount = (toml.match(/\[\[groups\.npm\.buttons\]\]/g) ?? []).length;
    assert.strictEqual(buttonCount, 3);
  });

  it("produces valid TOML with empty scripts", () => {
    const toml = generateButtonsToml([]);
    assert.ok(toml.includes('version = 1'));
    assert.ok(!toml.includes('[groups.'));
  });
});
