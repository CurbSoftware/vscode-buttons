# Examples

Buttons v1 loads only the `.buttons` file in the workspace root. The files under `examples/` are meant to be copied into the root of another project when you want to try a particular setup.

## Included Example Packs

- [examples/node/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/node/.buttons)
- [examples/docker/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/docker/.buttons)
- [examples/python/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/python/.buttons)
- [examples/git/.buttons](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/git/.buttons)

## Node Example

The Node example covers:

- install
- dev server
- build
- test
- lint
- generated script buttons

Use it when your project is centered on `npm`, `pnpm`, or `yarn` style scripts.

## Docker Example

The Docker example covers:

- compose up and down
- logs and shell commands
- database and service URLs
- dangerous cleanup commands that require confirmation

Use it when your project relies on `docker compose` for local services.

## Python Example

The Python example covers:

- virtual environment creation
- dependency install
- app startup
- pytest
- formatting and linting

Use it when your team wants common Python commands exposed without relying on shell history.

## Git Example

The Git example covers:

- status
- fetch and pull
- diff and log
- branch creation
- destructive reset and cleanup commands marked as dangerous

Use it when your team wants a curated set of Git actions with warnings on the risky ones.

## Adapting An Example

1. Copy one of the example `.buttons` files into the target project root as `.buttons`.
2. Rename groups and labels to match the project vocabulary.
3. Replace ports, URLs, and script names.
4. Add `danger = true` to any command that should require confirmation.
5. 