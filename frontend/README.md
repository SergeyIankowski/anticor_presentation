# Frontend

Vite + React + MUI page that compares anticorrosion prices across the harvested sites. Company data
is bundled at build time from `../instances/*/parsed/company.json`.

- `pnpm frontend:dev`, `pnpm frontend:build`, `pnpm frontend:typecheck` from the repo root.
- Tests live in `test/` and run with the root `pnpm test`.
- `pnpm frontend:storybook` opens Storybook at http://localhost:6006, and
  `pnpm frontend:storybook:build` writes a static build to `storybook-static/`.

## Storybook

Every brick has a `*.stories.tsx` file next to it, so the Storybook sidebar mirrors the layers
below: `shared` → `entities` → `features` → `widgets` → `pages`. Each story shows one display case,
such as a price range, a "from" price, a service without a price or an empty table.

- Stories use the fictional companies in `src/shared/api/fixtures.ts`. Together they cover every
  case. Stories in the `service` entity get their rows and cells from
  `src/entities/service/model/fixtures.ts`.
- Only the `pages/comparison/ComparisonPage` stories use the real harvested data, like the app.
- The toolbar switches between the light and dark app themes, and the viewport tool shows the
  compact layout.
- Switches and the company filter keep their state inside the story, so you can click them. The
  Actions panel logs their `onChange` calls.

## Structure: Feature-Sliced Design

`src/` is split into layers. A layer imports only from layers below it, and slices on one layer
don't import each other. `test/architecture.test.ts` enforces this.

| Layer       | Holds                                                   | Example                     |
| ----------- | ------------------------------------------------------- | --------------------------- |
| `app/`      | Entry point, providers, global CSS                      | `main.tsx`, `ThemeProvider` |
| `pages/`    | A whole screen: state + composition of widgets/features | `comparison`                |
| `widgets/`  | Self-contained page blocks                              | `company-prices`            |
| `features/` | One user interaction (a switch, a filter, a selection)  | `select-companies`          |
| `entities/` | Business nouns: their data, rules and small views       | `service`, `company`        |
| `shared/`   | Code that knows nothing about this app's domain         | `DataTable`, `formatPrice`  |

Each slice is split by purpose into segments: `ui/` (components), `model/` (types, state, business
rules), `lib/` (pure helpers), `api/` (data loading), `config/`.

Outside a slice, import only its `index.ts`. `shared/` has no slices, so its files are imported
directly. Tests import segment files directly instead of `index.ts`, because Node can't load the
`.tsx` and `import.meta.glob` modules that the slice APIs re-export.

## Map of bricks

**shared** (no domain knowledge)

- `api/harvest.ts`: types of `company.json` and `parse-report.json` (the data contract).
- `config/theme.ts`: MUI theme and chart color. `config/layout.ts`: the 758px compact breakpoint.
- `lib/number.ts`: `mean`, `formatNumber`, `formatPrice`. `lib/plural.ts`: Russian plurals.
  `lib/useCompactLayout.ts`: true at or below the breakpoint.
- `ui/`: `Section` (titled block), `DataTable` (table frame and empty row), `ToggleSwitch`
  (one-of-many buttons), `ExternalLink`, `EmptyValue` ("—"), `icons`.

**entities**

- `company`: loads the dataset (`api/companies.ts`) and splits out sites with parse errors
  (`model/dataset.ts`, `model/parseStatus.ts`). Also `hasPrices` and `companiesLabel`.
- `service`: groups services across companies by unified key (`groupServices`), builds the price
  comparison per vehicle class (`priceRows`) and coverage (`serviceCoverage`). The price helpers
  are `normalizePrice`, `shortServiceName` and `priceSourceUrl`. UI bricks for one cell or row:
  `PriceValue`, `MarketAverage`, `PriceDifference`, `SourceLink`, `CategoryLabel`, `OnlyHereChip`.
- `vehicle-class`: labels and the classes that have prices.

**features** (each one is a control plus its rule)

- `select-companies`: `CompanyFilter` checkboxes, plus selection helpers.
- `choose-vehicle-class`: `VehicleClassSwitch`, plus `resolveVehicleClass` (keeps the choice valid).
- `filter-service-category`: `CategorySwitch`, plus `matchesCategory`.
- `filter-coverage-count`: `CountFilterSwitch`, plus the `useCountFilter` hook.

**widgets** (page blocks built from entities and features)

- `service-points`: table of workshop addresses per company.
- `company-prices`: one price table per company (`CompanyPriceList` → `CompanyPriceTable`).
- `average-prices`: bar chart and table of average prices.
- `service-coverage`: how many companies offer each service, with the count filter.
- `filters-bar` / `filters-sidebar`: a sticky bar on wide screens or a drawer on compact ones;
  both get the filters as children.

**pages/comparison**

`model/useComparison.ts` holds the page state (selected companies, vehicle class, category) and
derives rows from the entities. `ui/ComparisonPage.tsx` only places things: header → service
points → company filter → filters bar or sidebar → company prices → averages → coverage.
