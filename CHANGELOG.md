# Changelog

All notable changes to the Buttons extension are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/).

## [1.0.0] - 2026-08-14

Initial stable release.

### Added

- Scan `package.json`, `Makefile`, `composer.json`, and `justfile` for runnable scripts, including nested packages in monorepos.
- Package-manager detection from lockfiles (`pnpm-lock.yaml`, `yarn.lock`, `bun.lockb`, `package-lock.json`).
- Two launcher surfaces kept in sync: an Activity Bar sidebar and a full-width editor panel.
- Run commands in the current or a new integrated terminal, copy the exact command, and attach inline notes.
- Custom commands stored verbatim, scoped to the project or the global profile.
- Project (`<workspace>/.buttons.json`) and global (`~/.buttons.json`) storage, with script references that recompute their command on every rescan.
- Generate vs Rescan workflow so scanning never discards existing selections, notes, or custom commands.
- Settings: `buttons.textSize` and `buttons.scriptFiles`.
- Five commands: Open Panel, Open in Editor, Rescan Scripts, Open Project Buttons File, Open Global Buttons File.
