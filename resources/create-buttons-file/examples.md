# Buttons file examples

Every example is a complete valid file or a drop-in `buttons[]` item. Copy only what the repo actually has.

## Empty

```json
{
  "version": 1,
  "buttons": []
}
```

## Node package.json (root)

```json
{
  "version": 1,
  "buttons": [
    { "type": "script", "file": "package.json", "script": "dev", "packageDir": "", "packageManager": "pnpm", "note": "Vite dev server" },
    { "type": "script", "file": "package.json", "script": "build", "packageDir": "", "packageManager": "pnpm" },
    { "type": "script", "file": "package.json", "script": "test", "packageDir": "", "packageManager": "pnpm" },
    { "type": "script", "file": "package.json", "script": "lint", "packageDir": "", "packageManager": "pnpm" }
  ]
}
```

Use `npm` / `yarn` / `bun` instead of `pnpm` when that is the root lockfile.

## Nested package (monorepo)

```json
{
  "type": "script",
  "file": "packages/api/package.json",
  "script": "start",
  "packageDir": "packages/api",
  "packageManager": "pnpm"
}
```

## Makefile / composer.json / justfile

```json
[
  { "type": "script", "file": "Makefile", "script": "build", "packageDir": "", "packageManager": "make" },
  { "type": "script", "file": "composer.json", "script": "test", "packageDir": "", "packageManager": "composer" },
  { "type": "script", "file": "justfile", "script": "deploy", "packageDir": "", "packageManager": "just" }
]
```

Nested: `"file": "services/api/Makefile"`, `"packageDir": "services/api"`.

## Cargo.toml / go.mod (synthetic build, test, run)

```json
[
  { "type": "script", "file": "Cargo.toml", "script": "build", "packageDir": "", "packageManager": "cargo" },
  { "type": "script", "file": "Cargo.toml", "script": "test", "packageDir": "", "packageManager": "cargo" },
  { "type": "script", "file": "Cargo.toml", "script": "run", "packageDir": "", "packageManager": "cargo" },
  { "type": "script", "file": "go.mod", "script": "build", "packageDir": "", "packageManager": "go" },
  { "type": "script", "file": "go.mod", "script": "test", "packageDir": "", "packageManager": "go" },
  { "type": "script", "file": "go.mod", "script": "run", "packageDir": "", "packageManager": "go" }
]
```

Nested crate: `"file": "crates/cli/Cargo.toml"`, `"packageDir": "crates/cli"`. Extra cargo tasks (`clippy`, `fmt`) are command entries:

```json
{ "type": "command", "command": "cargo clippy --all-targets -- -D warnings", "note": "clippy" }
```

## Shell and Python entry files

`file` and `script` are the same relative path. `packageDir` is the file's directory. Runtime uses the basename (`bash migrate.sh`, `python app.py`).

```json
[
  { "type": "script", "file": "deploy.sh", "script": "deploy.sh", "packageDir": "", "packageManager": "shell" },
  { "type": "script", "file": "scripts/migrate.sh", "script": "scripts/migrate.sh", "packageDir": "scripts", "packageManager": "shell" },
  { "type": "script", "file": "app.py", "script": "app.py", "packageDir": "", "packageManager": "python" },
  { "type": "script", "file": "apps/web/main.py", "script": "apps/web/main.py", "packageDir": "apps/web", "packageManager": "python" }
]
```

Allowed Python entry basenames only: `app.py`, `main.py`, `manage.py`, `run.py`, `server.py`. Other Python files:

```json
{ "type": "command", "command": "python scripts/seed.py" }
```

## Venv

Root `venv/`:

```json
[
  { "type": "script", "file": "venv", "script": "Activate venv", "packageDir": "", "packageManager": "python" },
  { "type": "script", "file": "venv", "script": "Deactivate", "packageDir": "", "packageManager": "python" },
  { "type": "script", "file": "venv", "script": "Install requirements", "packageDir": "", "packageManager": "python" }
]
```

Nested `.venv` (`packages/api/.venv`, requirements next to it):

```json
[
  { "type": "script", "file": "packages/api/.venv", "script": "Activate venv", "packageDir": "packages/api", "packageManager": "python" },
  { "type": "script", "file": "packages/api/.venv", "script": "Deactivate", "packageDir": "packages/api", "packageManager": "python" },
  { "type": "script", "file": "packages/api/.venv", "script": "Install requirements", "packageDir": "packages/api", "packageManager": "python" }
]
```

## Command entries

```json
[
  { "type": "command", "command": "docker ps", "note": "List running containers" },
  { "type": "command", "command": "cd packages/api && pytest -q" },
  { "type": "command", "command": "git status -sb" }
]
```

Absolute path outside the workspace (script):

```json
{
  "type": "script",
  "file": "/opt/tools/package.json",
  "script": "build",
  "packageDir": "/opt/tools",
  "packageManager": "npm"
}
```

## Parent `args` (always-on flags)

```json
{
  "type": "script",
  "file": "package.json",
  "script": "test",
  "packageDir": "",
  "packageManager": "pnpm",
  "args": "--coverage",
  "note": "test with coverage"
}
```

