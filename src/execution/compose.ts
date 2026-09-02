export type AppendSep = "space" | "newline";

/** Next text to write into the prompt. First click is the token as-is. */
export function composeChunk(composing: boolean, command: string, sep: AppendSep): string {
  if (!composing) {
    return command;
  }
  return sep === "space" ? ` ${command}` : `\n${command}`;
}

/**
 * A raw LF in a pty accepts the current line. Wrap any newline in bracketed
 * paste so bash/zsh/fish insert it instead of running the previous token.
 */
export function withoutExecute(text: string): string {
  return /[\r\n]/.test(text) ? `\x1b[200~${text}\x1b[201~` : text;
}
