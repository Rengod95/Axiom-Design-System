#!/usr/bin/env python3
"""Reproduce Foundation document integrity checks; semantic review is separate."""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import hashlib
import html
import json
from pathlib import Path
import re
import shutil
import tempfile
from urllib.parse import unquote, urlsplit

MANIFEST = "docs/foundation/document-manifest.json"
QA_PATH = "docs/foundation/documentation-qa.json"
BODY_COUNT = 56
DECISION_COUNT = 129
LINK = re.compile(r"\[[^\]]*\]\((?:<([^>]+)>|([^\s)]+))(?:\s+['\"][^)]*)?\)")
FENCE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")


def require(value: bool, message: str) -> None:
    if not value:
        raise ValueError(message)


def unique_object(pairs: list) -> dict:
    result = {}
    for key, value in pairs:
        require(key not in result, f"Duplicate JSON key: {key}")
        result[key] = value
    return result


def read_json(path: Path) -> dict:
    def invalid_constant(value: str):
        raise ValueError(f"Non-JSON numeric constant: {value}")
    return json.loads(path.read_text(encoding="utf-8"), object_pairs_hook=unique_object,
                      parse_constant=invalid_constant)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def markdown_prose(text: str) -> str:
    lines, fence = [], None
    for line in text.splitlines():
        marker = FENCE.match(line)
        if marker:
            current = marker.group(1)
            if fence is None:
                require(current[0] != "`" or "`" not in marker.group(2), "Invalid Markdown fence info")
                fence = current
            elif current[0] == fence[0] and len(current) >= len(fence) and not marker.group(2).strip():
                fence = None
            continue
        if fence is None:
            lines.append(line)
    require(fence is None, "Unclosed Markdown fence")
    return "\n".join(lines)


def anchors(text: str) -> set[str]:
    prose = markdown_prose(text)
    # Literal examples and comments do not create rendered HTML anchors.
    visible_html = re.sub(r"<!--[\s\S]*?-->", "", prose)
    visible_html = re.sub(r"(?<!`)(`+)(?!`)[\s\S]*?(?<!`)\1(?!`)", "", visible_html)
    result = set(re.findall(r'<a\s+(?:id|name)=["\']([^"\']+)', visible_html))
    generated = set()
    for heading in re.findall(r"^#{1,6}\s+(.+?)\s*#*\s*$", prose, re.M):
        slug = re.sub(r"[^\w\- ]", "", heading.lower(), flags=re.UNICODE).replace(" ", "-")
        candidate, count = slug, 0
        while candidate in generated:
            count += 1
            candidate = f"{slug}-{count}"
        generated.add(candidate)
        result.add(candidate)
    return result


def repository_path(root: Path, relative: str) -> Path:
    path = (root / relative).resolve()
    require(not Path(relative).is_absolute() and path.is_relative_to(root.resolve()),
            f"Repository path escapes root: {relative}")
    return path


def table_rows(text: str) -> list[list[str]]:
    rows = []
    for line in markdown_prose(text).splitlines():
        if line.startswith("|") and line.endswith("|"):
            cells = [html.unescape(cell.strip()) for cell in line[1:-1].split("|")]
            if cells and not all(re.fullmatch(r":?-+:?", cell) for cell in cells):
                rows.append(cells)
    return rows


def section(text: str, heading: str) -> str:
    match = re.search(r"^## " + re.escape(heading) + r"\s*$", text, re.M)
    require(match is not None, f"Missing Markdown section: {heading}")
    following = re.search(r"^## ", text[match.end():], re.M)
    return text[match.end():match.end() + following.start()] if following else text[match.end():]


