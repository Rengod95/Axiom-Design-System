#!/usr/bin/env python3
"""Verify the frozen Git snapshot and guard the documentation-only active tree."""

from __future__ import annotations

import argparse
import collections
import hashlib
import io
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import unquote, urlsplit

SNAPSHOT_COMMIT = "1b7bd6843ac638fac89da424637afa755d076144"
ORIGINAL_MAIN = "f368ae7d208424c922637ca625ab9687a85ed5b9"
EXPECTED_FILE_COUNT = 442
EXPECTED_REMOVED_COUNT = 432
SNAPSHOT_PATH = "reference/pre-studio/snapshot.json"
VERIFIER_PATH = "scripts/verify-retirement.py"
IMPLEMENTATION_PROFILE = "docs/implementation/ads-kernel-profile.json"
IMPLEMENTATION_ROOTS = {"modules/ads-core", "modules/local-store", "apps/cli", "modules/browser-store", "modules/target-packs", "apps/studio", "apps/delivery"}
IMPLEMENTATION_ROOT_FILES = {"package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json", "tsconfig.build.json", ".node-version"}
IMPLEMENTATION_SCRIPTS = {"scripts/run-tests.mjs", "scripts/check-implementation.mjs", "scripts/generate-ads-validator.mjs", "scripts/verify-browser-store.mjs", "scripts/build-studio.mjs", "scripts/serve-studio.mjs", "scripts/verify-studio.mjs", "scripts/verify-targets.mjs", "scripts/browser-driver.mjs", "scripts/verify-workbench.mjs", "scripts/workbench-completion-cases.mjs", "scripts/workbench-foundation-cases.mjs", "scripts/workbench-chrome-cases.mjs", "scripts/workbench-catalog-cases.mjs", "scripts/workbench-authoring-cases.mjs", 'scripts/native-fixtures.mjs', 'scripts/native-verify.mjs', 'scripts/workbench-behavior-cases.mjs', 'scripts/workbench-policy-cases.mjs', 'scripts/workbench-composition-cases.mjs'}
BROWSER_TEST_ASSETS = {"modules/browser-store/test/browser-harness.html", "modules/browser-store/test/browser-harness.js"}
TARGET_TEST_ASSETS = {"modules/target-packs/test/expo-consumer.lock.yaml"}
STUDIO_ASSETS = {'apps/studio/.impeccable/surfaces/workbench.md', 'apps/studio/.impeccable/design.json', 'apps/studio/DESIGN.md', 'apps/studio/index.html', 'apps/studio/src/styles.css', 'apps/studio/src/ui-system.css', 'apps/studio/src/foundation-workspace.css', 'apps/studio/src/studio-chrome.css', 'apps/studio/src/foundation-blueprint.css', 'apps/studio/src/studio-slider.css', 'apps/studio/src/catalog-specimens.css', 'apps/studio/src/component-authoring.css', 'apps/studio/src/foundation-starters.css', 'apps/studio/src/element-authoring.css', 'apps/studio/src/behavior-editor.css', 'apps/studio/src/foundation-policy.css', 'apps/studio/.impeccable/config.json', 'apps/studio/PRODUCT.md'}
APPROVED_REPLACEMENTS = {"package.json", "pnpm-lock.yaml", "pnpm-workspace.yaml", "tsconfig.json"}
RETIRED_DIRECTORIES = {"packages", "spec", "fixtures", "tokens"}
UNCHANGED_PATHS = {"LICENSE", ".gitignore"}
REVISED_PATHS = {
    ".github/workflows/quality.yml", ".github/workflows/native.yml", "AGENTS.md", "README.md", "docs/README.md",
    "docs/adr/0006-product-reset-and-reference-lifecycle.md",
    "docs/standards/source-code-and-module-structure.md",
    "docs/maintenance/pre-studio-retirement.md",
    "docs/maintenance/pre-studio-retirement.json",
}
FIXED_ACTIVE_PATHS = UNCHANGED_PATHS | REVISED_PATHS | {
    "docs/adr/0007-git-reference-and-documentation-phase.md",
    "reference/pre-studio/README.md", SNAPSHOT_PATH, VERIFIER_PATH,
    "scripts/verify-foundation.py",
}
MARKDOWN_LINK = re.compile(r"\[[^\]]+\]\((?:<([^>]+)>|([^\s)]+))(?:\s+['\"][^)]*)?\)")
FENCED_CODE = re.compile(r"^\s*(`{3,}|~{3,}).*?$.*?^\s*\1\s*$", re.MULTILINE | re.DOTALL)


