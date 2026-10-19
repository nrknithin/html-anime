# un7z.py — read members out of a .7z archive for ingest.mjs (a 7z source, e.g. an OpenGameArt crocodile.7z).
#   python -I un7z.py <archive.7z> <out-dir> <member> [<member> ...]
# Writes each member under out-dir at its archive path (paths that would leave out-dir are refused) and prints a
# JSON list of the archive's names. Needs py7zr (pip install py7zr) in the same Python as LIBRARY_PYTHON.
# The archive is data: members are only written to disk, nothing in them is run.

import json
import os
import sys

import py7zr


def norm(name):
    return name.replace("\\", "/").lstrip("/")


def main():
    archive, out, *want = sys.argv[1:]
    out = os.path.realpath(out)
    with py7zr.SevenZipFile(archive, "r") as z:
        names = [norm(n) for n in z.getnames()]
        missing = [w for w in want if norm(w) not in names]
        if missing:
            print(json.dumps({"names": names, "missing": missing}))
            sys.exit(2)
        for w in want:
            to = os.path.realpath(os.path.join(out, norm(w)))
            if not to.startswith(out + os.sep):
                raise SystemExit(f"un7z: {w} leaves the output folder")
        z.extract(path=out, targets=[n for n in z.getnames() if norm(n) in {norm(w) for w in want}])
    print(json.dumps({"names": names}))


if __name__ == "__main__":
    main()
