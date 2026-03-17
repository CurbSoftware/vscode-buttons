# Examples

The `examples/` directory contains 29 ready-to-use `.buttons` files. Copy any file to a project root as `.buttons` to try it.

## Language & Framework Examples

| Example | Description | Key Features |
|---------|-------------|--------------|
| [node](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/node/.buttons) | npm/pnpm workflows | Macros, generated scripts, ports, links |
| [python](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/python/.buttons) | Virtualenv, pytest, linting | Rows layout, macros |
| [rust](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/rust/.buttons) | Cargo build, test, clippy, docs | 5 groups, custom colors |
| [go](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/go/.buttons) | Go build, test, modules, codegen | Race detection, benchmarks, mock generation |
| [django](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/django/.buttons) | manage.py commands, migrations | 6 groups, fixtures, static files |
| [rails](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/rails/.buttons) | Rails server, generators, RSpec | Cartesian-generated generators |
| [java-gradle](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/java-gradle/.buttons) | Spring Boot, Gradle tasks | JaCoCo, SpotBugs, Swagger links |
| [dotnet](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/dotnet/.buttons) | ASP.NET Core, Entity Framework | EF migrations, user secrets |
| [elixir-phoenix](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/elixir-phoenix/.buttons) | Phoenix, Ecto, Mix | Generated Phoenix generators, LiveDashboard |
| [flutter](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/flutter/.buttons) | Flutter build, test, codegen | Device management, build runner |
| [android](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/android/.buttons) | Gradle, ADB commands | Screenshots, logcat, reverse ports |
| [ios-xcode](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/ios-xcode/.buttons) | xcodebuild, simulators | CocoaPods, SPM, complex macros |
| [latex](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/latex/.buttons) | pdfLaTeX, BibTeX, latexmk | Flow layout, word count |
| [data-science](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/data-science/.buttons) | Jupyter, conda, ML training | MLflow, TensorBoard, DVC, GPU training |

## Infrastructure & DevOps Examples

| Example | Description | Key Features |
|---------|-------------|--------------|
| [docker](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/docker/.buttons) | Docker Compose workflows | Variables, danger commands, links |
| [git](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/git/.buttons) | Git inspection, sync, branches | Dangerous reset/clean with confirm |
| [kubernetes](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/kubernetes/.buttons) | kubectl, Helm, port-forward | Generated resource inspectors, Helm lifecycle |
| [terraform](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/terraform/.buttons) | Plan, apply, destroy, workspaces | Rows layout, `group_bg_color` |
| [aws](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/aws/.buttons) | S3, Lambda, CloudFormation, ECS | Profile/region macros, 6 service groups |
| [devops-ci](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/devops-ci/.buttons) | GitHub CLI, Docker build, deploy | PR workflows, deployment pipelines |
| [database](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/database/.buttons) | PostgreSQL, Redis, Prisma | psql macros, Redis CLI, Prisma Studio |

## Architecture & Multi-Service Examples

| Example | Description | Key Features |
|---------|-------------|--------------|
| [monorepo](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/monorepo/.buttons) | Turborepo/pnpm workspaces | 2D cartesian generation (4 packages × 3 scripts) |
| [fullstack-nextjs](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/fullstack-nextjs/.buttons) | Next.js + Prisma + Tailwind | Prisma Studio, Playwright E2E, bundle analyzer |

## Layout & Feature Showcases

| Example | Description | Key Features |
|---------|-------------|--------------|
| [minimal](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/minimal/.buttons) | Simplest possible config (9 lines) | Inline button syntax |
| [compact-table](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/compact-table/.buttons) | Table layout showcase | `layout = "table"`, compact, systemd services |
| [flow-layout](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/flow-layout/.buttons) | Flow layout showcase | `layout = "flow"`, `show_command = false`, generated npm scripts |
| [columns-layout](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/columns-layout/.buttons) | Columns layout showcase | `layout = "columns"`, `group_bg_color`, 3-column dashboard |
| [settings-showcase](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/settings-showcase/.buttons) | All features demo | Colors, danger, URLs, ports, generate, terminals, disabled groups |
| [user-profile](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/user-profile/.buttons) | Personal `~/.buttons` example | Git shortcuts, system tools, Docker, SSH tunnels |

## Adapting an Example

1. Copy one of the example `.buttons` files to the target project root as `.buttons`.
2. Rename groups and labels to match the project vocabulary.
3. Replace ports, URLs, script names, and variables.
4. Add `danger = true` and `confirm = true` to any command that should require confirmation.
5. Choose a [layout](LAYOUTS.md) that fits the number and type of buttons.

## Creating a User Profile

Copy the [user-profile example](https://github.com/CurbSoftware/vscode-buttons/blob/main/examples/user-profile/.buttons) to `~/.buttons` and customize it with your personal shortcuts. See [User Profile](USER-PROFILE.md) for details.