class VerificationError(Exception):
    """Represent a failed preservation, phase-boundary or document-link invariant."""


def require(condition: bool, message: str) -> None:
    """Stop at a concrete failed invariant without changing repository files."""
    if not condition:
        raise VerificationError(message)


def git_output(repository: Path, *arguments: str) -> bytes:
    """Read the repository's existing Git objects; never fetch or mutate refs."""
    result = subprocess.run(
        # Git archive can apply host newline settings. Reference verification is
        # against blob bytes, independent of a contributor's Windows defaults.
        ["git", "-c", "core.autocrlf=false", "-c", "core.eol=lf", "-C", str(repository), *arguments], capture_output=True, check=False
    )
    require(result.returncode == 0,
            f"Git object read failed: {' '.join(arguments)}. "
            "Fetch the documented reference commit first. "
            + result.stderr.decode(errors="replace").strip())
    return result.stdout


def active_files(root: Path) -> list[Path]:
    """Enumerate checkout files without traversing Git metadata or symlinks."""
    files = []
    profile = implementation_profile(root)
    for directory, names, filenames in os.walk(root):
        ignored = {".git"}
        if profile and Path(directory) == root:
            ignored |= {"node_modules", "dist", "coverage"}
        names[:] = [name for name in names if name not in ignored]
        for name in names:
            path = Path(directory) / name
            require(not path.is_symlink(), f"Directory symlink outside phase policy: {path}")
        for name in filenames:
            if name == ".git" and Path(directory) == root:
                continue
            path = Path(directory) / name
            require(not path.is_symlink(), f"File symlink outside phase policy: {path}")
            files.append(path)
    return sorted(files)


def implementation_profile(root: Path) -> dict | None:
    """Recognize only the explicitly approved bounded bootstrap profile."""
    path = root / IMPLEMENTATION_PROFILE
    if not path.exists():
        return None
    profile = json.loads(path.read_text(encoding="utf-8"))
    require(profile.get("kind") == "axiom-implementation-profile" and profile.get("status") == "ACCEPTED",
            "Unapproved implementation profile")
    require(profile.get("phase") == "I1_I5_STUDIO_VERTICAL", "Unknown implementation phase")
    require(set(profile.get("allowedSourceRoots", [])) == IMPLEMENTATION_ROOTS,
            "Unapproved implementation source roots")
    require(set(profile.get("allowedRootFiles", [])) == IMPLEMENTATION_ROOT_FILES,
            "Unapproved implementation root files")
    require(set(profile.get("allowedMaintenanceFiles", [])) == IMPLEMENTATION_SCRIPTS,
            "Unapproved implementation maintenance files")
    require(set(profile.get("allowedBrowserTestAssets", [])) == BROWSER_TEST_ASSETS,
            "Unapproved browser test assets")
    require(set(profile.get("allowedStudioAssets", [])) == STUDIO_ASSETS, "Unapproved Studio assets")
    require(set(profile.get("allowedTargetTestAssets", [])) == TARGET_TEST_ASSETS, "Unapproved target test assets")
    require(set(profile.get("reintroducedRetiredPaths", [])) == APPROVED_REPLACEMENTS,
            "Unapproved retired path replacement")
    require(profile.get("adr") == "docs/adr/0009-ads-kernel-implementation-bootstrap.md",
            "Implementation bootstrap ADR mismatch")
    require("Status: ACCEPTED" in (root / profile["adr"]).read_text(encoding="utf-8"),
            "Implementation bootstrap ADR not accepted")
    require(profile.get("extensionAdrs") == ["docs/adr/0010-source-preserving-draft-authoring.md", "docs/adr/0011-structural-domain-inspection-and-local-references.md", "docs/adr/0012-typed-values-and-project-bundles.md", "docs/adr/0013-browser-transactional-storage.md", "docs/adr/0014-studio-authoring-and-target-delivery.md", "docs/adr/0015-studio-workbench-and-catalog-authoring.md", "docs/adr/0016-foundation-onboarding-and-editor-completion.md", "docs/adr/0017-foundation-interchange-and-live-expressions.md", "docs/adr/0018-contextual-foundation-and-component-composition.md", 'docs/adr/0019-element-composition-policy-and-behavior-authoring.md']
            and all("Status: ACCEPTED" in (root / adr).read_text(encoding="utf-8") for adr in profile["extensionAdrs"]),
            "Implementation extension ADR not accepted")
    require(profile.get("approval") == "docs/decisions/axiom-foundation-baseline-approval.json",
            "Implementation approval path mismatch")
    approval = json.loads((root / profile["approval"]).read_text(encoding="utf-8"))
    require(approval.get("fullDocumentationApproved") is True and approval.get("newImplementationAuthorized") is True,
            "Implementation authorization missing")
    return profile


