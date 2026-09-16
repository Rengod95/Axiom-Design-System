#!/usr/bin/env python3
"""Verify pinned upstream reference sources, private locks and captured previews."""
from __future__ import annotations

import argparse
import copy
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import re
import struct
import sys
import tempfile
from urllib.parse import urlsplit

PROFILE = "docs/implementation/ads-kernel-profile.json"
REFERENCE_ROOT = "apps/studio/reference"
ADR = "docs/adr/0021-pinned-reference-templates.md"
PROVIDERS = {
    "shadcn": ("2b3e6d4f8d9161fe5c19340dc383aade392012dd", 64, "MIT", "provenance.json"),
    "mantine": ("61049ecd950f6fb9ddc631decfec2edbdffe58e1", 138, "MIT", "upstream-manifest.json"),
    "react-aria": ("4693fcc844a341107e7dd26fe456edb1e269e44c", 21, "Apache-2.0", "provenance.json"),
    "base-ui": ("c70b606cc4c3ee226a187865e20ee6cee924cf27", 2, "MIT", "provenance.json"),
}


class VerificationError(Exception):
    """An upstream, package or asset integrity invariant failed."""


def require(condition: bool, message: str) -> None:
    if not condition:
        raise VerificationError(message)


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def safe_path(base: Path, name: str) -> Path:
    require(isinstance(name, str) and name and "\\" not in name and ":" not in name,
            f"Unsafe reference path: {name}")
    relative = PurePosixPath(name)
    require(not relative.is_absolute() and ".." not in relative.parts and "node_modules" not in relative.parts,
            f"Unsafe reference path: {name}")
    path = base / relative
    require(path.resolve().is_relative_to(base.resolve()), f"Reference path escapes package: {name}")
    return path


def verify_hash(base: Path, name: str, digest: str) -> bytes:
    require(isinstance(digest, str) and re.fullmatch(r"[0-9a-f]{64}", digest), f"Invalid reference SHA-256: {name}")
    path = safe_path(base, name)
    require(path.is_file() and not path.is_symlink(), f"Missing reference file: {name}")
    data = path.read_bytes()
    require(hashlib.sha256(data).hexdigest() == digest, f"Reference SHA-256 mismatch: {name}")
    return data


