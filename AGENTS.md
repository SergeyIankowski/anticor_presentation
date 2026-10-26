# Project workflow

This is a pnpm workspace. Each domain folder contains a separate Node.js project with its own `src/parse.js` Playwright parser and `npm run parse` command. Shared browser, normalization, validation, and output code lives in `packages/harvest-core`.

- Install: `pnpm install`, then `pnpm browser:install`.
- Refresh one site: run `npm run parse` in that domain's folder, or `pnpm --filter @anticor/<site-package> parse` from the root.
- Refresh all sites: `pnpm parse`.
- Verify changes: `pnpm test`, `pnpm test:browser`, and a live run with `--output-dir` pointing at a temporary folder when appropriate.
- The root `schema.json` is the company comparison contract; `schemas/site-harvest.schema.json` validates full harvests.
- Keep source URLs, original price text, qualified amounts, and per-page errors. Use current page content when refreshing data; do not fill missing prices from old JSON.
- The local skill `.codex/skills/site-harvest-parser/SKILL.md` describes offline JSON packaging. Live refreshes use the site-specific Node.js projects.

# Code discovery

Prefer codebase-memory-mcp graph tools (`search_graph`, `trace_path`, `get_code_snippet`, `query_graph`, `search_code`) for code discovery. Index the repository first when needed. Use text search for configs and literals, or when graph results are insufficient.
