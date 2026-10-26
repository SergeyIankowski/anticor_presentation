# Antikor-Vitebsk

Public source: https://antikor-vitebsk.by/. Live harvest verified on 2026-10-26.
Only this instance is owned by this parser; `src/parse.js` matches `template/src/parse.js` exactly.

## Run and verify

From the repository root (dependencies already linked):

```sh
node --test instances/antikor-vitebsk.by/test/extract.test.js
node --test instances/antikor-vitebsk.by/test/evidence.browser.test.js
./node_modules/.bin/biome check instances/antikor-vitebsk.by
```

From this instance:

```sh
npm run parse
npm run parse -- --output-dir /tmp/antikor-vitebsk.by-preview
```

Chromium/network runs require the environment's authorized escalated execution.
The shared runner handles browsing, per-page errors, snapshots, normalization, schema validation,
and publication. No shared files, dependencies, or entry-point changes are required.

## Live evidence and coverage

The inspected website is a single landing page. Navigation points to `#promo`, `#technology`,
`#ceni`, `#diski`, and `#contacts`; these are sections of the same harvested URL, not separate
service pages. Canonical service URLs are `https://antikor-vitebsk.by/`, without fragments.
External social networks are preserved as contact links and are not crawled.

- `#ceni .kl-iconbox`: three static vehicle cards, each with a heading and original ruble price.
  Current source text is `от 295 Руб.` (Седан), `от 345 Руб.` (Кроссовер),
  and `от 395 Руб.` (Внедорожник). Numeric prices are extracted from current DOM text;
  none are constants in the parser. They become `price_min`, with exact `price` left null.
- No interactive price selectors were found. Both 1280×720 and 390×844 responsive layouts
  are inspected, and the parser rejects divergent or missing price-card states.
- Mobile hero text advertises bodywork/painting, plastic repair, argon welding, and towbar/bullbar
  installation. The desktop hero omits some of these. Both rendered states are preserved in
  `pages[].responsive_evidence`, and `pages[].text` contains both rendered page texts so original
  service labels can be anchored in the harvested source.
- The seven processing steps retain their descriptions, including drying temperature,
  preparation, application, hidden cavities, and finishing. Six named materials retain the
  site's spelling: Dinitrol 4941, Dinitrol Metalik, Wurt, Dinitrol ML, Dinitrol LT, Dinitrol 81.
- VIP restoration, wheel powder painting, tyre/wheel repairs, underbody inspection, and hero
  services produce 11 service records in total. Tyre fitting/welding/wheel straightening and
  towbar/bullbar installation retain their combined source labels.
- Address, building/block, phone, opening hours, social links, and GPS text are extracted from
  the page. Full page snapshots, paragraphs, headings, links, images, and structured data are
  retained by the shared extraction alongside domain-specific evidence.

The published `parse-report.json` records **complete**, **1 page**, **0 page failures**.
`antikor-vitebsk.by.json` and `parsed/{company,presentation_data,validation_report}.json`
contain 11 services, 3 vehicle categories, and 3 price entries. Both root schemas validate.

## Limitations and source caveats

Prices are advertised starting amounts. The page does not explicitly specify a billing unit;
`price_evidence[].unit` is null and comparison price notes state this. Currency is normalized
as BYN from the Belarusian site's ruble amounts.
VIP and additional services have no published numeric prices, so `prices: []` is retained.
Underbody inspection is advertised as free; no numeric zero price is manufactured.
The guarantee has no published duration. Completion times mentioned in customer testimonials
are not generalized into service completion times. Material benefits, guarantees, installment
terms, and marketing statements remain source claims rather than independent findings.
The page states that its information is not a public offer.

An initial browser request waiting for `networkidle` timed out, while DOM-ready browsing
worked. Browser-engine requests confirmed that bare requests can receive a small Beget cookie
bootstrap document; normal Chromium navigation executes it and loads the public page.
The shared runner's DOM-ready navigation successfully harvested the page without custom
network interception or fabricated fallback data.

## Tests

Seven extraction/schema tests use `test/fixtures/home.json`, captured from the live page on
2026-10-26. They cover qualified amounts, changing current prices, unrelated numbers,
responsive completeness, missing prices, mobile-only services, source labels/URLs, contacts,
materials, technology, and both schemas. One local Chromium DOM test covers actual card
selectors, comments, responsive visibility, and viewport restoration. All eight tests pass.