def read_inventory(root: Path, repository: Path) -> tuple[dict, dict]:
    """Compare every declared path/blob/mode/size against the pinned complete tree."""
    document = json.loads((root / SNAPSHOT_PATH).read_text(encoding="utf-8"))
    require(document.get("format") == "axiom-reference-snapshot", "Unknown snapshot format")
    require(document.get("formatVersion") == "1.0.0", "Unknown snapshot format version")
    require(document.get("commit") == SNAPSHOT_COMMIT, "Pinned snapshot commit changed")
    require(document.get("originalMain") == ORIGINAL_MAIN, "Original main identity changed")
    actual_tree = git_output(repository, "rev-parse", SNAPSHOT_COMMIT + "^{tree}").decode().strip()
    require(document.get("tree") == actual_tree, "Snapshot tree identifier mismatch")
    records = document.get("files", [])
    require(len(records) == EXPECTED_FILE_COUNT == document.get("fileCount"), "Snapshot file count mismatch")
    by_path = {record["path"]: record for record in records}
    require(len(by_path) == len(records), "Duplicate snapshot paths")
    expected = {}
    for raw in git_output(repository, "ls-tree", "-rz", "--long", SNAPSHOT_COMMIT).split(b"\0"):
        if not raw:
            continue
        attributes, path_bytes = raw.split(b"\t", 1)
        mode, kind, blob, size = attributes.decode().split()
        require(kind == "blob", "Unexpected non-blob snapshot entry")
        expected[path_bytes.decode()] = (mode, blob, int(size))
    require(set(by_path) == set(expected), "Inventory paths differ from the complete Git tree")
    for path, record in by_path.items():
        require(PurePosixPath(path).is_absolute() is False and ".." not in PurePosixPath(path).parts,
                f"Unsafe inventory path: {path}")
        require((record["mode"], record["gitBlob"], record["bytes"]) == expected[path],
                f"Snapshot Git metadata mismatch: {path}")
        disposition = "retain-unchanged" if path in UNCHANGED_PATHS else (
            "retain-revised" if path in REVISED_PATHS else "remove-from-active")
        require(record.get("disposition") == disposition, f"Disposition mismatch: {path}")
    counts = dict(collections.Counter(record["disposition"] for record in records))
    require(counts == document.get("dispositionCounts"), "Disposition totals mismatch")
    require(counts.get("remove-from-active") == EXPECTED_REMOVED_COUNT, "Removal count mismatch")
    require(sum(record["bytes"] for record in records) == document.get("totalBytes"), "Snapshot byte total mismatch")
    return document, by_path


