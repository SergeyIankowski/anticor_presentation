# Антикория — antikoriya.by

Live public source inspected and harvested on 2026-10-26: https://antikoriya.by/.
The site is a single page. Navigation uses section anchors; all service source URLs
are the actual homepage URL, without a fragment. Service names are the verbatim
card headings «Базовый», «Стандарт», «Премиум» and appear in source page text.

## Extraction

`src/parse.js` is unchanged from the template and uses the exported shared runner.
`src/site.js` seeds the required homepage; `src/browser.js` uses the shared
`extractPage` and `enrichPage` hook, waits for client rendering, then clicks every
`#vehicle-tabs button[data-service-key]`. Every state saves its timestamp, original
text, source URL, category description, price text and tariff inclusions. Only the
desktop `#pricing-grid` is read to avoid duplicate mobile cards. The initial state
is restored before the shared page snapshot is refreshed.

`src/extract.js` builds three services with five vehicle prices each using shared
`parseMoney`, `vehicleClass`, contact and claim helpers. It rejects missing selector
states, missing tariff cards and unrecognized monetary values. Numeric prices are
read from current rendered cards; no embedded numeric price table or old-output
fallback exists. Quote-only or absent amounts produce no price entry.

Current successful output: **1 page, 5 vehicle categories, 3 services, 15 prices**;
no page failures. Both the full-harvest schema and root comparison schema passed.
Prices are in BYN, all qualified «от»; `price` remains null and `price_min` holds the
published lower bound. Original strings, inspection qualifier, package inclusions,
package unit and sources are retained. Vehicle-specific differences (including
frame treatment) are preserved in descriptions and price notes.

Two Gomel addresses, two common contact phones, daily working hours and Telegram
are preserved. Materials NHOU, the one-working-day process, warranty wording,
free wash/inspection statements and company history are source claims, not
independently verified facts. Raw snapshots retain the remaining page evidence.

## Limitations

- Final amounts are fixed after inspection; there is no published exact total,
  per-square-metre rate, separate materials price or separately priced wash.
- Vehicle groups overlap: the frame group includes pickups; the minibus group
  includes minivans. The normalized commercial group is `other` because it spans
  several vehicle classes. Source wording is retained alongside the mapping.
- Both phone numbers are in one common block; the site does not assign an
  individual number to each address.
- Company experience counters and warranty statements are recorded as published;
  marketing claims are not reconciled with the current calendar or independently
  certified. No detailed product grade or extra technology steps are invented.
- Analytics can delay the browser `load` event; the shared runner navigates to
  `domcontentloaded`, caps its load wait, and the hook waits for the actual pricing
  controls. This did not prevent either successful harvest.

## Checks and refresh

From the repository root:

```sh
node --test instances/antikoriya.by/test/*.test.js
pnpm exec biome check instances/antikoriya.by/src instances/antikoriya.by/test --error-on-warnings
```

From this instance (public network/Chromium permission required):

```sh
npm run parse -- --output-dir /tmp/antikoriya.by-preview
npm run parse
```

The fixture in `test/fixtures/home.json` is a compact selection of the successful
live snapshot, retaining all pricing states. Tests cover complete state coverage,
qualified amounts, original whitespace, fresh amount changes, quote-only tariffs,
missing states/cards, schema validation, source anchors, contacts/material claims
and template entry-point equality. Output files are `antikoriya.by.json`,
`parsed/company.json`, `parsed/presentation_data.json`,
`parsed/validation_report.json`, `parse-report.json`, and timestamped snapshots.
