# Repository Guidelines

## Project Structure & Module Organization
- `entrypoints/` contains extension entrypoints: `background.ts`, `content.ts`, and the React popup UI in `entrypoints/popup/`.
- `assets/` stores shared images and icons; `public/` holds static files packaged with the extension.
- `docs/` contains product and UI specs (see `docs/spec.md`, `docs/popup.md`, `docs/options.md`).
- Root config files include `wxt.config.ts` and `tsconfig.json`; WXT handles bundling and manifest generation.

## Build, Test, and Development Commands
- `pnpm dev`: run the extension in dev mode with hot reload.
- `pnpm dev:firefox`: run the dev build targeting Firefox.
- `pnpm build`: produce a production build.
- `pnpm build:firefox`: production build for Firefox.
- `pnpm zip`: package the extension as a ZIP for distribution.
- `pnpm compile`: type-check only (TypeScript, no emit).

## Coding Style & Naming Conventions
- TypeScript + React with JSX (`.ts` for background/content, `.tsx` for UI).
- Use 2-space indentation as seen in existing files.
- Prefer clear, descriptive component and function names; keep filenames aligned with entrypoint roles (e.g., `background.ts`, `content.ts`).
- No formatter or linter is configured yet; keep changes consistent with existing style.

## Testing Guidelines
- Vitest is the test runner; config lives in `vitest.config.ts` (repo root, alongside `wxt.config.ts`) and keeps the WXT `@/` path alias working in tests.
- Run tests with `pnpm test` (single run, `vitest run`); use `npx vitest` for watch mode.
- Test files are named `*.test.ts` and colocated next to the code they cover (for example, `src/shared/config.test.ts`).
- The suite covers pure logic only (node environment; no DOM, extension APIs, or jsdom). Use `pnpm compile` for type safety checks.

## Commit & Pull Request Guidelines
- Commit messages use a short imperative style (for example, `Add ...`, `Fix ...`) with no scope prefixes.
- PRs should include: a brief summary, test/validation notes, and screenshots for UI changes (popup/options).
- Link related issues or specs in `docs/` when behavior changes.

## Security & Configuration Notes
- User settings are expected to live in `chrome.storage.sync`; keep schema changes backward compatible.
- The extension runs on Bilibili pages; document any new URL matches or permissions.

# KANBAN Workflow 

Unified Kanban Columns (Project Level):

* **Backlog** (Requirement Pool)
* **To Do** (Sprint/Current Week To-Do)
* **In Progress** (Development in Progress)
* **In Review** (Code Review)
* **Testing / QA** (QA Testing in Progress)
* **Blocked** (Blocked)
* **Done** (Accepted)

> Each task card must include: Objective, Subtask, Developer, Estimated Complexity (S/M/L), Acceptance Criteria, Test Cases, Related Documents/Designs, and Dependent Tasks.

## Task Status Definition (Strict)

* **Development (In Progress)**: In addition to completing the task, unit tests (if applicable) must also be included.
* **Code Review (In Review)**: The PR description must clearly state the changes, how they will be implemented, the impact, and the risk of regression. Approved by at least one reviewer (you can switch roles). * **QA (Testing):** QA executes test cases, records bugs, and classifies them into P0/P1/P2. All P0 issues must be resolved, and P1 issues require evaluation. After completion, the QA writes "QA Passed" on the card (you switch roles).
* **Acceptance/Done**: The product manager or maintainer performs final acceptance of the acceptance criteria. If passed, the card is moved to Done. (You switch roles)

Kanban data is recorded in the `./kanban/` directory (Markdown format).
- `./kanban/board.md` maintains the Kanban board status.
- The `./kanban/issues/` directory stores detailed Markdown descriptions of each task. Each task has a file named with the task ID, such as `A-1-initialize-repo.md`. This file should not only record the task description, but also issues encountered during development and their solutions, bug records, and review comments.

# MCP Servers

This project uses Chrome DevTools MCP for debugging and live reloading during development.

You should use it when you need to debug the extension's background script or content script.
