# ANTIKOR-MINSK — antikor-minsk.by

Site-specific parser for <https://antikor-minsk.by/>. Only this instance is owned by this task. `src/parse.js` remains byte-identical to `template/src/parse.js`; the exported shared runner handles crawling, snapshots, normalization, schema validation and publishing.

## Live inspection and scope

Inspected and harvested on 2026-10-26 using Playwright Chromium. The public homepage returned HTTP 200. Navigation points to homepage sections; the three package descriptions are local detail popups, not separate service pages. Canonical service URLs therefore remain `https://antikor-minsk.by/`, with no fragments. Each `name_original` occurs in the saved homepage text.

The calculator has 68 selectable makes and 1,019 reachable model options. `src/enrich.js` selects every make, waits for its `GET /options.php` response and model list, then selects every model by **option index**, dispatching the site's actual change handler and reading all three displayed price cards. This preserves models sharing one numeric option value. Price arithmetic and numeric prices are not copied into production parser code. All displayed prices retain `от` and BYN; no online-booking discount is applied. Initial prices without an automobile selection are separate `unselected` rows, not universal prices.

The live options response also contains 14 models for Isuzu, Smart and Weltmeister, whose makes are absent from the visible selector. They are preserved in `calculator.inaccessible_options`, not published as selectable vehicle prices. Placeholder choices are excluded from model prices. No make in the visible selector lacked models.

## Published coverage

- 1 harvested page, plus the calculator options endpoint recorded as source evidence.
- 5 services: three anticorrosion packages, `Зачистка + консервация`, and the free lift assessment.
- 3,060 qualified price rows: three packages × (1,019 selected models + one initial state).
- 1,020 vehicle entries. The site identifies makes/models rather than body-size classes; the shared normalizer assigns a class only when the model label supplies one, otherwise `other`.
- Phone, address, daily opening hours, Telegram/Viber/WhatsApp links; package-specific Noxudol/Mercasol materials; technology, five preparation/application steps, benefits and source claims.

Preparation/conservation is explicitly extra and priced only after washing and drying; its `prices` array is empty. The free lift assessment has no published numeric amount, so its price array is also empty. The homepage advertises both a written warranty up to five years and a benefit statement from one to seven years; both remain site claims, with the inconsistency documented. Historical portfolio/review material is page evidence, not current transaction pricing.

## Run and verify

From this instance:

```sh
npm run parse
npm run parse -- --output-dir /tmp/antikor-minsk.by-preview
```

From the repository root:

```sh
node --test instances/antikor-minsk.by/test/extract.test.js
node_modules/.bin/biome check instances/antikor-minsk.by/src instances/antikor-minsk.by/test
cmp template/src/parse.js instances/antikor-minsk.by/src/parse.js
```

Chromium/network runs need the authorized elevated execution environment. No installation or shared-file edits are required. The parser aborts publication if a required page, calculator state coverage, numeric price, package description, or source anchor is missing.

The test fixture is a compact subset of the live preview snapshot (Acura CL and EL, which share one option value). Tests cover both schemas, exact source anchors, distinct model rows, qualified amounts, updated/missing price text, incomplete calculator states, and nonnumeric services. Live preview and final runs additionally exercise every reachable state. `parse-report.json` records the actual run status, failures, timestamps and snapshot directory; `parsed/validation_report.json` records schema validation.

Artifacts are `antikor-minsk.by.json`, `parsed/company.json` (root comparison contract), `parsed/presentation_data.json`, validation/run reports, and runner-managed snapshots. `buildSite(pages, date)` can rebuild comparison data offline directly from saved enriched page snapshots. No blocker remains; the inaccessible makes and conflicting warranty statements are source limitations.
