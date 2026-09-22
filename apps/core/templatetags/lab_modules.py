"""Cache-safe URLs for the Lab's ES modules.

Browsers cache module scripts, and a relative import inside a module
(``import './engine.js'``) cannot carry a version query. Import maps can remap
resolved URLs, so the Lab page emits one entry per module that points its plain
URL at a content-versioned one. In production the manifest storage already
hashes file names; in development we append a hash of the file contents, so an
edit to any sim file is picked up on the next normal page load.
"""

from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
from urllib.parse import urljoin

from django import template
from django.conf import settings
from django.contrib.staticfiles import finders
from django.contrib.staticfiles.storage import staticfiles_storage
from django.utils.safestring import mark_safe

register = template.Library()

LAB_PREFIX = "js/lab"

# path -> (mtime_ns, digest). Re-hashes a file only when it changes on disk.
_hash_cache: dict[str, tuple[int, str]] = {}


def _lab_dirs() -> list[Path]:
    found = finders.find(LAB_PREFIX, all=True) or []
    dirs = [Path(p) for p in found if p and os.path.isdir(p)]
    if not dirs and settings.STATIC_ROOT:
        collected = Path(settings.STATIC_ROOT) / LAB_PREFIX
        if collected.is_dir():
            dirs = [collected]
    return dirs


def _module_files() -> dict[str, Path]:
    """Map each module's static-relative path to its file on disk."""
    files: dict[str, Path] = {}
    for base in _lab_dirs():
        for path in sorted(base.rglob("*.js")):
            rel = f"{LAB_PREFIX}/{path.relative_to(base).as_posix()}"
            files.setdefault(rel, path)
    return files


def _content_hash(path: Path) -> str:
    stat = path.stat()
    cached = _hash_cache.get(str(path))
    if cached and cached[0] == stat.st_mtime_ns:
        return cached[1]
    digest = hashlib.md5(path.read_bytes(), usedforsecurity=False).hexdigest()[:10]
    _hash_cache[str(path)] = (stat.st_mtime_ns, digest)
    return digest


def _versioned(rel: str, path: Path | None) -> tuple[str, str]:
    """Return (plain URL, versioned URL) for one static-relative path."""
    plain = urljoin(staticfiles_storage.base_url, rel)
    try:
        url = staticfiles_storage.url(rel)
    except Exception:  # manifest storage raises when a file is missing from the manifest
        url = plain
    if url == plain and path is not None:
        url = f"{plain}?v={_content_hash(path)}"
    return plain, url


@register.simple_tag
def lab_static(rel: str) -> str:
    """Versioned URL for one Lab module: {% lab_static 'js/lab/core/index.js' %}."""
    return _versioned(rel, _module_files().get(rel))[1]


@register.simple_tag
def lab_module_imports() -> str:
    """Import-map entries (no surrounding braces) for every Lab module.

    Each key is the URL a relative import resolves to; each value is the
    versioned URL the browser should actually fetch.
    """
    entries = dict(_versioned(rel, path) for rel, path in _module_files().items())
    body = json.dumps(entries, indent=8)
    inner = body[1:-1].strip().rstrip(",")
    return mark_safe(inner)
