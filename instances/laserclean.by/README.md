# LaserClean — laserclean.by

Live public site inspected and harvested on 2026-10-26 using Playwright and the unchanged shared runner. Only this instance is owned by this parser.

## Run and verify

```sh
cd instances/laserclean.by
npm run parse
# Optional isolated preview:
npm run parse -- --output-dir /tmp/laserclean.by-preview
# From the workspace root:
node --test instances/laserclean.by/test/*.test.js
pnpm exec biome check instances/laserclean.by
cmp template/src/parse.js instances/laserclean.by/src/parse.js
```

`src/parse.js` matches the template exactly. `src/site.js` configures the shared runner and calls the DOM enrichment hook in `src/page.js`. Domain extraction and comparison packaging are in `src/extract.js`. No installation is needed in the linked workspace.

## Live evidence and coverage

- `https://laserclean.by/` — HTTP 200. One substantive public page contains both services, company contacts, DINITROL materials, ten treatment stages, two process notes and work-video examples.
- `https://laserclean.by/robots.txt` — HTTP 200, advertises `https://laserclean.by/sitemap.xml`.
- `https://laserclean.by/sitemap.xml` — HTTP 200, lists only `/` and `/sitemap`.
- `https://laserclean.by/sitemap` — HTTP 200, generated navigation index with links back to those two URLs. No further service or pricing pages were found. It is not a substantive harvest page.

The substantive harvest has **1 page, 2 services, 0 price entries, 0 priced vehicle categories**, 8 material entries and 4 vehicle-work examples. DINITROL treatment and laser metal cleaning are the services; individual preparation/application stages are preserved as process evidence rather than separately sold services. Free consultation and inspection are retained as a company offer without inventing a numeric price.

Tilda stores three rotating headline labels in `.t635__textholder[data-text1..3]`. The enrichment hook captures every configured state and appends any missing complete labels to the extracted page text, avoiding a partial animation frame. `laserclean.rotating_labels` preserves their provenance. Both service names occur in this source text, and both canonical service URLs equal the actual harvested homepage URL without fragments. No dynamic pricing selectors or tariff tables were present.

Materials include DINITROL LT, ML, 4941, 81, AUTO CLEANER, Brunox, epoxy primer and active foam. The harvest retains the original product/application claims, laser power, video-recording claim and one-day turnaround statement with source URLs and site-claim attribution. It includes the Grodno address, phone, Instagram link, original process text, page snapshot and retrieval time.

## Data limits

No monetary prices, price units, priced vehicle classes, working hours, email address or explicit warranty terms were found. Service `prices` arrays and `vehicle_types` remain empty. BYN is the comparison currency selected for this Belarusian business; the source does not state a tariff currency. Named vehicles are portfolio examples, not invented price classes. Turnaround is a statement by the business, and is not assigned to standalone laser cleaning.

If a monetary tariff appears on the homepage, extraction fails with an explicit review error instead of silently retaining empty prices. Missing service labels, incomplete process stages or missing material/contact evidence also fail extraction. Tests use a captured live-page fixture and cover these failure cases, quote-only services, provenance, contacts, materials and both unchanged JSON schemas.

## Outputs

- `laserclean.by.json` — full source harvest and evidence.
- `parsed/company.json` — root comparison contract.
- `parsed/presentation_data.json` — shared presentation packaging.
- `parsed/validation_report.json` and `parse-report.json` — schema and live-run results.
- `snapshots/<run-id>/001.json` — live page snapshot, including DOM enrichment.

The final instance run completed without page failures and passed both schemas. Six regression tests and scoped Biome checks passed. No shared files, lockfiles, other instances or Git history/index were changed.