def restore_and_verify(repository: Path, records: dict) -> int:
    """Restore the exact Git archive in a temporary directory and verify all bytes."""
    archive = git_output(repository, "archive", "--format=tar", SNAPSHOT_COMMIT)
    restored = set()
    with tempfile.TemporaryDirectory(prefix="axiom-snapshot-check-") as directory:
        destination = Path(directory)
        with tarfile.open(fileobj=io.BytesIO(archive), mode="r:") as stream:
            for member in stream:
                if member.isdir():
                    continue
                require(member.isfile() and member.name in records,
                        f"Unexpected or unsafe archive member: {member.name}")
                require(member.name not in restored, f"Duplicate archive member: {member.name}")
                target = destination / member.name
                require(target.resolve().is_relative_to(destination.resolve()), "Archive path escapes destination")
                payload = stream.extractfile(member)
                require(payload is not None, f"Archive member unreadable: {member.name}")
                data = payload.read()
                target.parent.mkdir(parents=True, exist_ok=True)
                target.write_bytes(data)
                actual = target.read_bytes()
                record = records[member.name]
                require(len(actual) == record["bytes"], f"Restored size mismatch: {member.name}")
                require(hashlib.sha256(actual).hexdigest() == record["sha256"],
                        f"Restored SHA-256 mismatch: {member.name}")
                blob = hashlib.sha1(b"blob " + str(len(actual)).encode() + b"\0" + actual).hexdigest()
                require(blob == record["gitBlob"], f"Restored Git blob mismatch: {member.name}")
                restored.add(member.name)
        require(restored == set(records), "Archive restoration is incomplete")
    return len(restored)


def verify_active_tree(root: Path, records: dict) -> tuple[int, int]:
    """Reject restored product paths and broken links while permitting planning docs."""
    profile = implementation_profile(root)
    replacements = APPROVED_REPLACEMENTS if profile else set()
    for directory in RETIRED_DIRECTORIES:
        require(not (root / directory).exists(), f"Retired directory resurrected: {directory}")
    for path, record in records.items():
        if record["disposition"] == "remove-from-active":
            if path in replacements and (root / path).is_file():
                require(hashlib.sha256((root / path).read_bytes()).hexdigest() != record["sha256"],
                        f"Frozen manifest resurrected instead of approved replacement: {path}")
            else:
                require(not (root / path).exists(), f"Retired path resurrected: {path}")
        elif record["disposition"] == "retain-unchanged":
            require((root / path).is_file(), f"Preserved legal/config file missing: {path}")
            require(hashlib.sha256((root / path).read_bytes()).hexdigest() == record["sha256"],
                    f"Preserved legal/config file changed: {path}")
    for path in FIXED_ACTIVE_PATHS:
        require((root / path).is_file(), f"Required phase file missing: {path}")
    files = active_files(root)
    links = 0
    for path in files:
        relative = path.relative_to(root).as_posix()
        permitted_document = relative.startswith("docs/") and path.suffix in {".md", ".json"}
        permitted_implementation = bool(profile) and (
            relative in IMPLEMENTATION_ROOT_FILES | IMPLEMENTATION_SCRIPTS | BROWSER_TEST_ASSETS | STUDIO_ASSETS | TARGET_TEST_ASSETS or
            any(relative.startswith(prefix + "/") for prefix in IMPLEMENTATION_ROOTS)
            and (path.suffix in {".ts", ".json", ".md"} or relative.startswith("apps/studio/src/") and path.suffix == ".tsx"))
        require(relative in FIXED_ACTIVE_PATHS or permitted_document or permitted_implementation,
                f"Unapproved active file for current phase: {relative}")
        if path.suffix != ".md":
            continue
        prose = FENCED_CODE.sub("", path.read_text(encoding="utf-8"))
        for match in MARKDOWN_LINK.finditer(prose):
            target = match.group(1) or match.group(2)
            parsed = urlsplit(target)
            if parsed.scheme or parsed.netloc or not parsed.path:
                continue
            target_path = (path.parent / unquote(parsed.path)).resolve()
            require(target_path.is_relative_to(root.resolve()), f"Local link escapes checkout: {relative}: {target}")
            require(target_path.exists(), f"Broken local link: {relative}: {target}")
            links += 1
    return len(files), links


def verify(root: Path, repository: Path) -> dict:
    """Run independent Git preservation and active-tree checks without writes."""
    document, records = read_inventory(root, repository)
    restored = restore_and_verify(repository, records)
    file_count, links = verify_active_tree(root, records)
    replacements = [path for path in APPROVED_REPLACEMENTS if implementation_profile(root)
                    and path in records and records[path]["disposition"] == "remove-from-active"
                    and (root / path).is_file()]
    return {
        "snapshotCommit": document["commit"], "snapshotFilesVerified": len(records),
        "archiveFilesRestoredAndVerified": restored, "retiredPathsAbsent": EXPECTED_REMOVED_COUNT - len(replacements),
        "approvedReplacementPathsPresent": sorted(replacements),
        "activeFilesChecked": file_count, "localLinksChecked": links,
        "preservedFilesUnchanged": sorted(UNCHANGED_PATHS),
        "scope": "frozen reference, approved phase boundaries and document integrity; not product tests",
    }


