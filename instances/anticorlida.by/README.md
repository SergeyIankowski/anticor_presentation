# Anticorlida — anticorlida.by

This instance uses the shared `@anticor/harvest-core` crawler, output publisher,
normalization and schema validation. `src/parse.js` is unchanged from the template.

## Live inspection and coverage

Inspected https://anticorlida.by/ in Chromium on 2026-10-26 (HTTP 200).
The public sitemap contains only the homepage and `/cookie`; the latter is a
cookie policy and is outside the service/company harvest. All service, process,
portfolio and contact navigation links target sections of the homepage.

- Two offers: «Комплексная защита автомобиля от коррозии» and
  «Антикоррозийная экспертиза вашего автомобиля бесплатно».
- Five included treatment areas are retained as `treatment_scope`, not promoted
  into separately priced offers. Six process steps are retained as `technology`.
- Every one of the six advantages accordions is opened and captured by the
  `enrichPage` hook, including the initially hidden materials and guarantee text.
- Contacts include the published phone, full Lida address and navigator
  coordinates. The site's legal identity is «ИП Бунжа О.Я.», УНП 591398902;
  `metadata.brand` uses the customer's Anticorlida identity.
- `robots.txt` and `sitemap.xml` were inspected. The motor-compartment link
  `#popup:superproduct` was clicked: it exposed no popup or additional offer.
  No price selector, price tabs, store or numeric tariff was found.

## Price and evidence policy

There is no numeric price list. Both offers have `prices: []`; the inspection's
original «бесплатно» wording is retained in its source heading. No zero amount
is synthesized. No vehicle classes, billing units, completion duration, precise
working hours, material brands or guarantee period are published. Vehicle types
remain empty. BYN is a comparison-contract convention for Belarus, explicitly
identified as an inference in warnings; the page does not state a currency.
DETAIL is the drying equipment brand, not an anticorrosion material.

All service URLs are the actual harvested homepage URL without fragments; each
`name_original` occurs in its source page text. Claims are identified as the
site's statements, with source URLs. Raw page snapshots and enrichment evidence
are preserved by the shared runner. Newly introduced price controls or numeric
rouble/BYN amounts cause extraction to fail for inspection rather than silently
publishing unexamined price states.

## Run and verify

From this instance:

```sh
npm run parse
npm run parse -- --output-dir /tmp/anticorlida.by-preview
node --test test/*.test.js
```

From the repository root:

```sh
node_modules/.bin/biome check instances/anticorlida.by/src instances/anticorlida.by/test
cmp template/src/parse.js instances/anticorlida.by/src/parse.js
```

`test/fixtures/home.json` is a reduced real homepage snapshot from the live
preview. Tests cover source names/URLs, legal identity, phones, free wording,
non-price numbers such as drying power, treatment scope, hidden claims, schema
compliance, missing-page behavior and detection of newly introduced pricing.

Outputs: `anticorlida.by.json`, `parsed/company.json`,
`parsed/presentation_data.json`, `parsed/validation_report.json`,
`parse-report.json`, and `snapshots/<run-id>/001.json`.
