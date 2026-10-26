# AntikorBlasting — antikorblasting.by

Domain-specific extraction for the live public website, inspected on 2026-10-26.
The instance uses the exported `@anticor/harvest-core` runner, enrichment hook,
normalization helpers and both repository schemas. `src/parse.js` remains identical
to `template/src/parse.js`.

## Coverage and evidence

The public WordPress page sitemap lists exactly these three URLs, all required:

- https://antikorblasting.by/ — service descriptions, company coverage, technologies,
  surface types and warranty/marketing statements.
- https://antikorblasting.by/antikor-avto-blasting/ — full underbody/wheel-arch blasting,
  cold zinc and anticorrosion complex; published price and conditions; preparation
  instructions; zinc/DINITROL discussion; 21 gallery captions.
- https://antikorblasting.by/contacts/ — legal name, Minsk address, appointment phone,
  email, business hours, WhatsApp/Viber/Telegram links and photo-based quotation advice.

Discovery was checked against `/robots.txt`, `/wp-sitemap.xml` and
`/wp-sitemap-posts-page-1.xml` using Playwright's request API (HTTP 200).
Browser navigation to the sitemap initially timed out while waiting for network
idle; the request fallback returned its XML successfully. The three content pages
loaded normally. Search, gallery media, slashless duplicate redirects and the
Imunify endpoint are excluded from crawling.

Six services are extracted: full complex, anticorrosion protection, cold zinc and
anticorrosion, wood blasting, metal/vehicle/frame/body blasting, and concrete/brick
blasting. Broad rust-removal and painting/priming statements are preserved as
technology evidence rather than duplicated as separately priced offers.

The only published price is `от 1000 до 3500 бел. рублей.` for the full complex.
Amounts are read from current page headings. Both bounds, original wording,
conditions (vehicle size, old coating and rust), source URL and scope are retained.
There is no separate explicit price unit: `price_evidence.unit_original` is null.
Other services have `prices: []`. No dynamic price selectors were found; the only
inputs/buttons inspected were site search controls.

The site gives no price classes by vehicle size. Its original word `авто` maps to
one broad `any` vehicle scope; this does not mean the range is a uniform fixed
price. Toyota Land Cruiser and Lexus gallery examples are not inferred categories.
Durations remain null because no definite completion window is published.
DINITROL appears in a question/answer discussion; it is retained in context and
is not asserted to be the company's standard applied material. Guarantees,
operating history and technical statements remain attributed site claims.

## Commands and validation

From this directory:

```sh
npm run parse -- --output-dir /tmp/antikorblasting.by-preview
npm run parse
```

From the repository root:

```sh
node --test instances/antikorblasting.by/test/*.test.js
pnpm exec biome check instances/antikorblasting.by/src instances/antikorblasting.by/test --error-on-warnings
cmp instances/antikorblasting.by/src/parse.js template/src/parse.js
```

The offline fixture is a reduced copy of the successful live preview's three
snapshots, preserving rendered text, headings, paragraphs, contacts and captions.
Five tests cover schema validation, canonical source anchors, original contacts,
range qualification, changed and removed prices, rejection of non-price numbers,
required evidence failures and crawl filtering.

Output: 3 pages, 6 services, 1 price entry, 1 broad vehicle scope. The generated
`parse-report.json` records the final live status; `parsed/validation_report.json`
records schema results. Full timestamped page evidence is in `snapshots/`.
No remaining access blocker; other services require individual quotation.
