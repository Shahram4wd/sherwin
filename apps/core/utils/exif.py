"""EXIF stripping utility for uploaded images."""

import io

from PIL import Image


def strip_exif(image_file):
    """Remove EXIF metadata from an uploaded image file for privacy.

    Returns a new BytesIO with the cleaned image.
    """
    img = Image.open(image_file)
    # Preserve format and mode
    fmt = img.format or "JPEG"
    if fmt.upper() not in ("JPEG", "PNG", "WEBP", "GIF"):
        fmt = "JPEG"

    # Create clean copy without EXIF
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)

    buf = io.BytesIO()
    save_kwargs = {"format": fmt}
    if fmt.upper() == "JPEG":
        save_kwargs["quality"] = 90
    clean.save(buf, **save_kwargs)
    buf.seek(0)
    return buf, fmt.lower()
