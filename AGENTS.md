# Repository Guidelines

## Project Structure & Module Organization
- `src/` — TypeScript sources: CLI (`src/cli`), core (`src/core`), services, utils, and types.
- `tests/` — Unit, integration, and edge tests; setup in `tests/setup.ts`.
- `docs/`, `examples/`, `scripts/`, `test-fixtures/` — Supporting materials and helpers.
- `dist/` — Build output from `pnpm build` (do not edit).
- Config: `insight.config.json`, `vitest.config.ts`, `.eslintrc.json`, `.prettierrc`, `.env(.example)`.

## Build, Test, and Development Commands
- `pnpm install` — Install deps (Node ≥ 20, pnpm ≥ 8).
- `pnpm dev` — Run CLI in dev via tsx (`src/cli/index.ts`).
- `pnpm build` — Type-check + emit JS to `dist/`.
- `pnpm test` | `pnpm test:watch` — Run Vitest; watch mode for iteration.
- `pnpm test:coverage` — Generate coverage report.
- `pnpm lint` | `pnpm lint:fix` — Lint/auto-fix with ESLint.
- `pnpm format` | `pnpm format:check` — Apply/check Prettier.
- `pnpm type-check` — Strict TS checks without emitting.
- `pnpm quality` — Lint + type-check + coverage (run before PRs).

## Coding Style & Naming Conventions
- Formatting: Prettier (2 spaces, 80 cols, single quotes, semicolons, LF).
- ESLint: no unused vars, prefer `const`, avoid `any`, explicit returns warned.
- Naming: files kebab-case (`my-feature.ts`); classes/interfaces PascalCase; functions/vars camelCase; tests `*.test.ts` or `*.spec.ts`.
- Path aliases per `vitest.config.ts`: `@/core`, `@/utils`, etc.

## Testing Guidelines
- Framework: Vitest (Node env). Place tests under `tests/**` or alongside `src/**`.
- Coverage: global ≥ 80% lines/statements (see `vitest.config.ts` for specifics).
- Conventions: mirror source paths and use descriptive test names.
- Run focused suites: `pnpm test -- tests/core/foo.test.ts`.

## Commit & Pull Request Guidelines
- Commits: Conventional Commits (`feat:`, `fix:`, `docs:`, `refactor:`…).
- Before PR: run `pnpm quality`, update docs (`README.md`, `SERVE_DEMO.md` when UI/serve changes), and add/adjust tests.
- PRs must include: clear description, linked issues, rationale, and screenshots/GIFs for CLI UI or `insight serve` outputs when relevant.

## Security & Configuration
- Never commit secrets. Copy `.env.example` to `.env` locally.
- Repository settings in `insight.config.json`; update alongside feature changes.
- Review diffs in `dist/` are ignored—edit sources in `src/` only.
