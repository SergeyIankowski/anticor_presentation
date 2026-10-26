---

name: site-harvest-parser
description: Create website parser instances from the project template under instances/<domain>/ and validate or package harvested JSON for presentations. Use for new site projects, refreshes through their Node.js parsers, and offline JSON normalization.
---

# Site Harvest Parser

Use this skill for site parser projects and presentation data. Resolve project paths relative to the workspace root and helper paths relative to this skill directory.

## Site instances

All site projects belong in `instances/<domain>/`, including their source code, harvest JSON, parsed output, snapshots, and history. Keep `template/` and shared packages at the workspace root. Honor an explicit output-folder override for the requested run.

For a new site in this monorepo:

1. Determine the domain from the supplied URL; check whether `instances/<domain>/` already exists.
2. Create a missing instance with `pnpm site:new <domain>` from the workspace root. This copies `template/` and fills in the site identity. Reuse existing instances rather than overwriting their source files.
3. Run `pnpm install` to link the workspace package. Configure the site's actual URLs, selectors, and discovery rules in `instances/<domain>/src/site.js`; implement extraction in `src/extract.js` and optional helpers such as `src/prices.js`. Keep `src/parse.js` consistent with the template.
4. For a refresh, run `npm run parse` inside `instances/<domain>/`, or use the package's pnpm filter from the workspace root. The Node.js parser uses Playwright and writes `<domain>.json`, `parsed/presentation_data.json`, `parsed/company.json`, and validation/run reports within that instance.
5. Verify schema validation and the run report. Report any missing pages or extraction failures without marking stale output as refreshed.

Do not create new domain folders at the workspace root. If this skill is used outside this monorepo and the template/generator is absent, still use `instances/<domain>/` for data by default; do not assume the project-specific generator exists there.

## Offline JSON packaging

1. Identify the supplied input JSON, or use `instances/<domain>/<domain>.json` for a known instance. Derive the domain from its source URL when necessary.
2. Unless the user chooses another destination, use `instances/<domain>/parsed/`.
3. Use the supplied schema when present; otherwise read [references/site-presentation-schema.json](references/site-presentation-schema.json).
4. Run the bundled `scripts/parse_harvest.py` with the input, schema, and destination. It performs no network requests and requires only the Python standard library.
5. Verify the generated JSON and report its exact location.

The offline helper writes:

- `presentation_data.json`: a compact, presentation-oriented representation of the source data.
- `validation_report.json`: schema status, input path, output path, and warnings.

## Data rules

- Preserve source URLs and the source retrieval date.
- Preserve source text in its original language; do not silently translate or rewrite it.
- Preserve exact numbers as numbers and ranges, estimates, or qualified values as strings.
- Keep marketing statements under `site_claims` or `claims_and_caveats`; do not present them as independently verified facts.
- Preserve unknown top-level and nested fields instead of dropping them because they are not part of the baseline schema.
- Do not invent missing products, locations, reviews, ratings, guarantees, or structured-data fields. Represent absent information as `null` or a warning.
- Do not delete or overwrite unrelated files. The offline helper replaces only its two named output files. Live parsers manage their output backups within the instance.

## Command

```bash
pnpm site:new example.com
pnpm install
# Configure instances/example.com/src/site.js and src/extract.js, then:
cd instances/example.com
npm run parse
```

For offline packaging from the workspace root with the project-local skill:

```bash
python3 .codex/skills/site-harvest-parser/scripts/parse_harvest.py \
  --input instances/example.com/example.com.json \
  --schema .codex/skills/site-harvest-parser/references/site-presentation-schema.json \
  --output-dir instances/example.com/parsed
```
