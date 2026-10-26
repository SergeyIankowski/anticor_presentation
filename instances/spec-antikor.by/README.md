# Спец Антикор — spec-antikor.by

Parser for the live public website, inspected on 2026-10-26. All implementation and outputs are confined to this instance. `src/parse.js` is unchanged from `template/src/parse.js` and uses the exported `@anticor/harvest-core` runner, normalization, snapshots and schema validation.

## Run and verify

From the repository root:

```sh
node --test instances/spec-antikor.by/test/*.test.js
pnpm exec biome check instances/spec-antikor.by --error-on-warnings
```

From this folder:

```sh
npm run parse
npm run parse -- --output-dir /tmp/spec-antikor.by-preview
```

Chromium and public network runs require the authorized elevated execution environment. No installation is needed.

## Coverage and evidence

The successful homepage supplies three anticorrosion packages: ML комплекс (для машин с пробегом), Стандарт комплекс (новые авто), Антишум комплекс. The enrichment hook clicks both material brand buttons and every vehicle button: 12 states, with three package prices in each, for 36 price entries across six vehicle categories. Amounts and qualifiers are read exclusively from the current rendered table. Each price retains the brand, material description, original price text, caveat and homepage source. Identical amounts under different brands remain distinct observations.

**Important site quirk:** internal `data-class` codes do not match the displayed categories. The parser uses visible labels, preserving the internal identifier only as a local key:

| Button code | Displayed category             | Comparison class |
| ----------- | ------------------------------ | ---------------- |
| car         | Легковой автомобиль до 4м      | small            |
| crossover   | Легковой автомобиль 4-5 метров | sedan            |
| minivan     | Кроссовер / Паркетник          | crossover        |
| suv         | Минивен                        | minivan          |
| microbus    | Внедорожник                    | suv              |
| lastcar     | Микроавтобус                   | van              |

The homepage menu also confirms Лазерная чистка, Пескоструй and Шумоизоляция автомобиля. These three additional services have `prices: []`; their canonical URLs point to the actually harvested homepage, with the unavailable detail URLs retained in descriptions. Names are present in the source page text. There are six services total.

Company evidence includes the Брест address, header telephone and opening hours, footer legal entity/УНП, and separate social/messenger URLs. The messenger number differs from the displayed telephone; the original URLs preserve that distinction. Four material cards, eight work stages, calculator material descriptions and inclusion markers, and source claims including the written guarantee up to five years are retained. Claims are source statements, without independent verification. No completion time is inferred from opening hours or drying-process prose.

Full live page evidence and all calculator table states are stored in the harvest and timestamped snapshots. `test/fixtures/home.json` is a reduced live snapshot from the preview run, used only by tests; production extraction never reads this fixture or previous JSON.

## Confirmed limitations

On the inspection and final parse, the homepage returned HTTP 200, but all six relevant menu destinations returned HTTP 404:

- `/cena-antikorrozijnoj-obrabotki-avtomobilja-v-breste/`
- `/lazernaja-chistka-metalla-i-avtomobilja-v-breste/`
- `/peskostrujnaja-obrabotka-avtomobilja-diskov-i-dnishha-v-breste/`
- `/shumoizolyacziya-avtomobilya/`
- `/garantii/`
- `/kontakty/`

Browser navigation and Playwright's request API confirmed genuine HTTP errors, rather than DNS or sandbox failures. Removing the trailing slash from the price URL, HTTP and www variants of the contact URL, and the public WordPress pages endpoint also returned 404. Required homepage extraction succeeds; optional failures are retained by the shared runner in `parse-report.json`, which honestly marks the harvest **partial**. The six linked pages are retried on each run. Their unavailable descriptions, prices, guarantee terms and contact details are not reconstructed.

All calculator prices are approximate lower bounds (`от`). Its cells omit explicit currency and units. The comparison currency BYN is inferred from the Belarus location and the homepage's reference to rubles, with an explicit warning; `pricing_evidence` preserves `currency_inferred: true` and `unit_original: null`. The generic SEO paragraph's price range is preserved as page evidence and never substituted for calculator prices. Further detail about the three menu-only services remains blocked by their HTTP 404 responses.

## Checks

Five tests cover the live fixture's complete brand/category matrix, visible-label mapping, original qualifiers and changing amounts, rejection of missing states/prices, company/material/technology evidence, and a local Chromium fixture exercising every selector combination. Both root schemas are validated by the shared runner. Scoped Biome and byte-for-byte entry-point comparison are part of delivery verification.