def audit(root: Path, check_hashes: bool = True, check_subjects: bool = True) -> dict:
    checks = []
    def check(name: str, condition: bool, detail=None) -> None:
        require(condition, name)
        checks.append({"name": name, "passed": True, "detail": detail})

    manifest = read_json(root / MANIFEST)
    approval = read_json(repository_path(root, manifest["directionApproval"]))
    approved_decisions = {decision["id"] for task in approval["tasks"] for decision in task["decisions"]}
    approved_followups = {entry["id"] for entry in approval["followups"]}
    bodies = manifest["documents"]
    ids = {entry["id"] for entry in bodies}
    paths = {entry["path"] for entry in bodies}
    check("56 distinct document IDs and paths", len(bodies) == len(ids) == len(paths) == BODY_COUNT)
    check("12 distinct domains", len({entry["id"] for entry in manifest["domains"]}) == 12)
    ownership = {}
    by_id = {entry["id"]: entry for entry in bodies}
    for entry in bodies:
        path = repository_path(root, entry["path"])
        check(f"body exists: {entry['id']}", path.is_file())
        text = path.read_text(encoding="utf-8")
        check(f"body identity: {entry['id']}", text.startswith(f"# {entry['id']} "))
        check(f"ownership and criteria: {entry['id']}", bool(entry["owns"] and entry["boundary"] and entry["completionCriteria"]))
        if check_hashes:
            check(f"body hash: {entry['id']}", digest(path) == entry["bodySha256"])
        check(f"upstream IDs: {entry['id']}", set(entry["upstreamDocumentIds"]) <= ids)
        for decision in entry["primaryDecisionIds"]:
            check(f"single decision owner: {decision}", decision not in ownership)
            ownership[decision] = entry["id"]
            check(f"decision anchor: {decision}", decision.lower() in anchors(text))
    coverage = manifest["decisionCoverage"]
    check("129 unique owned decisions", len(ownership) == len(coverage) == DECISION_COUNT)
    check("owned decisions match approved decision IDs", set(ownership) == approved_decisions)
    check("decision coverage matches primary owners", {row["id"]: row["primaryDocumentId"] for row in coverage} == ownership)
    followups = manifest["followupCoverage"]
    check("14 unique approved followup mappings", len(followups) == len({row["id"] for row in followups}) == 14
          and {row["id"] for row in followups} == approved_followups)
    for row in followups:
        check(f"followup document owners: {row['id']}", bool(row["primaryDocumentIds"])
              and len(row["primaryDocumentIds"]) == len(set(row["primaryDocumentIds"]))
              and set(row["primaryDocumentIds"]) <= ids)
    visiting, visited = set(), set()
    def visit(key: str) -> None:
        require(key not in visiting, f"Document dependency cycle: {key}")
        if key in visited:
            return
        visiting.add(key)
        for parent in by_id[key]["upstreamDocumentIds"]:
            visit(parent)
        visiting.remove(key)
        visited.add(key)
    for key in ids:
        visit(key)
    check("document dependency DAG", len(visited) == BODY_COUNT)

    documents = sorted((root / "docs").rglob("*.md"))
    local_links, fragments = 0, 0
    anchor_cache = {}
    for path in documents:
        for match in LINK.finditer(markdown_prose(path.read_text(encoding="utf-8"))):
            target = urlsplit(match.group(1) or match.group(2))
            if target.scheme or target.netloc:
                continue
            destination = (path.parent / unquote(target.path)).resolve() if target.path else path
            check(f"local link: {path.relative_to(root).as_posix()} → {target.path or '#'}",
                  destination.is_relative_to(root.resolve()) and destination.exists())
            local_links += 1
            if target.fragment and destination.suffix == ".md":
                if destination not in anchor_cache:
                    anchor_cache[destination] = anchors(destination.read_text(encoding="utf-8"))
                check(f"fragment: {destination.relative_to(root).as_posix()}#{target.fragment}", unquote(target.fragment) in anchor_cache[destination])
                fragments += 1
    json_files = sorted((root / "docs").rglob("*.json"))
    for path in json_files:
        read_json(path)
    check("all documentation JSON parses with unique keys", True, len(json_files))

    catalog = read_json(root / "docs/foundation/annexes/command-catalog.json")
    command_prose = (root / "docs/foundation/annexes/commands-and-diagnostics.md").read_text(encoding="utf-8")
    for group, heading in (("queries", "Query 목록"), ("commands", "Command 목록"), ("diagnostics", "진단 code와 복구")):
        entries = catalog[group]
        keys = [entry.get("id", entry.get("code")) for entry in entries]
        check(f"unique {group}", len(keys) == len(set(keys)))
        rows = table_rows(section(command_prose, heading))[1:]
        check(f"{group} prose row inventory", len(rows) == len(keys) and {row[0] for row in rows} == set(keys))
        by_key = {row[0]: row for row in rows}
        for entry, key in zip(entries, keys):
            if group == "queries":
                expected = [key, ",".join(entry["inputFields"]), ",".join(entry["outputFields"]), entry["scope"]]
            elif group == "commands":
                expected = [key, ",".join(entry["payloadFields"]), ",".join(entry["resultFields"]),
                            entry["scope"] + " · " + entry["reviewClass"]]
            else:
                expected = [key, entry["meaning"], entry["recovery"]]
            check(f"{group} prose projection: {key}", by_key[key] == expected)
    fields = read_json(root / "docs/foundation/annexes/field-catalog.json")["records"]
    field_prose = (root / "docs/foundation/annexes/document-contracts.md").read_text(encoding="utf-8")
    check("unique field record names", len(fields) == len({record["name"] for record in fields}))
    for record in fields:
        check(f"field record owner: {record['name']}", record["ownerDocumentId"] in ids)
        heading = re.search(r"^#{2,4} " + re.escape(record["name"]) + r"\s*$", field_prose, re.M)
        check(f"field record prose: {record['name']}", heading is not None)
        following = re.search(r"^#{2,4} ", field_prose[heading.end():], re.M)
        body = field_prose[heading.end():heading.end() + following.start()] if following else field_prose[heading.end():]
        check(f"field owner prose: {record['name']}", f"책임: [{record['ownerDocumentId']}]" in body)
        names = [field["name"] for field in record["fields"]]
        check(f"unique fields: {record['name']}", len(names) == len(set(names)))
        # The Markdown projection uses '/' for a union so '|' is not a table delimiter.
        expected = [[field["name"], field["type"].replace(" | ", " / ") + ("!" if field["required"] else "?")]
                    for field in record["fields"]]
        check(f"field table projection: {record['name']}", table_rows(body)[1:] == expected)
    for path in manifest["annexPaths"]:
        check(f"manifest annex: {path}", repository_path(root, path).is_file())
    subjects = sorted(paths | {path.relative_to(root).as_posix() for path in (root / "docs/foundation/annexes").rglob("*") if path.is_file()})
    current_subjects = [{"path": path, "sha256": digest(root / path)} for path in subjects]
    if check_hashes and check_subjects:
        expected_subjects = read_json(root / QA_PATH)["subjects"]
        check("QA subject inventory", len(expected_subjects) == len({item["path"] for item in expected_subjects})
              and {item["path"] for item in expected_subjects} == set(subjects))
        expected_hashes = {item["path"]: item["sha256"] for item in expected_subjects}
        for item in current_subjects:
            check(f"QA subject hash: {item['path']}", item["sha256"] == expected_hashes[item["path"]])
    return {
        "kind": "foundation-documentation-qa", "status": "PASS",
        "scope": "Reproducible document integrity only. The separate semantic audit reviews completeness and contract quality; neither is product runtime evidence.",
        "verifiedAt": datetime.now(timezone.utc).isoformat(),
        "checkerProvenance": "scripts/verify-foundation.py",
        "counts": {"documents": BODY_COUNT, "domains": 12, "decisions": DECISION_COUNT,
                   "followups": 14, "fieldRecords": len(fields), "queries": len(catalog["queries"]),
                   "commands": len(catalog["commands"]), "diagnostics": len(catalog["diagnostics"]),
                   "localLinks": local_links, "fragments": fragments, "checks": len(checks)},
        "errors": [], "checks": checks,
        "subjects": current_subjects,
        "subjectPolicy": "QA excludes itself and manifest to avoid self-referential hashes. Historical QA is preserved separately at its original commit.",
    }


