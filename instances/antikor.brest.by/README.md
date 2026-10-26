# Артглас — antikor.brest.by

Read-only Playwright parser for <https://antikor.brest.by/>. Uses the existing
`@anticor/harvest-core` runner, browser snapshots, normalization, presentation
packaging and both repository schemas. `src/parse.js` is identical to the template.

## Run and verify

From this instance: `npm run parse`.

From the repository root:

```sh
node --test instances/antikor.brest.by/test/*.test.js
pnpm exec biome check instances/antikor.brest.by --error-on-warnings
cmp template/src/parse.js instances/antikor.brest.by/src/parse.js
```

Network/Chromium runs require the authorized elevated execution context. An isolated
live run can use `npm run parse -- --output-dir /tmp/antikor.brest.by-preview`.
No installation or shared-file changes are needed.

## Coverage and extraction

- Main page, six service pages, contacts, price index, primary-treatment price table,
  reviews, article index and linked editorial articles about automotive services and past promotions.
- Seven services: full anticorrosion, underbody, cavities, sills/arches, protective
  film, headlight protection/polishing, and welding explicitly offered on the
  sills/arches page. Article topics and customer review text do not create services.
- Seven original vehicle categories, with fourteen current table cells mapped by
  the two service-column labels. No numeric amount is embedded in parser code.
- Exact cell text, qualifiers, currency, per-vehicle scope, price source URL and
  primary-treatment eligibility are retained in the comparison prices. The full
  price page and structured rows are also retained in the harvest and snapshots.
- Company contacts, both address statements, social/contact links, material and
  technology paragraphs, original pages/images, and source-specific claims are
  retained. Reviews remain page evidence and do not supply company prices,
  completion times or independently verified guarantees.
- Priced services link directly to the harvested price table and use its original
  column labels, `Полная обработка` / `Обработка днища`, for frontend anchors.
  Complete service headings and detail-page URLs remain in descriptions and the
  harvest `service_details` evidence. Unpriced services link to their description
  pages; welding uses the exact phrase in its source text. No URLs use fragments.
- Discovery permits automotive article paths and the old winter-promotion post.
  An unrelated casino post linked through article navigation is excluded. Past
  promotional discounts are page evidence, never current numeric service prices.
- Pricing is a static HTML table. No vehicle/package selector or price calculator
  was found; the only select on the inspected reviews page is its rating form.

## Source limitations

The table at `/tseny/tseny-na-antikor/` explicitly applies only to **primary
anticorrosion of new vehicles not yet used**. Secondary treatment of used vehicles
requires an inspection and has no published amount. Other unpriced services use
`prices: []`. Price headers and malformed/missing cells fail extraction rather than
silently dropping prices. Live figures may change; test fixture amounts document
the observed 2026-10-26 table and are never used as a runtime fallback.

The combined original category `Минивен, кроссовер` remains one category, mapped to
`crossover`; it must not be read as a separately quoted price for each class.

The contacts page states `Беларусь, г. Брест, ул. Янки Купалы 100/1 (район Восток,
Торговый центр ВАМ РАД)`, while the homepage/footer states `Брест ул.Коммерческая,
17`. The linked Google directions also reference Коммерческая, 17. The comparison
uses the explicit contacts-page address; both statements and the discrepancy are
retained, without deciding which address is current. Opening hours are absent.

The homepage says its information, including prices, is for reference and is not
official information of a legal entity or entrepreneur. Guarantees and performance
statements are recorded as site claims, including the underbody page's negotiated
2–10 year additional guarantee and the homepage's exclusions for pre-existing
perforating corrosion. They are not independently verified. The sills page's two
hours describe coating drying, not total job duration; `completion_time` is null.

## Artifacts

`antikor.brest.by.json` is the full harvest. `parsed/company.json` follows root
`schema.json`; `parsed/presentation_data.json` packages all harvested content.
`parsed/validation_report.json`, `parse-report.json` and run-specific `snapshots/`
provide validation and retrieval evidence. No stale JSON is used as an input.
