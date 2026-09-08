import * as fs from "fs";
import * as path from "path";

/** Workspace-root filename written by "Add to project". */
export const BUTTONS_SKILL_FILENAME = "BUTTONS-SKILL.md";

const SKILL_PARTS = ["SKILL.md", "schema.md", "examples.md"] as const;

/** Packaged skill directory inside the extension (`resources/create-buttons-file`). */
export function buttonsSkillDir(extensionRoot: string): string {
  return path.join(extensionRoot, "resources", "create-buttons-file");
}

/**
 * Concatenate the Cursor skill files into one markdown document for clipboard
 * copy or BUTTONS-SKILL.md. Drops SKILL.md's "Additional resources" links so
 * they do not point at files that are not in the export.
 */
export function loadButtonsSkillMarkdown(skillDir: string): string {
  const skill = fs
    .readFileSync(path.join(skillDir, SKILL_PARTS[0]), "utf8")
    .replace(/\n## Additional resources[\s\S]*$/, "")
    .trimEnd();
  const rest = SKILL_PARTS.slice(1).map((name) => fs.readFileSync(path.join(skillDir, name), "utf8").trimEnd());
  return [skill, ...rest].join("\n\n") + "\n";
}
