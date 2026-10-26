# Blasting.by

This instance uses the shared `@anticor/harvest-core` runner without modifying
`src/parse.js`. Only `src/site.js` and `src/extract.js` implement site-specific logic.

## Live evidence and coverage

Inspected using Chromium/Playwright on 2026-10-26:

- `https://blasting.by/`: HTTP 200, actual service descriptions, phone, address,
  opening hours, four processing stages, equipment/material descriptions, and
  customer journey. No price controls, numeric tariffs, units, vehicle classes,
  or specified turnaround times appear.
- `https://blasting.by/robots.txt` points to `/sitemaps.xml`; that sitemap points
  to `/page-sitemap1.xml`, which lists only `/` and `/contact/`.
- `https://blasting.by/contact/`: HTTP 200, title `Контакты`, but the rendered
  content says `The page you requested was not found we suggest you to go back
  to HomePage`. This is a real public-site soft-404, not a DNS/sandbox failure.
  The enrichment hook rejects it, and the shared runner records an optional
  page failure and publishes a **partial** harvest of the valid homepage.

There are four extracted offerings: anticorrosion treatment, sandblasting,
arc zinc spraying (by agreement), and welding (conditional on through-corrosion).
Welding uses the literal source phrase `сварочных работ` as `name_original`.
Inspection, preparation, degreasing and priming remain process evidence rather
than separately invented priced products. All service URLs are the actual
homepage URL, without fragments, and all names occur in page text.

## Data limitations

All services have `prices: []`. The free-inspection statement is preserved as a
site claim, not converted to a zero-priced tariff. The site says the exact price
and timing are determined after inspection. `vehicle_types` is empty, and
completion times are null. BYN is an explicitly documented comparison-currency
assumption based on the Belarus location; the website does not state currency.
No amounts, brands of consumables, or guarantee durations are inferred.

Contacts come from the homepage header: original grouping `+375 29-3 040-041`
is retained alongside normalized `+375293040041`. The address and hours retain
site wording. Technology/material evidence includes OSU-Hessler equipment, zinc,
anticorrosive/anti-gravel coatings and treatment of hidden cavities. Claims are
marked as statements by the website. Structured data and all original page text
are preserved by the shared extraction layer, including an uninformative
Organization record with empty name and generic `https://x.com/` sameAs; that
placeholder is not promoted to an official company social account.

New monetary text or interaction controls cause extraction to fail for renewed
inspection rather than silently omitting prices or control states.

## Run and verify

From the repository root:

```sh
pnpm exec biome check instances/blasting.by --error-on-warnings
node --test instances/blasting.by/test/*.test.js
```

Chromium commands and network parsing require the authorized elevated execution
context in this environment. Run the parser inside this instance:

```sh
npm run parse
# Optional isolated live preview:
npm run parse -- --output-dir /tmp/blasting.by-preview
```

Tests use a frozen live homepage JSON snapshot and a stripped DOM fixture
(`test/fixtures/home.dom.txt`, retaining structure/classes/text and removing
scripts/styles/media and unrelated attributes). They verify real enrichment
selectors, contact soft-404 rejection, source anchors, conditional services,
phone grouping, no false prices from hours/phones/step numbers, detection of new
tariffs/controls, evidence preservation, discovery and both shared JSON schemas.

Outputs: `blasting.by.json`, `parsed/company.json`,
`parsed/presentation_data.json`, `parsed/validation_report.json`,
`parse-report.json`, and timestamped `snapshots/`. A partial status is expected
while the site's contact page remains a soft-404. Contacts and services from the
homepage remain valid and schema-validated.
