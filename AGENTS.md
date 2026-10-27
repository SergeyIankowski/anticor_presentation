# Project workflow

This is a pnpm workspace. Each `instances/<domain>/` folder contains a separate Node.js project with its own `src/parse.js` Playwright parser and `npm run parse` command. Shared browser, normalization, validation, and output code lives in `packages/harvest-core`.

Create every new site under `instances/<domain>/` as an instance of `template/` using `pnpm site:new <domain>`, then run `pnpm install`. Keep `src/parse.js` consistent with the template; put domain-specific seeds/selectors in `src/site.js` and extraction logic in `src/extract.js` (plus optional helpers such as `src/prices.js`). Implement and validate the extraction before refreshing the site's output. The uninstantiated template is excluded from the workspace.

- Install: `pnpm install`, then `pnpm browser:install`.
- Refresh one site: run `npm run parse` in that domain's folder, or `pnpm --filter @anticor/<site-package> parse` from the root.
- Refresh all sites: `pnpm parse`.
- Verify changes: `pnpm check`, `pnpm test`, `pnpm test:browser`, and a live run with `--output-dir` pointing at a temporary folder when appropriate.
- Biome is configured at the workspace root. Use `pnpm lint` for linting, `pnpm lint:fix` for safe lint fixes, and `pnpm format` for formatting. Keep the template and site entry points consistently formatted.
- The root `schema.json` is the company comparison contract; `schemas/site-harvest.schema.json` validates full harvests.
- Unified service keys live in `packages/harvest-core/src/services.js`. When a site names an existing service differently, add or extend a rule there and run `pnpm services:keys`; services offered by one site only keep their own `<domain>:<id>` key.
- Keep source URLs, original price text, qualified amounts, and per-page errors. Use current page content when refreshing data; do not fill missing prices from old JSON.
- The local skill `.codex/skills/site-harvest-parser/SKILL.md` describes instance creation and JSON packaging. Live refreshes use the site-specific Node.js projects under `instances/`.

# Code discovery

Prefer codebase-memory-mcp graph tools (`search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `search_code`) for code discovery. Index the repository first when needed. Use text search for configs and literals, or when graph results are insufficient.
