# Contributing to Buttons

This repository contains the Buttons VS Code extension and its documentation, sample configs, and local development scaffolding.

## Local Setup

1. Install dependencies.

```bash
npm install
```

2. Compile the extension.

```bash
npm run compile
```

3. Open the workspace in VS Code.
4. Run the `Run Buttons Extension` launch configuration.
5. In the Extension Development Host window, run `Buttons: Open Panel`.

## Recommended Workflow

Use one terminal for compilation and the VS Code debugger for the extension host.

```bash
npm run watch
```

After code changes, restart the debug session or reload the Extension Development Host window.

## Project Structure

```text
src/
  config/
  execution/
  models/
  panel/
  extension.ts
docs/
examples/
.buttons
```

## Testing The Extension

- Use the repo-root [.buttons](.buttons) file for the real project workflow.
- Replace it temporarily with any example under `examples/` when you want to test a different scenario.
- Validate compile status with `npm run compile`.
- Validate config parsing by opening the Buttons panel and confirming there are no parse errors.

## Documentation Workflow

- [README.md](README.md) is the main landing page for GitHub and Marketplace-style views.
- [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) explains first use.
- [docs/BUTTONS-FILE.md](docs/BUTTONS-FILE.md) is the config reference.
- [docs/EXAMPLES.md](docs/EXAMPLES.md) indexes sample configs.
- [docs/TROUBLESHOOTING.md](docs/TROUBLESHOOTING.md) covers common issues.

## Scope Notes

Buttons v1 supports a single repo-root `.buttons` file. Files under `examples/` are templates only and are not auto-loaded by the extension.