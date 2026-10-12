/**
 * Enough of a document to execute the Buttons webview script under node:vm.
 * Selector coverage matches the selectors that script actually uses.
 */
import vm from "node:vm";

export interface VsCodeApi {
  messages: unknown[];
  postMessage(message: unknown): void;
  getState(): Record<string, unknown> | undefined;
  setState(next: Record<string, unknown>): Record<string, unknown>;
}

interface Step {
  combinator: "" | ">" | " ";
  compound: string;
}

export class MiniEl {
  readonly children: MiniEl[] = [];
  parent: MiniEl | null = null;
  readonly classes = new Set<string>();
  readonly attrs: Record<string, string> = {};
  readonly dataset: Record<string, string> = {};
  readonly style = {
    props: {} as Record<string, string>,
    setProperty(name: string, value: string) {
      this.props[name] = value;
    },
    getPropertyValue(name: string) {
      return this.props[name] ?? "";
    },
  };
  id = "";
  value = "";
  checked = false;
  indeterminate = false;
  textContent = "";
  owner: MiniDocument | null = null;

  constructor(readonly tag: string) {}

  get classList() {
    const classes = this.classes;
    return {
      add: (...names: string[]) => {
        for (const name of names) {
          classes.add(name);
        }
      },
      remove: (...names: string[]) => {
        for (const name of names) {
          classes.delete(name);
        }
      },
      contains: (name: string) => classes.has(name),
      toggle: (name: string) => {
        if (classes.has(name)) {
          classes.delete(name);
          return false;
        }
        classes.add(name);
        return true;
      },
    };
  }

  setAttribute(name: string, value: string): void {
    this.attrs[name] = value;
    if (name === "class") {
      this.classes.clear();
      for (const part of value.split(/\s+/)) {
        if (part) {
          this.classes.add(part);
        }
      }
    }
  }

  getAttribute(name: string): string | null {
    return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null;
  }

  focus(): void {
    if (this.owner) {
      this.owner.focused = this;
    }
  }

  getBoundingClientRect(): { width: number; height: number; x: number; y: number; top: number; left: number; right: number; bottom: number } {
    return { width: 200, height: 24, x: 0, y: 0, top: 0, left: 0, right: 200, bottom: 24 };
  }

  setPointerCapture(_pointerId: number): void {}

  matches(selector: string): boolean {
    return matchesSelector(this, selector, this);
  }

  closest(selector: string): MiniEl | null {
    let current: MiniEl | null = this;
    while (current) {
      if (matchesSelector(current, selector, current)) {
        return current;
      }
      current = current.parent;
    }
    return null;
  }

  querySelector(selector: string): MiniEl | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  querySelectorAll(selector: string): MiniEl[] {
    const alternatives = splitComma(selector);
    const found: MiniEl[] = [];
    for (const node of descendants(this)) {
      if (alternatives.some((alternative) => matchChain(node, parseChain(alternative), this))) {
        found.push(node);
      }
    }
    return found;
  }
}

export class MiniDocument {
  readonly root = new MiniEl("#document");
  documentElement!: MiniEl;
  body!: MiniEl;
  focused: MiniEl | null = null;
  private readonly listeners = new Map<string, Array<(event: Record<string, unknown>) => void>>();

  constructor() {
    this.root.owner = this;
  }

  addEventListener(type: string, listener: (event: Record<string, unknown>) => void): void {
    const bucket = this.listeners.get(type) ?? [];
    bucket.push(listener);
    this.listeners.set(type, bucket);
  }

  dispatch(type: string, event: Record<string, unknown>): void {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event);
    }
  }

  getElementById(id: string): MiniEl | null {
    return walkFind(this.root, (el) => el.id === id);
  }

  querySelector(selector: string): MiniEl | null {
    return this.root.querySelector(selector);
  }

  querySelectorAll(selector: string): MiniEl[] {
    return this.root.querySelectorAll(selector);
  }
}

