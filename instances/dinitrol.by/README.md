# DINITROL — blocked live harvest

Inspected on 2026-10-26. The public site returns **HTTP 403 Forbidden (nginx)**
from this environment. The live parser has failed honestly; no harvest or comparison
dataset was published. Counts: **0 content pages, 0 services, 0 price entries**.
These counts describe unavailable evidence, not the customer's actual offering.

## Saved evidence

- `parse-report.json`: the shared runner's actual failed run; required homepage
  returned HTTP 403, `published: false`, `page_count: 0`.
- `access-evidence.json`: 14 timestamped public read-only probes with final URLs,
  HTTP statuses and original response text. Thirteen returned HTTP 403; only
  `https://dinitrol.by/robots.txt` returned HTTP 200.
- `access-homepage.png`: Chromium screenshot of the nginx error, visually checked.

Chromium checked HTTPS/HTTP with and without `www`, robots.txt and sitemap.xml.
Playwright APIRequest independently checked the homepage, index.php, a public
page query, WordPress pages API, alternate sitemap paths, and likely service/contact
paths. Those service/contact paths were diagnostic guesses, not confirmed source
URLs. A separate browser probe using a desktop Chrome user agent also returned 403.
An independent web fetch returned 403. The requests reached the origin and received
HTTP responses; this is not a DNS, sandbox or Chromium startup failure.

The robots file exposes a WordPress admin exclusion and the sitemap URL, but does
not reveal services, prices, vehicle categories, addresses, company history,
technology, materials or marketing claims. None of those have been inferred.

## Implementation boundary

`src/parse.js` remains byte-for-byte identical to `template/src/parse.js` and uses
the exported `@anticor/harvest-core` runner. The required homepage and full-body
snapshot configuration are ready to retry. Discovery is deliberately closed because
no content links could be inspected. The extraction guard rejects HTTP errors,
soft access-denial pages and absent brand identity.

**Service extraction remains blocked and incomplete.** `parseServices` explicitly
refuses publication until actual live markup has been inspected. It does not guess
services from headings, pair unrelated numbers with services, or publish empty
success datasets. The comparison and harvest validation contracts remain unchanged.
There is no offline rebuildable customer dataset yet.

Once the site is readable, inspect service/contact/price pages, set verified seeds
and discovery, implement service/vehicle/price extraction and any enrichment hooks,
exercise every dynamic price state, and preserve source labels, qualifiers, units
and canonical harvested page URLs. Quote-only services must use `prices: []`.
Review source anchors and both schemas before publication.

## Commands and verification

From this instance:

```sh
node src/inspect-access.js
npm run parse
```

These live commands need the authorized network/Chromium execution permission.
The inspection command rewrites only the diagnostic JSON and screenshot in this
instance. The parser currently exits 1 with HTTP 403 and writes its failed report.

From the repository root:

```sh
node --test instances/dinitrol.by/test/*.test.js
pnpm exec biome check instances/dinitrol.by
```

Four tests cover entry-point parity, rejection of HTTP and soft access failures,
brand evidence, and refusal to publish unverified service extraction even if the
homepage becomes readable. Synthetic guard inputs are explicitly not website
fixtures. No dependencies were installed, shared files changed, or commits made.
