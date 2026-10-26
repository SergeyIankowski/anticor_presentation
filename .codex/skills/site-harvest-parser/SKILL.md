---

name: site-harvest-parser
description: Parse a website-harvest JSON file against a configurable schema and write presentation-ready outputs into a user-specified folder. Use for structured site data normalization and packaging; not for live web scraping.
---

# Site Harvest Parser

Use this skill when the user asks to parse, validate, normalize, or package harvested website data for a presentation. It is site-agnostic; KROWN is only one possible input source.

## Workflow

1. Identify the input JSON from the user's request. Do not assume a particular domain or folder.
2. Identify the destination folder from the user's request. If none is given, use a `parsed/` folder beside the input and state that assumption.
3. Use the user's schema when provided. Otherwise read [references/site-presentation-schema.json](references/site-presentation-schema.json) as the generic baseline schema.
4. Run `scripts/parse_harvest.py` with the input file, schema, and destination folder.
5. Verify that the generated JSON is valid and report the exact output paths.

The parser writes two files into the destination folder:

- `presentation_data.json`: a compact, presentation-oriented representation of the source data.
- `validation_report.json`: schema status, input path, output path, and warnings.

## Data rules

- Preserve source URLs and the source retrieval date.
- Preserve source text in its original language; do not silently translate or rewrite it.
- Preserve exact numbers as numbers and ranges, estimates, or qualified values as strings.
- Keep marketing statements under `site_claims` or `claims_and_caveats`; do not present them as independently verified facts.
- Preserve unknown top-level and nested fields instead of dropping them because they are not part of the baseline schema.
- Do not invent missing products, locations, reviews, ratings, guarantees, or structured-data fields. Represent absent information as `null` or a warning.
- Do not delete or overwrite unrelated files. The script may create the requested destination folder and replace only its two named output files.

## Command

```bash
python3 scripts/parse_harvest.py \
  --input path/to/site-harvest.json \
  --schema references/site-presentation-schema.json \
  --output-dir path/to/output-folder
```

The script uses only the Python standard library and performs no network requests.
