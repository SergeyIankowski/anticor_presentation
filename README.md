# Anticorrosion site parsers

Node.js 22+ and pnpm are required. Each site is a separate workspace project with its own Playwright extraction code. Browser and JSON validation utilities live in `packages/harvest-core`.

Install from the repository root:

```sh
pnpm install
pnpm browser:install
```

Refresh one site from its folder:

```sh
cd etm.by
npm run parse
```

The same command works inside `krown.by`. You can also use `pnpm parse` in either folder. From the repository root:

```sh
pnpm parse          # all site projects, sequentially
pnpm parse:etm
pnpm parse:krown
pnpm test
pnpm test:browser   # local HTML fixtures through real Chromium
```

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

The full harvest uses `schemas/site-harvest.schema.json`. Existing manual datasets are backed up on the first successful refresh. All numeric prices come from fresh pages; missing service prices are represented by empty arrays. In particular, ETM currently describes quote-dependent services without publishing numeric service prices on the parsed pages.

Required pages or schema failures stop publication and return a nonzero exit code. Optional page failures are recorded as a partial run. The parsers retry navigation once, limit crawling to the relevant domain and sections, and preserve existing datasets if required pages cannot be fetched. Both sites require a working network/DNS connection; access challenges are reported as failures. A `.parse.lock` prevents simultaneous writes to the same output folder.

For a new site, create `<domain>/package.json` with an `@anticor/harvest-core` workspace dependency and a `parse` script, then implement `<domain>/src/parse.js` and extraction functions. Configure the seed pages, required pages, content selectors, allowed discovery paths, and a `build(pages, date)` function returning `{ harvest, comparison, warnings }`. Run a refresh into a temporary output folder and inspect the results before replacing the site's dataset.