Resolves to `pnpm test --coverage`. Children append after that.

## Args variants (child-only)

```json
{
  "type": "script",
  "file": "package.json",
  "script": "dev",
  "packageDir": "",
  "packageManager": "pnpm",
  "note": "dev server",
  "children": [
    { "args": "--host", "note": "LAN" },
    { "args": "--port 3001", "note": "alt port" },
    { "args": "--include app1 app2", "note": "app1 + app2" }
  ]
}
```

`pnpm dev --host`, `pnpm dev --port 3001`, `pnpm dev --include app1 app2`.

## Nested args (any depth)

```json
{
  "type": "command",
  "command": "pnpm test",
  "children": [
    {
      "args": "--filter web",
      "note": "web",
      "children": [
        { "args": "--watch", "note": "web watch" },
        { "args": "--coverage", "note": "web coverage" }
      ]
    },
    {
      "args": "--filter api",
      "children": [{ "args": "--watch" }]
    }
  ]
}
```

Resolves to `pnpm test --filter web`, `pnpm test --filter web --watch`, `pnpm test --filter web --coverage`, `pnpm test --filter api`, `pnpm test --filter api --watch`.

## Mixed children (args + command + script)

```json
{
  "type": "script",
  "file": "package.json",
  "script": "dev",
  "packageDir": "",
  "packageManager": "pnpm",
  "note": "dev server",
  "children": [
    { "args": "--include app1 app2", "note": "app1 + app2" },
    { "type": "command", "command": "pnpm dev --filter web", "note": "web only" },
    {
      "type": "script",
      "file": "apps/web/package.json",
      "script": "dev",
      "packageDir": "apps/web",
      "packageManager": "pnpm"
    }
  ]
}
```

The command and nested script resolve independently of `pnpm dev`. The args child stays in sync if the package manager changes.

## Command children of a command; args on a nested command

```json
{
  "type": "command",
  "command": "echo parent",
  "children": [
    {
      "type": "command",
      "command": "echo child",
      "children": [{ "args": "--x" }]
    }
  ]
}
```

Child command is `echo child`. Its variant is `echo child --x` (not `echo parent --x`).

## Full kitchen-sink file

```json
{
  "version": 1,
  "buttons": [
    {
      "type": "script",
      "file": "package.json",
      "script": "dev",
      "packageDir": "",
      "packageManager": "pnpm",
      "note": "dev server",
      "children": [
        { "args": "--host" },
        {
          "args": "--filter web",
          "children": [{ "args": "--open" }]
        },
        { "type": "command", "command": "pnpm --filter api dev" }
      ]
    },
    { "type": "script", "file": "package.json", "script": "build", "packageDir": "", "packageManager": "pnpm" },
    { "type": "script", "file": "package.json", "script": "test", "packageDir": "", "packageManager": "pnpm", "args": "--run" },
    { "type": "script", "file": "packages/api/package.json", "script": "start", "packageDir": "packages/api", "packageManager": "pnpm" },
    { "type": "script", "file": "Makefile", "script": "build", "packageDir": "", "packageManager": "make" },
    { "type": "script", "file": "composer.json", "script": "test", "packageDir": "", "packageManager": "composer" },
    { "type": "script", "file": "justfile", "script": "deploy", "packageDir": "", "packageManager": "just" },
    { "type": "script", "file": "Cargo.toml", "script": "build", "packageDir": "", "packageManager": "cargo" },
    { "type": "script", "file": "Cargo.toml", "script": "test", "packageDir": "", "packageManager": "cargo" },
    { "type": "script", "file": "Cargo.toml", "script": "run", "packageDir": "", "packageManager": "cargo" },
    { "type": "script", "file": "go.mod", "script": "build", "packageDir": "", "packageManager": "go" },
    { "type": "script", "file": "go.mod", "script": "test", "packageDir": "", "packageManager": "go" },
    { "type": "script", "file": "go.mod", "script": "run", "packageDir": "", "packageManager": "go" },
    { "type": "script", "file": "deploy.sh", "script": "deploy.sh", "packageDir": "", "packageManager": "shell" },
    { "type": "script", "file": "scripts/migrate.sh", "script": "scripts/migrate.sh", "packageDir": "scripts", "packageManager": "shell" },
    { "type": "script", "file": "app.py", "script": "app.py", "packageDir": "", "packageManager": "python" },
    { "type": "script", "file": "venv", "script": "Activate venv", "packageDir": "", "packageManager": "python" },
    { "type": "script", "file": "venv", "script": "Deactivate", "packageDir": "", "packageManager": "python" },
    { "type": "script", "file": "venv", "script": "Install requirements", "packageDir": "", "packageManager": "python" },
    { "type": "command", "command": "docker compose up", "note": "stack", "children": [
      { "args": "-d", "note": "detached" },
      { "type": "command", "command": "docker compose down" }
    ]}
  ]
}
```

Emit only the entries that exist in the target repo. Do not copy this whole list into a Node-only app.
