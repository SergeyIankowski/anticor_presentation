# WURTH-ANTIKOR — live public-site harvest

Instance: https://wurth-antikor.by/. Uses the exported `@anticor/harvest-core` runner,
normalization, enrichment hook, schema validation, snapshots, and publication workflow.
`src/parse.js` is byte-for-byte identical to `template/src/parse.js`.

## Coverage and evidence

Live inspection and successful refresh: 2026-10-26. Eight required public pages:

- `/`: service directions, three advertised starting prices, company claims and review links.
- `/antikorrozijnaya-obrabotka-avto/`: standard treatment for six vehicle categories,
  including a wheelbase-dependent minibus range and the separate corrosion-removal charge.
- `/lazernoe-udalenie-korrozii/`: seven detailed laser services, each “Цена по запросу”.
- `/gazodinamicheskoe-udalenie-luzhenie/`: five detailed services, each “Цена по запросу”.
- `/gazotermicheskoe-udalenie-goryachee-cinkovanie/`: seven detailed services,
  each “Цена по запросу”.
- `/about/`: company background, experience, warranty and certification claims.
- `/contacts/`: actual address, telephone, contact email, and weekday/weekend hours.
- `/services/`: treatment technologies, materials and scope.

Result: **8 pages, 23 services, 9 numeric price entries**. This consists of one standard
complex with six category prices, 19 quote-only detailed services, and three broad
homepage directions with qualified starting prices. The comparison includes six source
vehicle categories and one explicitly unspecified technical category (`class: other`)
for prices whose vehicle scope the site does not state.

Laser cleaning is categorized as an additional service; protective treatment, tinning,
and zinc coating remain anticorrosion services.

Company evidence includes the displayed company name, legal entity, registration number,
legal address, both published email addresses, original phone formatting, and working
hours. `technologies_and_materials` and `site_claims` preserve original source text and
URLs; marketing, experience, certification and warranty statements are source claims.
No claim is independently verified. No named material brand is inferred from the domain.

## Pricing limitations

Tilda `.t778__price` repeats the same numeric badge across cards, conflicting with
`.t778__descr`, which contains both distinct vehicle prices and explicit quote-only text.
The parser reads the description as the offer, retains the conflicting badge in raw
`price_cards` and `price_evidence`, and records this discrepancy in reports. It never
turns a quote-only card into a numeric price. This is an extraction choice based on
conflicting live markup, not a determination that the repeated badge is a valid charge.

The homepage’s “ОТ … РУБЛЕЙ” offers are separate source entries, with homepage URLs and
source-visible names. They are not copied onto quote-only detailed services. Their work
scope, vehicle class, and billing unit are unspecified. Standard-complex scope is
preserved as its original unit text. BYN is inferred from the Belarusian business
location and ruble amounts. No conversion is applied. Corrosion removal is charged
separately according to the treatment page. Completion durations are not stated.

There are no dynamic price selectors on the inspected pages: the select controls are
appointment calendars, not prices. Calendar controls and forms are excluded. A new
non-form, non-calendar selector causes extraction to fail for investigation, instead of
silently publishing one pricing state. Inquiry forms are not submitted.

All service URLs equal harvested page URLs without fragments. Each service name is
checked against the normalized source page text. Prices are parsed from the current
page fields; no numeric prices are embedded in parser source or restored from prior JSON.
Blog/editorial articles, the privacy policy, and video-only review pages are outside the
company/service/price/contact scope. Relevant review and external links remain in page
snapshots.

## Refresh and verification

From this directory (network/Chromium execution requires the authorized elevated shell):

```sh
npm run parse
npm run parse -- --output-dir /tmp/wurth-antikor.by-preview
node --test test/extract.test.js test/enrichment.browser.test.js
```

From repository root:

```sh
node_modules/.bin/biome check instances/wurth-antikor.by
cmp template/src/parse.js instances/wurth-antikor.by/src/parse.js
```

The six tests cover conflicting badge exclusion, changing live offer amounts, ranges,
starting qualifiers, all quote-only entries, category mappings, canonical URLs and source
anchors, missing evidence, unexpected interactive controls, company evidence, both JSON
contracts, template identity, and browser extraction of Tilda cards. `test/fixtures/live-pages.json`
is a reduced live preview capture, used only for regression tests, never as parser input.

Outputs: `wurth-antikor.by.json`, `parsed/company.json`, `parsed/presentation_data.json`,
`parsed/validation_report.json`, `parse-report.json`, and timestamped `snapshots/`.
No accessibility or network blockers remain. Shared repository files and git history are
outside this instance's ownership.
