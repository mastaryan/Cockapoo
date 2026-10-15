#!/usr/bin/env python3
"""
flatten-ssi.py -- inline SSI <!--#include --> directives into static pages.

bluegrassdoodle.com uses Apache Server Side Includes, e.g.
    <!--#include virtual="/includes/seo-global.html" -->
Render's free static hosting does not process SSI, so this script replaces
every include directive with the referenced file's contents (recursively).

The flattened pages render identically on the current GoDaddy/Apache
hosting, so this is safe to commit and deploy BEFORE the Render move.
Run from the repo root:

    python3 tools/flatten-ssi.py            # rewrite .html/.shtml in place
    python3 tools/flatten-ssi.py --check    # report only, change nothing

Re-run any time you edit a file under includes/.
"""

import os
import re
import sys

ROOT = os.getcwd()  # run from the repo root

INCLUDE_RE = re.compile(
    r'<!--\s*#include\s+(virtual|file)\s*=\s*"([^"]+)"\s*-->',
    re.IGNORECASE,
)
# Any other SSI directive (#echo, #if, #config, #exec, ...) is NOT handled.
OTHER_SSI_RE = re.compile(r'<!--\s*#(?!include\b)\w+', re.IGNORECASE)


def resolve_include(kind, path, including_file):
    if kind.lower() == "virtual" and path.startswith("/"):
        return os.path.normpath(os.path.join(ROOT, path.lstrip("/")))
    return os.path.normpath(
        os.path.join(os.path.dirname(including_file), path)
    )


def flatten_file(path, stack):
    """Return the file's contents with all includes inlined."""
    if path in stack:
        raise RuntimeError(
            "SSI include cycle detected: %s -> %s" % (" -> ".join(stack), path)
        )
    with open(path, "r", encoding="utf-8") as f:
        text = f.read()

    def replace(match):
        kind, inc_path = match.group(1), match.group(2)
        target = resolve_include(kind, inc_path, path)
        if not os.path.isfile(target):
            raise RuntimeError(
                "SSI include target not found: %s (from %s)" % (inc_path, path)
            )
        return flatten_file(target, stack + [path])

    return INCLUDE_RE.sub(replace, text)


def find_pages():
    pages = []
    for dirpath, dirnames, filenames in os.walk(ROOT):
        if ".git" in dirnames:
            dirnames.remove(".git")
        for name in filenames:
            if name.lower().endswith((".html", ".shtml")):
                pages.append(os.path.join(dirpath, name))
    return sorted(pages)


def main():
    check_only = "--check" in sys.argv
    pages = find_pages()
    if not pages:
        print("No .html/.shtml pages found under %s" % ROOT)
        return 1

    problems = []
    for page in pages:
        try:
            with open(page, "r", encoding="utf-8") as f:
                original = f.read()
            if OTHER_SSI_RE.search(original):
                directives = sorted(set(OTHER_SSI_RE.findall(original)))
                problems.append(
                    "%s: unhandled SSI directives %s"
                    % (os.path.relpath(page, ROOT), directives)
                )
        except OSError as e:
            problems.append("%s: cannot read (%s)" % (page, e))

    if problems:
        print("Refusing to flatten -- unhandled SSI directives found:")
        for p in problems:
            print("  " + p)
        return 1

    if check_only:
        print("OK: %d pages, all SSI usage is #include only." % len(pages))
        return 0

    changed = 0
    for page in pages:
        with open(page, "r", encoding="utf-8") as f:
            original = f.read()
        flattened = flatten_file(page, [])
        if flattened != original:
            with open(page, "w", encoding="utf-8") as f:
                f.write(flattened)
            changed += 1
            print("flattened %s" % os.path.relpath(page, ROOT))

    print("Done: %d of %d pages updated." % (changed, len(pages)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
