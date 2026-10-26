# Protect-Line — live website parser

Owns only this instance. `src/parse.js` is unchanged and byte-identical to
`template/src/parse.js`; the exported shared runner handles Chromium, retries,
normalization, schema validation, snapshots and atomic publication.

```sh
npm run parse
npm run parse -- --output-dir /tmp/protect-line.by-preview
# From repository root:
node --test instances/protect-line.by/test/*.test.js
pnpm exec biome check instances/protect-line.by --error-on-warnings
```

Chromium/live parsing requires the authorized elevated execution environment.
Do not install packages or edit workspace manifests for this instance.

## Coverage and evidence

Inspected the live public website on 2026-10-26: homepage, eight linked body-element
anticorrosion pages, and the sandblasting, body primer and automotive welding pages.
All twelve are required seeds. The final response URL is retained (the underbody
link redirects to its trailing-slash URL). The detailed article heading is H2,
while the repeated site-wide hero H1 is outside the article. Homepage-priced
offers use the original card labels and homepage URL.
Article-priced and quote-only offers use article headings and URLs. Every offer
name and original price text is present on the page identified by its URL.
Detailed article headings, URLs and descriptions remain in offer descriptions
and in the harvest's `service_details` evidence.

The homepage's eight price cards are initially hidden by Elementor entrance
animations. `enrichPage` scrolls the content and captures card paragraphs directly
from their nearest Elementor child container, preserving their target links,
labels and original amounts. It also retains contact links, rendered page evidence,
and any price controls. No selects, radio groups or range controls for prices were
present in the inspected site; only callback form fields were present. The parser
fails closed if the card/service coverage changes or a required page fails.

Expected current output: 12 pages, 13 source offers, 10 price entries. Eight prices
come from eight homepage offers; the hood article adds a separate hood offer and a
separate whole-car complex protection offer. The sandblasting, primer and welding
services have
`prices: []` because their pages publish no monetary amounts. All numeric prices
are extracted from current page text; none are configured in the implementation.

Every lower bound retains its original “ОТ”/“от” qualifier. The homepage hood
price is “ОТ 63 РУБ”, while the article says “от 65 рублей”; both are retained with
their own offer URLs and an explicit discrepancy warning. The homepage offer links
to the homepage and the article offer links to the hood article; no offer combines
prices from different pages. “от 800 рублей” for whole-car protection is an article example, preserved separately with its original wording,
not treated as a fixed package. Price source URLs are in comparison price notes
and the harvest's `price_evidence`; service URLs are actual harvested URLs without
fragments.

## Limitations retained in output

- Prices are lower bounds and depend on individual vehicle condition and scope.
- The site does not define size-based vehicle price tiers. “автомобилей любых
  марок” is retained as the broad `any` scope, without asserting a universal fixed
  price.
- Body-element cards do not specify whether the amount covers one item or a set;
  `unit_original: null` records this. Article wording explicitly identifies the
  hood and “за весь автомобиль” scopes.
- “РУБ” is interpreted as BYN from the Belarus workshop location; the website
  does not explicitly publish an ISO currency code.
- Article drying times and protection lifetimes are evidence, not total service
  turnaround times. `completion_time` remains null.
- Materials, processes and guarantees remain source claims. No material brand,
  warranty duration, opening hours or email is invented. The main phone and Viber
  target differ; their original links remain distinct.

The harvest includes workshop address, legal entrepreneur name and UNP, phone,
Instagram/Viber, materials and technology excerpts, site claims, complete page
snapshots, retrieval timestamps and per-page failures in `parse-report.json`.
Output schemas remain `schemas/site-harvest.schema.json` and root `schema.json`.

## Validation

Seven focused tests cover live-shaped article H2 headings, altered current amounts,
separate price/source offers and units, homepage labels and article evidence,
quote-only services, excluding drying years and hours from prices, both schema
contracts, company/source anchors for both names and original price text, missing
card failure, entry-point equality, and an offline Chromium fixture for hidden
Elementor cards. See `test/*.test.js`. A full live run and scoped Biome check are
required after extraction changes; the resulting report records actual coverage.
