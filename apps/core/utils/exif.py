"""EXIF stripping utility for uploaded images."""

import io

from PIL import Image, ImageOps

# Maximum dimension (width or height) for any uploaded image.
MAX_DIMENSION = 1920


def strip_exif(image_file):
    """Remove EXIF metadata, auto-rotate, resize, and optimise an uploaded image.

    - Resizes so the longest edge is at most MAX_DIMENSION px (preserves aspect ratio).
    - Applies EXIF orientation before stripping so the image is correctly rotated.
    - Returns (BytesIO, fmt_lowercase).
    """
    img = Image.open(image_file)

    # Apply EXIF orientation tag (e.g. photos taken in portrait mode on phones).
    img = ImageOps.exif_transpose(img)

    # Preserve format and mode
    fmt = img.format or "JPEG"
    if fmt.upper() not in ("JPEG", "PNG", "WEBP", "GIF"):
        fmt = "JPEG"

    # Downscale if either dimension exceeds MAX_DIMENSION.
    if max(img.width, img.height) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    # Convert palette/transparency modes that can't be saved as JPEG.
    if fmt.upper() == "JPEG" and img.mode not in ("RGB", "L"):
        img = img.convert("RGB")

    buf = io.BytesIO()
    save_kwargs = {"format": fmt}
    if fmt.upper() == "JPEG":
        save_kwargs["quality"] = 85
        save_kwargs["optimize"] = True
    elif fmt.upper() == "PNG":
        save_kwargs["optimize"] = True
    elif fmt.upper() == "WEBP":
        save_kwargs["quality"] = 85
        save_kwargs["method"] = 6  # slower encode, smaller file

    img.save(buf, **save_kwargs)
    buf.seek(0)
    return buf, fmt.lower()