def run_self_tests(root: Path, repository: Path) -> list[str]:
    """Prove corruption, source resurrection and broken links are actually rejected."""
    verified = []
    cases = ["snapshot-digest-corruption", "retired-package-resurrection", "broken-document-link", "new-product-source"]
    if implementation_profile(root):
        cases += ["unapproved-profile-root", "missing-implementation-authorization", "frozen-manifest-resurrection", "unapproved-browser-harness", "unapproved-studio-page", "unapproved-target-lock"]
    for case in cases:
        with tempfile.TemporaryDirectory(prefix="axiom-retirement-negative-") as directory:
            candidate = Path(directory)
            for source in active_files(root):
                target = candidate / source.relative_to(root)
                target.parent.mkdir(parents=True, exist_ok=True)
                shutil.copyfile(source, target)
            if case == "snapshot-digest-corruption":
                path = candidate / SNAPSHOT_PATH
                document = json.loads(path.read_text())
                document["files"][0]["sha256"] = "0" * 64
                path.write_text(json.dumps(document))
                expected_message = "Restored SHA-256 mismatch"
            elif case == "retired-package-resurrection":
                path = candidate / "packages/tokens/src/index.ts"
                path.parent.mkdir(parents=True)
                path.write_text("export {};\n")
                expected_message = "Retired directory resurrected"
            elif case == "broken-document-link":
                with (candidate / "README.md").open("a") as stream:
                    stream.write("\n[Broken fixture](docs/does-not-exist.md)\n")
                expected_message = "Broken local link"
            elif case == "unapproved-profile-root":
                path = candidate / IMPLEMENTATION_PROFILE
                document = json.loads(path.read_text(encoding="utf-8"))
                document["allowedSourceRoots"].append("modules/unapproved")
                path.write_text(json.dumps(document), encoding="utf-8")
                expected_message = "Unapproved implementation source roots"
            elif case == "missing-implementation-authorization":
                path = candidate / "docs/decisions/axiom-foundation-baseline-approval.json"
                document = json.loads(path.read_text(encoding="utf-8"))
                document["newImplementationAuthorized"] = False
                path.write_text(json.dumps(document), encoding="utf-8")
                expected_message = "Implementation authorization missing"
            elif case == "frozen-manifest-resurrection":
                (candidate / "package.json").write_bytes(git_output(repository, "show", SNAPSHOT_COMMIT + ":package.json"))
                expected_message = "Frozen manifest resurrected"
            elif case == "unapproved-browser-harness":
                (candidate / "modules/browser-store/test/unapproved.html").write_text("<!doctype html>", encoding="utf-8")
                expected_message = "Unapproved active file"
            elif case == "unapproved-studio-page":
                (candidate / "apps/studio/unapproved.html").write_text("<!doctype html>", encoding="utf-8")
                expected_message = "Unapproved active file"
            elif case == "unapproved-target-lock":
                (candidate / "modules/target-packs/test/unapproved.yaml").write_text("dependencies: {}", encoding="utf-8")
                expected_message = "Unapproved active file"
            else:
                path = candidate / "src/unapproved.ts"
                path.parent.mkdir(parents=True)
                path.write_text("export {};\n")
                expected_message = "Unapproved active file"
            try:
                verify(candidate, repository)
            except VerificationError as error:
                require(expected_message in str(error), f"Negative case {case} failed for unexpected reason: {error}")
                verified.append(case)
            else:
                raise VerificationError(f"Negative case was not rejected: {case}")
    return verified


def main() -> int:
    """Report checks and optional negative evidence without running old product tests."""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--self-test", action="store_true")
    arguments = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    try:
        result = verify(root, root)
        if arguments.self_test:
            result["negativeCasesRejected"] = run_self_tests(root, root)
        print(json.dumps(result, indent=2))
    except (VerificationError, OSError, ValueError, KeyError, TypeError) as error:
        print(f"Retirement verification failed: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
