import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { buttonsSkillDir, BUTTONS_SKILL_FILENAME, loadButtonsSkillMarkdown } from "../config/buttonsSkill";

describe("loadButtonsSkillMarkdown", () => {
  it("concatenates skill parts and strips additional-resource links", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "buttons-skill-"));
    try {
      fs.writeFileSync(path.join(dir, "SKILL.md"), "# Skill\n\nBody.\n\n## Additional resources\n\n- [schema.md](schema.md)\n");
      fs.writeFileSync(path.join(dir, "schema.md"), "# Schema\n");
      fs.writeFileSync(path.join(dir, "examples.md"), "# Examples\n");
      const md = loadButtonsSkillMarkdown(dir);
      assert.match(md, /^# Skill\n/);
      assert.match(md, /# Schema/);
      assert.match(md, /# Examples/);
      assert.doesNotMatch(md, /Additional resources/);
      assert.doesNotMatch(md, /\]\(schema\.md\)/);
      assert.equal(md.endsWith("\n"), true);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("loads the packaged skill files from the repo", () => {
    const root = path.join(__dirname, "..", "..");
    const md = loadButtonsSkillMarkdown(buttonsSkillDir(root));
    assert.match(md, /create-buttons-file/);
    assert.match(md, /"type": "script"/);
    assert.match(md, /ArgsButton/);
    assert.match(md, /Activate venv/);
    assert.equal(BUTTONS_SKILL_FILENAME, "BUTTONS-SKILL.md");
  });
});
