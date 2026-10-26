# Алруса — alrusa.by

Public-site parser for ООО "СТО Алруса", Гродно. Uses the shared
`@anticor/harvest-core` Chromium runner and normalization. `src/parse.js` is
byte-identical to `template/src/parse.js`; domain logic lives in `src/site.js`
and `src/extract.js`. No installation or shared-file changes are required.

## Refresh and verify

From this directory:

```sh
npm run parse
npm run parse -- --output-dir /tmp/alrusa.by-preview
node --test test/*.test.js
```

From the workspace root:

```sh
pnpm exec biome check instances/alrusa.by
ALRUSA_OUTPUT_DIR=/tmp/alrusa.by-preview node --test instances/alrusa.by/test/*.test.js
cmp instances/alrusa.by/src/parse.js template/src/parse.js
```

The tests use the actual saved harvest as evidence and rebuild the comparison
offline. They check both schemas, source anchors, reference integrity, all
diagnostic variants, price qualifiers, date boundaries, reversed DOM ordering,
missing column headings and changed source amounts. Chromium/network runs
require the authorized elevated execution environment.

## Live evidence and coverage

Inspected with Chromium on 2026-10-26; all seven pages returned HTTP 200.
The successful harvest contains **7 pages, 15 services, 15 numeric price
entries and 10 vehicle categories**. Seven services have no numeric prices.
See `parse-report.json` for the exact run timestamps, status and snapshot path;
`parsed/validation_report.json` records validation against both root schemas.

- [Home](https://alrusa.by/): dated full-treatment prices for eight size/body
  categories; premium/commercial vehicles by agreement; lower-body treatment
  scope; two diagnostic variants and durations; blasting and disassembly
  surcharges; Dinitrol materials, processing steps, service duration, warranty
  and restrictions.
- [Blasting](https://alrusa.by/peskostrui/): a separate blasting price range,
  disassembly surcharge and urban travel charge. These differ from the home
  page and are preserved as separate source offers.
- [Workshop](https://alrusa.by/uslugi-sto/): running-gear repair; welding and
  blasting links lead to their own harvested pages.
- [Welding](https://alrusa.by/welding/): four named welding operations. The site
  asks for photos through Viber to estimate cost; `prices: []` for each.
- [Contacts](https://alrusa.by/contacts/): address, two phone numbers, email,
  messaging restriction and legal registration. No opening hours found.
- [Portfolio](https://alrusa.by/raboty/): work examples, vehicle references,
  processing evidence and images; not treated as additional priced services.
- [Partners](https://alrusa.by/%D0%9F%D0%B0%D1%80%D1%82%D0%BD%D1%91%D1%80%D1%8B/):
  partner names, source links and images retained in page evidence.

## Price interpretation and limitations

The home page displays two static columns; there is no interactive price
selector. Their DOM order differs from their visual order. The enrichment hook
records individual text blocks and their rendered bounds; the extractor pairs
each column with its visually aligned date heading, failing on missing or
ambiguous headings. The actual screenshot was inspected to confirm alignment.

Both published schedules remain in `price_schedules` with source selectors,
original text, original category names and parsed amounts. Only the schedule
valid on the retrieval date is used in the comparison: currently 01.09 through
31.12.2026, inclusive. The earlier column says "до 01.09.2026" and is interpreted
as ending before that date, consistent with the next period's explicit start.
After the final period expires, dated prices are omitted with a warning;
historical values are never silently substituted.

The full-treatment price excludes blasting. Surcharges and travel are separate
services. "от" amounts are minimums, "от ... до ..." amounts are ranges, and
quote-only services have empty price arrays. Lower-body treatment is described
but has no separate price. Premium/commercial vehicles have "Цена договорная".
The site uses "руб."/"рублей"; BYN is inferred from the Belarusian company and
explicitly disclosed. The source does not print a measurement unit beside each
amount: price evidence retains the currency wording and states where vehicle
or visit units are inferred from context. No square-metre rates are invented.

The dedicated blasting page has different ranges from the home page and gives
no validity dates. Both are retained with their exact page URLs and a warning;
the parser does not choose which quote the company will honor. The site says
the final blasting cost requires inspecting the vehicle. Diagnostics are
credited toward subsequent treatment as stated by the source.

Full-treatment duration is in working days; the original qualifier is retained.
Warranty, leadership, materials and other marketing statements are source
claims, not independently verified facts. The site refuses vehicles previously
treated with certain unknown compounds. No booking is submitted, and external
booking/video sites are not crawled. Page snapshots retain images, navigation,
original text and any per-page errors from the shared runner.
