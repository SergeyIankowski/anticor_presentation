# Anticorrosion site parsers

Node.js 22+ and pnpm are required. Each site is a separate workspace project under `instances/<domain>/` with its own Playwright extraction code. Browser and JSON validation utilities live in `packages/harvest-core`.

Install from the repository root:

```sh
pnpm install
pnpm browser:install
```

Refresh one site from its folder:

```sh
cd instances/etm.by
npm run parse
```

The same command works inside `instances/krown.by`. You can also use `pnpm parse` in either folder. From the repository root:

```sh
pnpm parse          # all site projects, sequentially
pnpm parse:etm
pnpm parse:krown
pnpm test
pnpm test:browser   # local HTML fixtures through real Chromium
```

Biome runs across the workspace, including the template and tests:

```sh
pnpm lint          # lint; fail on warnings
pnpm lint:fix      # apply safe lint fixes
pnpm format        # format source and configuration files
pnpm check         # lint, formatting, and import-order checks
```

Active harvested JSON files are linted but keep the parser's output formatting. Snapshots, historical backups, dependencies, and temporary output folders are excluded.

Options can be passed to each site's command:

```sh
npm run parse -- --output-dir /tmp/etm-preview --max-pages 80 --timeout 30000
npm run parse -- --headed
```

`--output-dir` is relative to the current working directory. Without it, results always go to the parser's site folder, regardless of the calling directory.

Each refresh writes:

- `<domain>.json`: fresh company, services, catalog, sources, JSON-LD, and extracted page content.
- `parsed/presentation_data.json`: presentation content with source metadata.
- `parsed/company.json`: service and vehicle price sheet validated against the root `schema.json`.
- `parsed/validation_report.json`: schema validation and extraction warnings.
- `parse-report.json`: successful and failed pages and run status.
- `snapshots/<run-id>/*.json`: fetched page evidence, text, links, images, tables, and JSON-LD.
- `.history/<run-id>/`: previous output files, saved before a successful replacement.

Every service in `parsed/company.json` carries a `service_key` from the unified service list in `packages/harvest-core/src/services.js`. Sites that name the same service differently share one key, and the frontend compares them in one row; a service without a matching rule gets its own `<domain>:<service id>` key and is shown as offered only by that company. The shared runner adds the keys on every refresh. After editing the list, run `pnpm services:keys` to rewrite the keys in the published datasets without a live re-parse.

The full harvest uses `schemas/site-harvest.schema.json`. Existing manual datasets are backed up on the first successful refresh. All numeric prices come from fresh pages; missing service prices are represented by empty arrays. In particular, ETM currently describes quote-dependent services without publishing numeric service prices on the parsed pages.

Required pages or schema failures stop publication and return a nonzero exit code. Optional page failures are recorded as a partial run. The parsers retry navigation once, limit crawling to the relevant domain and sections, and preserve existing datasets if required pages cannot be fetched. Both sites require a working network/DNS connection; access challenges are reported as failures. A `.parse.lock` prevents simultaneous writes to the same output folder.

Create a new site from the reusable `template/` folder:

```sh
pnpm site:new example.com
pnpm install
```

This creates `instances/example.com/package.json` and `instances/example.com/src/{parse,site,extract}.js`, with the domain, URL, and package name filled in. Existing folders are never overwritten. Site folders under `instances/` are discovered automatically by the workspace; `template/` itself is excluded.

Each site instance follows this structure:

```text
instances/<domain>/
  package.json
  src/
    parse.js     # common command entry point, copied from template
    site.js      # this site's URLs, required pages, selectors, discovery rules
    extract.js   # this site's company, service, and price extraction
    prices.js    # optional site-specific helper
```

Configure `src/site.js` and implement `parseCompany()` and `parseServices()` in `src/extract.js`. The starter extraction deliberately reports an error until service parsing is implemented. Return `{ harvest, comparison, warnings }` from `buildSite(pages, date)`; the shared runner handles browsing, schema validation, backups, and output files. `instances/etm.by`, `instances/krown.by`, and `instances/antikorr.by` use this same layout with their own extraction implementations.

The Antikorr parser reads each combination of the price page's material-brand and vehicle-class selectors. The public price calculator replaces its table over AJAX; the parser waits for each replacement before recording the package prices, original price text, and included operations.

The Antikorim parser in `instances/antikorim.by` reads all three treatment packages across four vehicle selectors, plus film packages, sandblasting, welding, cleaning, and add-on prices. It preserves starting prices, per-arch/per-item units, and quote-only services, and stores materials, FAQs, videos, workshop contacts, and separate legal details. Refresh it with `npm run parse` inside that folder.

The Antirzha parser in `instances/antirzha.by` reads four treatment packages across all three vehicle categories on `/ceny/`, waiting for each selector state before recording prices. It preserves duration limits, warranty text, and the sandblasting rate per square metre. Other services, brand/model guides, FAQs, process details, contacts, and legal information are harvested with source URLs; services without a separate numeric price retain empty price arrays. Refresh it with `npm run parse` inside that folder.

After implementing extraction, run `npm run parse` inside the new folder. Use `--output-dir` to inspect a refresh in a temporary folder first. Future sites should always be created from `template/` using `pnpm site:new <domain>`.
