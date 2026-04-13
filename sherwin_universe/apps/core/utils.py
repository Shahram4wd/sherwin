from io import BytesIO

from PIL import Image


def strip_exif(image_file):
    """Strip EXIF/GPS data from an uploaded image for privacy."""
    img = Image.open(image_file)
    data = list(img.getdata())
    clean = Image.new(img.mode, img.size)
    clean.putdata(data)
    buffer = BytesIO()
    fmt = "PNG" if img.format == "PNG" else "JPEG"
    clean.save(buffer, format=fmt, quality=90)
    buffer.seek(0)
    return buffer
