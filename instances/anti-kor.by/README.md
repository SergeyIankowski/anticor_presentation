# anti-kor.by — ANTICOR (Anti-kor)

Public website inspected with Playwright Chromium on 2026-10-26. Scope: this instance only;
`src/parse.js` remains byte-identical to `template/src/parse.js`. Dependencies were already linked.

## Coverage and evidence

- `https://anti-kor.by/` responds HTTP 200. It contains six service cards, company/contact
  details, six processing stages, three benefit cards and five FAQ questions.
- `https://anti-kor.by/robots.txt` allows crawling. Its sitemap points to
  `https://anti-kor.by/sitemap.xml`, which lists only the homepage. Navigation links are
  homepage fragments. The privacy link is unrelated to the service comparison and is excluded.
- `src/evidence.js` enriches the shared runner snapshot with actual service cards, processing
  steps, benefits, legal details, every expanded FAQ answer and every service's enquiry modal.
  No form is filled or submitted. The six forms contain no prices or vehicle selectors.
- Actual snapshot evidence is under the directory recorded by `parse-report.json`. The fixture
  `test/fixtures/home.json` is the unmodified successful preview snapshot, not an input to live parsing.
- All service URLs are the actual harvested homepage URL, without fragment suffixes; each
  `name_original` occurs in the page's saved text. JSON-LD is preserved, including AutoRepair,
  its single Bobruisk address, and FAQPage. The many `areaServed` towns are not branch locations.

## Data and limitations

The harvest contains **1 page, 6 services, 0 price records and 0 explicit vehicle categories**.
Company: ANTICOR; legal name ИП Козицкий Виталий Николаевич. Address:
ул. Димитрова, 4в, Бобруйск. Contacts, Instagram link, DINITROL / Dinitrol ML / Dinitrol LT,
processing stages, guarantee certificate statements and source evidence are preserved.

The site publishes no numeric prices, price units, completion times, working hours or guarantee
length. All `prices` remain `[]`; all completion times are `null`; vehicle types remain `[]`.
BYN is an explicitly disclosed comparison-currency assumption for the Belarus business, not a
currency observed next to any price. A future monetary amount or new selector stops parsing
until the new markup/states are inspected, rather than silently omitting it.

FAQ states that rust removal is excluded from the standard treatment; removing bumpers, sill
trim and doors is separately agreed and charged. These terms are preserved in the FAQ and
comparison notes, without inventing numeric charges. The annual-service card promises free
coating replenishment only during the guarantee term; this does not imply a free annual service.
The card «Мойка днища и арок» describes under-bonnet coating. Its original conflicting copy is
retained and flagged. Benefits and guarantees are site claims, not independently verified facts.

## Verification

From repository root:

```sh
node --test instances/anti-kor.by/test/extract.test.js
node_modules/.bin/biome check instances/anti-kor.by/src instances/anti-kor.by/test
cmp instances/anti-kor.by/src/parse.js template/src/parse.js
```

Live preview and final run (Chromium/network need the authorized escalated execution context):

```sh
cd instances/anti-kor.by
npm run parse -- --output-dir /tmp/anti-kor.by-preview
npm run parse
```

Eight tests cover the live fixture, source anchors, company JSON-LD, conditional free work,
FAQ exclusions, missing/mismatched evidence, future-price detection, and both unchanged root
schemas. Preview and final outputs are validated by the shared runner against `schema.json`
and `schemas/site-harvest.schema.json`. No availability blocker remains.
