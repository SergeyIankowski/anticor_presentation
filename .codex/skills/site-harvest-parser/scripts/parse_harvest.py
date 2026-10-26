#!/usr/bin/env python3
"""Validate and normalize a website-harvest JSON file."""

import argparse
import json
import sys
from datetime import datetime, timezone
from pathlib import Path


def validate(value, schema, path="$", errors=None):
    errors = [] if errors is None else errors
    expected = schema.get("type")
    expected_types = expected if isinstance(expected, list) else [expected]
    type_ok = {
        "object": isinstance(value, dict),
        "array": isinstance(value, list),
        "string": isinstance(value, str),
        "number": isinstance(value, (int, float)) and not isinstance(value, bool),
        "integer": isinstance(value, int) and not isinstance(value, bool),
        "boolean": isinstance(value, bool),
        "null": value is None,
    }
    if expected_types and not any(type_ok.get(item, True) for item in expected_types):
        errors.append(f"{path}: expected {', '.join(expected_types)}")
        return errors

    if isinstance(value, dict):
        for key in schema.get("required", []):
            if key not in value:
                errors.append(f"{path}.{key}: required field is missing")
        for key, child_schema in schema.get("properties", {}).items():
            if key in value:
                validate(value[key], child_schema, f"{path}.{key}", errors)

    if isinstance(value, list):
        minimum = schema.get("minItems")
        if minimum is not None and len(value) < minimum:
            errors.append(f"{path}: expected at least {minimum} item(s)")
        item_schema = schema.get("items")
        if item_schema:
            for index, item in enumerate(value):
                validate(item, item_schema, f"{path}[{index}]", errors)

    return errors


def load_json(path):
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError:
        raise ValueError(f"file not found: {path}")
    except json.JSONDecodeError as exc:
        raise ValueError(f"invalid JSON in {path}: {exc}")


def collect_claims(value, path="$", found=None):
    found = [] if found is None else found
    if isinstance(value, dict):
        for key, child in value.items():
            child_path = f"{path}.{key}"
            if key in {"site_claims", "claims", "claims_and_caveats"}:
                found.append({"path": child_path, "value": child})
            collect_claims(child, child_path, found)
    elif isinstance(value, list):
        for index, child in enumerate(value):
            collect_claims(child, f"{path}[{index}]", found)
    return found


def build_presentation_data(data, input_path):
    metadata = data.get("metadata", {})
    sources = data.get("sources", [])
    content = {key: value for key, value in data.items() if key not in {"metadata", "sources"}}
    section_index = {
        key: {
            "type": type(value).__name__,
            "count": len(value) if isinstance(value, (dict, list)) else None,
        }
        for key, value in content.items()
    }
    return {
        "schema_version": "site-presentation-v1",
        "source": {
            "site": metadata.get("source_site") or metadata.get("url"),
            "brand": metadata.get("brand"),
            "retrieved_at": metadata.get("retrieved_at"),
            "input_file": str(input_path),
            "source_urls": [item.get("url") for item in sources if isinstance(item, dict) and item.get("url")],
        },
        "section_index": section_index,
        "content": content,
        "claims_and_caveats": {
            "found_claim_sections": collect_claims(data),
            "notes": metadata.get("notes", []),
        },
    }


def write_json(path, payload):
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, type=Path)
    default_schema = Path(__file__).resolve().parents[1] / "references" / "site-presentation-schema.json"
    parser.add_argument("--schema", type=Path, default=default_schema)
    parser.add_argument("--output-dir", required=True, type=Path)
    args = parser.parse_args()

    try:
        data = load_json(args.input)
        schema = load_json(args.schema)
    except ValueError as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        return 2

    errors = validate(data, schema)
    if errors:
        print("ERROR: input does not satisfy the schema:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 2

    args.output_dir.mkdir(parents=True, exist_ok=True)
    presentation_path = args.output_dir / "presentation_data.json"
    report_path = args.output_dir / "validation_report.json"
    presentation = build_presentation_data(data, args.input)
    report = {
        "valid": True,
        "schema": str(args.schema),
        "input": str(args.input),
        "output": str(presentation_path),
        "parsed_at": datetime.now(timezone.utc).isoformat(),
        "warnings": data.get("metadata", {}).get("notes", []),
    }
    write_json(presentation_path, presentation)
    write_json(report_path, report)
    print(presentation_path)
    print(report_path)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
