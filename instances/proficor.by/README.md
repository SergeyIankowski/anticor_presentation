# PROFICOR public-site parser

Uses the exported `@anticor/harvest-core` runner, browser enrichment hook, money/contact/category normalization, schema validation, and publishing. `src/parse.js` is identical to `template/src/parse.js`. No dependency installation or shared-file changes are needed.

## Run and check

From the repository root:

```sh
node --test instances/proficor.by/test/*.test.js
node_modules/.bin/biome check instances/proficor.by --error-on-warnings
```

The browser test requires Chromium process access. To refresh, run `npm run parse` inside this instance; an optional `-- --output-dir /tmp/proficor.by-preview` keeps a preview separate. Live network/browser commands require the authorized sandbox escalation.

The offline regression test rebuilds `parsed/company.json` directly from the committed `proficor.by.json` page evidence, including enrichment. It does not depend on ignored snapshot directories or parse reports. The tests cover changed source amounts, fractional amounts, lower bounds, exact prices, price units, unpriced services, incomplete matrices, unhandled interactive controls, contacts, and source anchors.

## Live evidence, 2026-10-26

Published **5 pages, 9 services, 12 price entries**, in BYN. Both root schemas passed validation. All 6 tests and scoped Biome passed. Service URLs equal harvested page URLs without fragments, and each service name is present in its source page text.

- `https://proficor.by/`: 3 vehicle cards, each with LIGHT and STANDARD complexes; 6 lower-bound prices. All amounts come from current DOM text. Vehicle labels and example models are preserved. The shared category normalizer maps «Легковые автомобили» to `sedan`, while the original examples retain the site's small-car examples.
- `https://proficor.by/antikorrozijnaya-obrabotka-elektromobilej/`: electric/hybrid treatment, with **no published amount**, so `prices: []`. General vehicle prices are not assigned to this service.
- `https://proficor.by/polirovka/`: 6 polishing services, one exact price and five lower bounds. The headlight price is explicitly **за пару**; element/body service wording and condition-dependent price notes are retained. Vehicle dimensions are unspecified, represented by `other`, not a universal fixed-price category.
- `https://proficor.by/kontakty/`: legal identity, registration number, phone, email, address and working hours.
- `https://proficor.by/sitemap/`: additional-service discovery and conflicting working-hour evidence.

No select, radio, or tab price controls were present on these pages. All static card/list rows are captured. If interactive controls appear, extraction fails until their states are implemented.

Full harvest/presentation output retains materials (DINITROL/Dinol wording and product identifiers), technology stages, warranty conditions, service duration, company statements, source URLs and retrieval times. Claims remain attributed to the website. The homepage FAQ specifies 6–8 hours, while its banner says 6 hours. Its maximum warranty has age, mileage, corrosion and inspection conditions. Contact hours differ from the sitemap and homepage variants; the dedicated contact page supplies the comparison hours.

## Partial-site limitation

The sitemap links `https://proficor.by/mojka/` and `https://proficor.by/shumoizolyacziya/`. Direct live Chromium inspection returned **HTTP 301 with an empty body** for each, without a usable redirected page. The shared runner retried them and recorded `No meaningful page content` as optional-page failures. They do not establish standalone current services or prices.

Consequently `parse-report.json` honestly reports **`partial`, `published: true`**, with 2 optional failures and 5 successful pages. The validated datasets contain current successful evidence; no stale prices, fake pages, or old JSON inputs were used. Resolving these two website responses is the remaining external limitation.

## Outputs

- `proficor.by.json`: full harvest, including successful page evidence and price enrichment.
- `parsed/company.json`: strict comparison contract.
- `parsed/presentation_data.json`: shared presentation normalization.
- `parsed/validation_report.json`: successful validation and per-page failure notes.
- `parse-report.json` and `snapshots/<run>/`: local operational report/evidence, ignored by the repository's existing rules. Failure notes also remain in the tracked harvest and validation report.

Only this instance was changed. No shared files, lockfiles, git index or git history were modified by this task.