def check_package(package: dict, lock: dict, policy: dict) -> None:
    require(package.get("private") is True, "Reference package must remain private")
    require(lock.get("lockfileVersion") == 3, "Reference package lock must be npm format 3")
    locked_root = lock.get("packages", {}).get("")
    require(isinstance(locked_root, dict), "Reference lock root missing")
    for kind in ("dependencies", "devDependencies"):
        deps = package.get(kind, {})
        require(deps == policy.get(kind, {}), f"Reference {kind} differ from the accepted profile")
        require(locked_root.get(kind, {}) == deps, f"Reference lock {kind} differ from package")
        for name, version in deps.items():
            require(re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", version), f"Reference dependency is not exact: {name}")
            record = lock["packages"].get("node_modules/" + name, {})
            require(record.get("version") == version, f"Reference lock version mismatch: {name}")
    require(package.get("dependencies", {}).get("react") == "19.3.0"
            and package.get("dependencies", {}).get("react-dom") == "19.3.0", "Reference React runtime pin mismatch")
    for name, record in lock["packages"].items():
        if not name:
            continue
        require(name.startswith("node_modules/") and ".." not in PurePosixPath(name).parts,
                f"Reference lock path is not registry-owned: {name}")
        require(not record.get("link"), f"Reference lock cannot link an ambient package: {name}")
        if record.get("inBundle") is True:
            owner_path, _, bundled_name = name.rpartition("/node_modules/")
            owner = lock["packages"].get(owner_path, {})
            require(bundled_name in owner.get("bundleDependencies", []) and isinstance(owner.get("integrity"), str)
                    and owner["integrity"].startswith("sha512-") and urlsplit(owner.get("resolved", "")).scheme == "https"
                    and re.fullmatch(r"\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?", record.get("version", "")),
                    f"Reference bundled dependency lacks a pinned archive owner: {name}")
            continue
        require(not record.get("link") and isinstance(record.get("integrity"), str)
                and record["integrity"].startswith("sha512-"), f"Reference lock integrity missing: {name}")
        require(urlsplit(record.get("resolved", "")).scheme == "https", f"Reference lock resolution is not HTTPS: {name}")


def check_inventory(templates: list, expected_count: int) -> set[int]:
    rows = [item.get("sourceRow") for item in templates]
    require(len(rows) == expected_count and all(type(row) is int and 1 <= row <= 330 for row in rows)
            and len(set(rows)) == expected_count, "Reference template inventory mismatch")
    require(all(isinstance(item.get("catalogId"), str) and item["catalogId"].startswith("catalog.") for item in templates),
            "Reference template catalog identity missing")
    return set(rows)


def check_previews(assets: list, rows: set[int]) -> None:
    keys = [(item.get("sourceRow"), item.get("theme")) for item in assets]
    require(len(keys) == len(rows) * 2 and set(keys) == {(row, theme) for row in rows for theme in ("light", "dark")},
            "Reference preview inventory mismatch")


def reference_policies(root: Path) -> dict:
    extension = read_json(root / PROFILE).get("referenceTemplates", {})
    require(extension.get("adr") == ADR and "Status: ACCEPTED" in (root / ADR).read_text(encoding="utf-8"),
            "Reference template ADR not accepted")
    require(extension.get("installation") == "npm ci --ignore-scripts" and extension.get("iframeSandbox") == "allow-scripts",
            "Reference execution/install boundary changed")
    packages = extension.get("packages", {})
    require(set(packages) == set(PROVIDERS), "Unapproved reference package roots")
    for provider, (commit, count, license_name, manifest) in PROVIDERS.items():
        policy = packages[provider]
        require(policy.get("root") == f"{REFERENCE_ROOT}/{provider}" and policy.get("commit") == commit
                and policy.get("templateCount") == count and policy.get("license") == license_name
                and policy.get("manifest") == manifest, f"Reference profile mismatch: {provider}")
    return packages


def package_records(root: Path, provider: str, policy: dict) -> tuple[set[str], dict]:
    """Return a closed file inventory after verifying every source, license and preview."""
    base = root / policy["root"]
    manifest = read_json(safe_path(base, policy["manifest"]))
    require(manifest.get("commit", manifest.get("upstreamCommit")) == policy["commit"], f"Upstream commit mismatch: {provider}")
    require(manifest.get("license") == policy["license"], f"Upstream license mismatch: {provider}")
    rows = check_inventory(manifest["templates"], policy["templateCount"])
    records: dict[str, str] = {}

    def record(name: str, digest: str) -> None:
        require(name not in records or records[name] == digest, f"Conflicting reference hashes: {name}")
        verify_hash(base, name, digest)
        records[name] = digest

    sources = manifest["sources"] if provider == "shadcn" else manifest["files"]
    require(bool(sources), f"Reference source inventory empty: {provider}")
    for source in sources:
        name = source["path"]
        url = source.get("url", source.get("sourceUrl", ""))
        require(urlsplit(url).scheme == "https", f"Upstream URL missing: {name}")
        digest = source["vendoredSha256"] if provider == "shadcn" else source["sha256"]
        record(name, digest)
        if provider == "shadcn":
            record(source["originalPath"], source["upstreamSha256"])
            require(source["upstreamSha256"] == digest or bool(source.get("transformations")),
                    f"Undeclared reference transformation: {name}")
            require(policy["commit"] in url or bool(source.get("registrySha256")), f"Unpinned upstream URL: {name}")
        elif "github.com" in url:
            require(policy["commit"] in url, f"Unpinned upstream URL: {name}")
    for asset in manifest.get("assets", []):
        record(asset.get("localPath", asset.get("path")), asset["sha256"])
    if provider == "shadcn":
        theme = manifest["themeSource"]
        record(theme["originalPath"], theme["upstreamSha256"])
        record(theme["localPath"], theme["vendoredSha256"])
    record(policy["licenseFile"], policy["licenseSha256"])
    for notice in manifest.get("licenses", []):
        record(notice["path"], notice["sha256"])

    previews = read_json(safe_path(base, policy["previewManifest"]))
    assets = previews.get("assets", previews.get("previews", []))
    check_previews(assets, rows)
    for asset in assets:
        expected = f"previews/{asset['sourceRow']}-{asset['theme']}.png"
        name = asset.get("path", "previews/" + asset.get("file", ""))
        require(name == expected, f"Reference preview name mismatch: {name}")
        data = verify_hash(base, name, asset["sha256"])
        require(data[:8] == b"\x89PNG\r\n\x1a\n", f"Reference preview is not PNG: {name}")
        width, height = struct.unpack(">II", data[16:24])
        require((width, height) == (asset["width"], asset["height"]) and 0 < width <= 640 and 0 < height <= 480,
                f"Reference preview dimensions mismatch: {name}")
        records[name] = asset["sha256"]

    check_package(read_json(base / "package.json"), read_json(base / "package-lock.json"), policy)
    permitted = set(records) | {policy["manifest"], policy["previewManifest"], "package.json", "package-lock.json"}
    for name in policy["adapterFiles"]:
        require(safe_path(base, name).is_file(), f"Reference adapter missing: {name}")
        permitted.add(name)
    for required in ("entry.tsx",):
        require(required in permitted, f"Reference mount adapter missing: {provider}")
    return {policy["root"] + "/" + name for name in permitted}, {"provider": provider, "templates": len(rows), "sources": len(sources), "previews": len(assets), "rows": sorted(rows)}


def allowed_reference_files(root: Path) -> tuple[set[str], list[dict]]:
    permitted: set[str] = set()
    results = []
    for provider, policy in reference_policies(root).items():
        files, result = package_records(root, provider, policy)
        permitted |= files
        results.append(result)
    rows = [row for result in results for row in result["rows"]]
    require(len(rows) == len(set(rows)) == 225, "Cross-provider template inventory mismatch")
    return permitted, results


def verify(root: Path, built: bool = False) -> dict:
    permitted, results = allowed_reference_files(root)
    actual = set()
    bases = {root / REFERENCE_ROOT / provider for provider in PROVIDERS}
    for directory, names, filenames in os.walk(root / REFERENCE_ROOT):
        base = Path(directory)
        if base in bases:
            names[:] = [name for name in names if name != "node_modules"]
        for name in names + filenames:
            require(not (base / name).is_symlink(), f"Reference symlink: {base / name}")
        actual |= {(base / name).relative_to(root).as_posix() for name in filenames}
    require(actual == permitted, f"Unapproved reference files: {sorted(actual - permitted)}; missing: {sorted(permitted - actual)}")
    config = read_json(root / "tsconfig.json")
    require(config.get("exclude") == ["node_modules", "apps/studio/reference/**"], "Reference TypeScript exclusion changed")
    registry_source = (root / "modules/ads-core/src/studio-reference-data.ts").read_text(encoding="utf-8")
    registry = json.loads(registry_source.split(" = ", 1)[1].strip().removesuffix(";"))
    require(len(registry) == 225 and len({entry["catalogId"] for entry in registry}) == 225,
            "Runtime reference registry inventory mismatch")
    for result in results:
        entries = [entry for entry in registry if entry["bundle"] == result["provider"]]
        require(sorted(entry["sourceRow"] for entry in entries) == result["rows"],
                f"Runtime reference registry source rows mismatch: {result['provider']}")
        require(all(entry["commit"] == PROVIDERS[result["provider"]][0] for entry in entries),
                f"Runtime reference registry commit mismatch: {result['provider']}")
    for provider in PROVIDERS:
        require((root / f"scripts/build-reference-{provider}.mjs").is_file(), f"Reference build script missing: {provider}")
    if built:
        output = root / "dist/studio/references"
        for result in results:
            provider = result["provider"]
            manifest = read_json(output / f"{provider}-manifest.json")
            rows = manifest.get("sourceRows", [item["sourceRow"] for item in manifest.get("templates", [])])
            require(sorted(rows) == result["rows"], f"Built reference inventory mismatch: {provider}")
            for suffix in ("js", "css"):
                require((output / f"{provider}.{suffix}").stat().st_size > 0, f"Empty reference bundle: {provider}.{suffix}")
            policy = reference_policies(root)[provider]
            verify_hash(output, f"{provider}-LICENSE.txt", policy["licenseSha256"])
            for row in result["rows"]:
                for theme in ("light", "dark"):
                    name = f"{row}-{theme}.png"
                    digest = hashlib.sha256((root / policy["root"] / "previews" / name).read_bytes()).hexdigest()
                    verify_hash(output, f"{provider}-previews/{name}", digest)
    return {"status": "PASSED", "packages": [{key: value for key, value in result.items() if key != "rows"} for result in results],
            "sourceFilesAndAssets": len(permitted), "builtOutputsChecked": built,
            "scope": "Pinned sources, licenses, package locks, preview inventories and declared build outputs; browser behavior is separate evidence"}


def self_tests() -> list[str]:
    rejected = []
    with tempfile.TemporaryDirectory(prefix="axiom-reference-negative-") as directory:
        base = Path(directory)
        (base / "source.css").write_bytes(b"original")
        digest = hashlib.sha256(b"original").hexdigest()
        package = {"private": True, "dependencies": {"react": "19.3.0", "react-dom": "19.3.0"}}
        lock = {"lockfileVersion": 3, "packages": {"": {"dependencies": package["dependencies"]}, **{
            "node_modules/" + key: {"version": value, "integrity": "sha512-test", "resolved": "https://registry.npmjs.org/test.tgz"}
            for key, value in package["dependencies"].items()}}}
        policy = copy.deepcopy(package)
        bad_package = copy.deepcopy(package); bad_package["dependencies"]["react"] = "^19.3.0"
        bad_lock = copy.deepcopy(lock); bad_lock["packages"]["node_modules/react"]["version"] = "19.2.0"
        bad_bundle = copy.deepcopy(lock); bad_bundle["packages"]["node_modules/react"]["inBundle"] = True
        cases = [
            ("path-traversal", lambda: safe_path(base, "../escape.css")),
            ("absolute-path", lambda: safe_path(base, "C:/escape.css")),
            ("source-byte-drift", lambda: verify_hash(base, "source.css", "0" * 64)),
            ("license-byte-drift", lambda: verify_hash(base, "source.css", hashlib.sha256(b"changed license").hexdigest())),
            ("dependency-drift", lambda: check_package(bad_package, lock, policy)),
            ("lock-version-drift", lambda: check_package(package, bad_lock, policy)),
            ("unowned-bundled-dependency", lambda: check_package(package, bad_bundle, policy)),
            ("template-inventory-drift", lambda: check_inventory([{"sourceRow": 1, "catalogId": "catalog.a"}] * 2, 2)),
            ("missing-dark-preview", lambda: check_previews([{"sourceRow": 1, "theme": "light"}], {1})),
        ]
        verify_hash(base, "source.css", digest)
        check_package(package, lock, policy)
        for name, run in cases:
            try:
                run()
            except VerificationError:
                rejected.append(name)
            else:
                raise VerificationError(f"Reference negative case was not rejected: {name}")
    return rejected


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    parser.add_argument("--built", action="store_true")
    args = parser.parse_args()
    try:
        result = verify(Path(__file__).resolve().parents[1], args.built)
        if args.self_test:
            result["negativeCasesRejected"] = self_tests()
        print(json.dumps(result, indent=2))
        return 0
    except (VerificationError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Reference integrity verification failed: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