export interface WebviewSession {
  api: VsCodeApi;
  document: MiniDocument;
  click(selector: string): MiniEl;
  change(selector: string): MiniEl;
  input(selector: string, value: string): MiniEl;
  keydown(selector: string, key: string): MiniEl;
  pointer(type: string, selector: string, clientX: number): MiniEl;
  drag(fromSelector: string, toSelector: string): void;
}

export function bootWebview(html: string, initialState?: Record<string, unknown>): WebviewSession {
  const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
  if (!scriptMatch) {
    throw new Error("webview html has no script");
  }
  const page = html.replace(/<script>[\s\S]*<\/script>/, "");
  const document = parseHtml(page);
  let current = initialState;
  const api: VsCodeApi = {
    messages: [],
    postMessage(message) {
      api.messages.push(message);
    },
    getState() {
      return current;
    },
    setState(next) {
      current = next;
      return next;
    },
  };

  vm.runInNewContext(
    scriptMatch[1],
    {
      document,
      acquireVsCodeApi: () => api,
      CSS: { escape: cssEscape },
      console,
      Number,
      String,
      Boolean,
      Array,
      Object,
      Set,
      Map,
      JSON,
      Math,
      parseFloat,
      parseInt,
      Error,
      RegExp,
    },
    { filename: "buttons-webview.js" },
  );

  const requireEl = (selector: string): MiniEl => {
    const el = document.querySelector(selector);
    if (!el) {
      throw new Error(`no element for ${selector}`);
    }
    return el;
  };

  return {
    api,
    document,
    click(selector) {
      const el = requireEl(selector);
      document.dispatch("click", { type: "click", target: el, preventDefault() {} });
      return el;
    },
    change(selector) {
      const el = requireEl(selector);
      document.dispatch("change", { type: "change", target: el });
      return el;
    },
    input(selector, value) {
      const el = requireEl(selector);
      el.value = value;
      document.dispatch("input", { type: "input", target: el });
      return el;
    },
    keydown(selector, key) {
      const el = requireEl(selector);
      document.dispatch("keydown", { type: "keydown", target: el, key });
      return el;
    },
    pointer(type, selector, clientX) {
      const el = requireEl(selector);
      document.dispatch(type, {
        type,
        target: el,
        clientX,
        pointerId: 1,
        preventDefault() {},
      });
      return el;
    },
    drag(fromSelector, toSelector) {
      const from = requireEl(fromSelector);
      const to = requireEl(toSelector);
      const data: Record<string, string> = {};
      const dataTransfer = {
        effectAllowed: "all",
        setData(type: string, value: string) {
          data[type] = value;
        },
        getData(type: string) {
          return data[type] ?? "";
        },
      };
      document.dispatch("dragstart", { type: "dragstart", target: from, dataTransfer, preventDefault() {} });
      document.dispatch("dragover", { type: "dragover", target: to, dataTransfer, preventDefault() {} });
      document.dispatch("drop", { type: "drop", target: to, dataTransfer, preventDefault() {} });
      document.dispatch("dragend", { type: "dragend", target: from, dataTransfer, preventDefault() {} });
    },
  };
}

function cssEscape(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, (ch) => `\\${ch}`);
}

function descendants(root: MiniEl): MiniEl[] {
  const out: MiniEl[] = [];
  const walk = (el: MiniEl) => {
    for (const child of el.children) {
      out.push(child);
      walk(child);
    }
  };
  walk(root);
  return out;
}

function walkFind(root: MiniEl, pred: (el: MiniEl) => boolean): MiniEl | null {
  if (pred(root)) {
    return root;
  }
  for (const child of root.children) {
    const found = walkFind(child, pred);
    if (found) {
      return found;
    }
  }
  return null;
}

function splitComma(selector: string): string[] {
  const parts: string[] = [];
  let buf = "";
  let quote = "";
  let brackets = 0;
  for (const ch of selector) {
    if (quote) {
      buf += ch;
      if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "[") {
      brackets += 1;
    } else if (ch === "]") {
      brackets = Math.max(0, brackets - 1);
    }
    if (ch === "," && brackets === 0) {
      parts.push(buf.trim());
      buf = "";
      continue;
    }
    buf += ch;
  }
  if (buf.trim()) {
    parts.push(buf.trim());
  }
  return parts;
}

