"""Build the portable Maia runtime from checksum-locked local artifacts only."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import zipfile

p = argparse.ArgumentParser()
p.add_argument("--cache", required=True)
p.add_argument("--lock", required=True)
args = p.parse_args()
cache = Path(args.cache).resolve()
lock = json.loads(Path(args.lock).read_text(encoding="utf-8"))
packages = lock["packages"]
for package in packages:
    file = cache / package["sha256"] / package["file"]
    if not file.is_file() or hashlib.file_digest(file.open("rb"), "sha256").hexdigest() != package["sha256"]:
        raise ValueError("dependency_checksum_mismatch: " + package["name"])

site = Path(sys.executable).parent / "Lib" / "site-packages"
site.mkdir(parents=True, exist_ok=True)
# Bootstrap the locked build tools without get-pip or an online package index.
for package in packages:
    if package["name"].lower() not in {"pip", "setuptools", "wheel", "packaging"}:
        continue
    with zipfile.ZipFile(cache / package["sha256"] / package["file"]) as archive:
        for info in archive.infolist():
            if not (site / info.filename).resolve().is_relative_to(site.resolve()):
                raise ValueError("unsafe_archive_path")
        archive.extractall(site)
env = dict(os.environ, PIP_NO_INDEX="1", PIP_DISABLE_PIP_VERSION_CHECK="1", HF_HUB_OFFLINE="1")
subprocess.run([sys.executable, "-m", "pip", "install", "--no-index", "--no-deps",
                "--no-build-isolation", "--no-warn-script-location", "--disable-pip-version-check",
                *[str(cache / item["sha256"] / item["file"]) for item in packages]],
               check=True, env=env, creationflags=0x08000000 if os.name == "nt" else 0)
subprocess.run([sys.executable, "-c", "import torch, chess, maia3; print('runtime_verified')"],
               check=True, env=env, creationflags=0x08000000 if os.name == "nt" else 0)