def self_test(root: Path, refreshed_qa: dict | None = None) -> list[str]:
    verified = []
    cases = {
        "missing-body": "body exists: GOV01",
        "body-drift": "body hash: GOV01",
        "broken-anchor": "fragment: docs/foundation/README.md#absent-anchor",
        "fenced-code-anchor": "fragment: docs/foundation/README.md#code-only-anchor",
        "dependency-cycle": "Document dependency cycle: GOV01",
        "duplicate-json-key": "Duplicate JSON key: key",
        "non-json-constant": "Non-JSON numeric constant: NaN",
        "duplicate-followup": "14 unique approved followup mappings",
        "unknown-followup-owner": "followup document owners: DQ01",
        "missing-command-projection": "commands prose row inventory",
        "command-field-drift": "commands prose projection: token.create",
        "field-table-drift": "field table projection: DocumentEnvelope",
        "annex-drift": "QA subject hash: docs/foundation/annexes/rights-register.json",
    }
    for case, expected_error in cases.items():
        with tempfile.TemporaryDirectory(prefix="axiom-foundation-negative-") as directory:
            candidate = Path(directory)
            shutil.copytree(root / "docs", candidate / "docs")
            # Some documentation links reference maintenance files outside docs.
            shutil.copytree(root / "reference", candidate / "reference")
            for filename in ("README.md", "AGENTS.md", "LICENSE", ".gitignore"):
                shutil.copyfile(root / filename, candidate / filename)
            shutil.copytree(root / "scripts", candidate / "scripts")
            for directory in ("modules", "apps"):
                if (root / directory).exists():
                    shutil.copytree(root / directory, candidate / directory)
            for filename in ("package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json", "tsconfig.build.json", ".node-version"):
                if (root / filename).exists():
                    shutil.copyfile(root / filename, candidate / filename)
            if (root / ".github").is_dir():
                shutil.copytree(root / ".github", candidate / ".github")
            if refreshed_qa is not None:
                (candidate / QA_PATH).write_text(json.dumps(refreshed_qa, ensure_ascii=False), encoding="utf-8")
            # A broken fixture layout must not make every negative case appear to pass.
            audit(candidate)
            manifest = read_json(candidate / MANIFEST)
            first = candidate / manifest["documents"][0]["path"]
            if case == "missing-body":
                first.unlink()
            elif case == "body-drift":
                first.write_text(first.read_text(encoding="utf-8") + "\nChanged\n", encoding="utf-8")
            elif case == "broken-anchor":
                path = candidate / "docs/foundation/README.md"
                path.write_text(path.read_text(encoding="utf-8") + "\n[Bad](README.md#absent-anchor)\n", encoding="utf-8")
            elif case == "fenced-code-anchor":
                path = candidate / "docs/foundation/README.md"
                path.write_text(path.read_text(encoding="utf-8") + '\n```html\n<a id="code-only-anchor"></a>\n```\n[Bad](README.md#code-only-anchor)\n', encoding="utf-8")
            elif case == "dependency-cycle":
                manifest["documents"][0]["upstreamDocumentIds"].append(manifest["documents"][0]["id"])
                (candidate / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
            elif case == "duplicate-json-key":
                (candidate / "docs/duplicate-fixture.json").write_text('{"key":1,"key":2}', encoding="utf-8")
            elif case == "non-json-constant":
                (candidate / "docs/non-json-fixture.json").write_text('{"key":NaN}', encoding="utf-8")
            elif case == "duplicate-followup":
                manifest["followupCoverage"][1] = manifest["followupCoverage"][0]
                (candidate / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
            elif case == "unknown-followup-owner":
                manifest["followupCoverage"][0]["primaryDocumentIds"] = ["ABSENT"]
                (candidate / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
            elif case == "missing-command-projection":
                path = candidate / "docs/foundation/annexes/commands-and-diagnostics.md"
                path.write_text(path.read_text(encoding="utf-8").replace("| token.create |", "| absent-command |"), encoding="utf-8")
            elif case == "command-field-drift":
                path = candidate / "docs/foundation/annexes/command-catalog.json"
                data = read_json(path)
                next(entry for entry in data["commands"] if entry["id"] == "token.create")["payloadFields"].append("unexpectedField")
                path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            elif case == "field-table-drift":
                path = candidate / "docs/foundation/annexes/field-catalog.json"
                data = read_json(path)
                data["records"][0]["fields"][0]["type"] = "UnknownFixtureType"
                path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            elif case == "annex-drift":
                path = candidate / "docs/foundation/annexes/rights-register.json"
                data = read_json(path)
                data["integrityDriftFixture"] = True
                path.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
            try:
                audit(candidate)
            except ValueError as error:
                require(str(error) == expected_error,
                        f"Negative case {case} failed for wrong cause: expected {expected_error!r}, got {str(error)!r}")
                verified.append(case)
            else:
                raise ValueError(f"Negative case not rejected: {case}")
    require(anchors("# Repeat\n# Repeat\n# Repeat-1\n# Repeat\n") == {"repeat", "repeat-1", "repeat-1-1", "repeat-2"},
            "Heading collision parser fixture failed")
    require(markdown_prose("```text\n```not-a-close\n[Hidden](absent.md)\n```\nVisible") == "Visible",
            "Fence close parser fixture failed")
    require(anchors('`<a id="inline-example"></a>`\n<!-- <a id="comment-example"></a> -->') == set(),
            "Literal HTML anchor parser fixture failed")
    verified.extend(["heading-slug-collisions", "fence-close-with-info", "literal-html-anchors"])
    return verified


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--refresh", action="store_true", help="Explicitly refresh body hashes and current QA after semantic review")
    parser.add_argument("--self-test", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    if args.refresh:
        audit(root, check_hashes=False)
        manifest = read_json(root / MANIFEST)
        for entry in manifest["documents"]:
            entry["bodySha256"] = digest(root / entry["path"])
        (root / MANIFEST).write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    result = audit(root, check_subjects=not args.refresh)
    if args.self_test:
        result["negativeCasesRejected"] = self_test(root, result if args.refresh else None)
    if args.refresh:
        (root / QA_PATH).write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(json.dumps({key: value for key, value in result.items() if key not in {"checks", "subjects"}}, ensure_ascii=True, indent=2))


if __name__ == "__main__":
    main()