function parseChain(selector: string): Step[] {
  const steps: Step[] = [];
  let buf = "";
  let combinator: "" | ">" | " " = "";
  let quote = "";
  let brackets = 0;
  const push = () => {
    const compound = buf.trim();
    if (compound) {
      steps.push({ combinator, compound });
    }
    buf = "";
  };
  for (const ch of selector) {
    if (quote) {
      buf += ch;
      if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      buf += ch;
      continue;
    }
    if (ch === "[") {
      brackets += 1;
      buf += ch;
      continue;
    }
    if (ch === "]") {
      brackets = Math.max(0, brackets - 1);
      buf += ch;
      continue;
    }
    if (brackets === 0 && (ch === ">" || ch === " ")) {
      if (buf.trim()) {
        push();
        combinator = ch === ">" ? ">" : " ";
      } else if (ch === ">") {
        combinator = ">";
      }
      continue;
    }
    buf += ch;
  }
  push();
  return steps;
}

function matchesSelector(el: MiniEl, selector: string, scope: MiniEl): boolean {
  return splitComma(selector).some((alternative) => matchChain(el, parseChain(alternative), scope));
}

function matchChain(el: MiniEl, steps: Step[], scope: MiniEl): boolean {
  const at = (node: MiniEl | null, index: number): boolean => {
    if (!node || index < 0) {
      return false;
    }
    if (!matchCompound(node, steps[index].compound, scope)) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    if (steps[index].combinator === ">") {
      return at(node.parent, index - 1);
    }
    let parent = node.parent;
    while (parent) {
      if (at(parent, index - 1)) {
        return true;
      }
      parent = parent.parent;
    }
    return false;
  };
  return steps.length > 0 && at(el, steps.length - 1);
}

function matchCompound(el: MiniEl, compound: string, scope: MiniEl): boolean {
  if (compound === ":scope") {
    return el === scope;
  }
  let firstChild = false;
  let rest = compound;
  if (rest.includes(":first-child")) {
    firstChild = true;
    rest = rest.replace(":first-child", "");
  }
  const tagMatch = /^[a-zA-Z][\w-]*/.exec(rest);
  if (tagMatch && el.tag !== tagMatch[0].toLowerCase()) {
    return false;
  }
  const classes = rest.match(/\.([A-Za-z0-9_-]+)/g) ?? [];
  for (const token of classes) {
    if (!el.classes.has(token.slice(1))) {
      return false;
    }
  }
  const idMatch = /#([A-Za-z][\w-]*)/.exec(rest);
  if (idMatch && el.id !== idMatch[1]) {
    return false;
  }
  const attrRe = /\[([A-Za-z_][\w-]*)(?:="([^"]*)"|='([^']*)')?\]/g;
  let saw = Boolean(idMatch);
  let attrMatch: RegExpExecArray | null;
  while ((attrMatch = attrRe.exec(compound))) {
    saw = true;
    const actual = el.attrs[attrMatch[1]];
    if (actual === undefined) {
      return false;
    }
    const expected = attrMatch[2] ?? attrMatch[3];
    if (expected !== undefined && actual !== expected) {
      return false;
    }
  }
  if (firstChild) {
    const siblings = el.parent?.children ?? [];
    if (siblings[0] !== el) {
      return false;
    }
  }
  if (!tagMatch && !idMatch && classes.length === 0 && !saw && !firstChild) {
    return false;
  }
  return true;
}

