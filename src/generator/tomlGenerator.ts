import { DiscoveredScript } from "../scanner/types";

export function generateButtonsToml(scripts: DiscoveredScript[], title?: string): string {
  const lines: string[] = [];
  lines.push("version = 1");
  lines.push(`title = "${title ?? "Project Buttons"}"`);
  lines.push("");

  // Group scripts by their group field
  const groups = new Map<string, DiscoveredScript[]>();
  for (const script of scripts) {
    const existing = groups.get(script.group) ?? [];
    existing.push(script);
    groups.set(script.group, existing);
  }

  for (const [groupId, groupScripts] of groups) {
    const safeName = groupId.charAt(0).toUpperCase() + groupId.slice(1);
    const safeId = groupId.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");

    lines.push(`[groups.${safeId}]`);
    lines.push(`name = "${safeName}"`);

    // Use the first script's source as the description
    const source = groupScripts[0]?.source;
    if (source) {
      lines.push(`description = "Scripts from ${source}"`);
    }

    lines.push(`icon = "package"`);
    lines.push("");

    for (const script of groupScripts) {
      lines.push(`[[groups.${safeId}.buttons]]`);
      lines.push(`id = "${escapeTomlString(script.label)}"`);
      lines.push(`label = "${escapeTomlString(script.label)}"`);
      lines.push(`command = "${escapeTomlString(script.command)}"`);
      if (script.icon) {
        lines.push(`icon = "${script.icon}"`);
      }
      if (script.description) {
        lines.push(`description = "${escapeTomlString(script.description)}"`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

function escapeTomlString(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}