function decode(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function datasetKey(name: string): string | undefined {
  if (!name.startsWith("data-")) {
    return undefined;
  }
  return name.slice(5).replace(/-([a-z])/g, (_all, ch: string) => ch.toUpperCase());
}

function parseAttrs(el: MiniEl, raw: string): void {
  let i = 0;
  while (i < raw.length) {
    while (i < raw.length && /\s/.test(raw[i])) {
      i += 1;
    }
    if (i >= raw.length) {
      break;
    }
    let name = "";
    while (i < raw.length && raw[i] !== "=" && !/\s/.test(raw[i])) {
      name += raw[i];
      i += 1;
    }
    let value = "";
    let hasValue = false;
    while (i < raw.length && /\s/.test(raw[i])) {
      i += 1;
    }
    if (raw[i] === "=") {
      hasValue = true;
      i += 1;
      while (i < raw.length && /\s/.test(raw[i])) {
        i += 1;
      }
      if (raw[i] === '"' || raw[i] === "'") {
        const quote = raw[i];
        i += 1;
        while (i < raw.length && raw[i] !== quote) {
          value += raw[i];
          i += 1;
        }
        i += 1;
      } else {
        while (i < raw.length && !/\s/.test(raw[i])) {
          value += raw[i];
          i += 1;
        }
      }
    }
    const decoded = decode(value);
    el.attrs[name] = hasValue ? decoded : "";
    if (name === "class") {
      for (const part of decoded.split(/\s+/)) {
        if (part) {
          el.classes.add(part);
        }
      }
    } else if (name === "id") {
      el.id = decoded;
    } else if (name === "value") {
      el.value = decoded;
    } else if (name === "checked") {
      el.checked = true;
    }
    const key = datasetKey(name);
    if (key) {
      el.dataset[key] = hasValue ? decoded : "";
    }
  }
}

const VOID_TAGS = new Set(["meta", "link", "input", "img", "col", "br", "hr", "area", "base", "source"]);

function findTagEnd(html: string, start: number): number {
  let quote = "";
  for (let i = start; i < html.length; i++) {
    const ch = html[i];
    if (quote) {
      if (ch === quote) {
        quote = "";
      }
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      continue;
    }
    if (ch === ">") {
      return i;
    }
  }
  return -1;
}

function parseHtml(html: string): MiniDocument {
  const doc = new MiniDocument();
  const stack: MiniEl[] = [doc.root];
  let i = 0;
  while (i < html.length) {
    if (html.startsWith("<!DOCTYPE", i) || html.startsWith("<!doctype", i)) {
      const end = html.indexOf(">", i);
      i = end + 1;
      continue;
    }
    if (html.startsWith("<!--", i)) {
      const end = html.indexOf("-->", i);
      i = end + 3;
      continue;
    }
    if (html[i] === "<" && html[i + 1] === "/") {
      const end = html.indexOf(">", i);
      const tag = html.slice(i + 2, end).trim().toLowerCase();
      while (stack.length > 1 && stack[stack.length - 1].tag !== tag) {
        stack.pop();
      }
      if (stack.length > 1) {
        stack.pop();
      }
      i = end + 1;
      continue;
    }
    if (html[i] === "<") {
      const end = findTagEnd(html, i + 1);
      let raw = html.slice(i + 1, end).trim();
      let selfClosing = false;
      if (raw.endsWith("/")) {
        selfClosing = true;
        raw = raw.slice(0, -1).trim();
      }
      const space = raw.search(/\s/);
      const tag = (space === -1 ? raw : raw.slice(0, space)).toLowerCase();
      const attrText = space === -1 ? "" : raw.slice(space);
      const el = new MiniEl(tag);
      el.owner = doc;
      parseAttrs(el, attrText);
      const parent = stack[stack.length - 1];
      parent.children.push(el);
      el.parent = parent;
      if (!selfClosing && !VOID_TAGS.has(tag)) {
        stack.push(el);
      }
      i = end + 1;
      continue;
    }
    const next = html.indexOf("<", i);
    const text = html.slice(i, next === -1 ? html.length : next);
    const parent = stack[stack.length - 1];
    parent.textContent += text;
    if (parent.tag === "textarea" && text.trim()) {
      parent.value = decode(text.trim());
    }
    i = next === -1 ? html.length : next;
  }
  const htmlEl = doc.root.children.find((child) => child.tag === "html");
  const body = htmlEl?.children.find((child) => child.tag === "body");
  if (!htmlEl || !body) {
    throw new Error("webview html is missing html/body");
  }
  doc.documentElement = htmlEl;
  doc.body = body;
  return doc;
}
