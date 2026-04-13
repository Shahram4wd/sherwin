import sentry_sdk

from .base import *  # noqa: F401, F403

DEBUG = env.bool("DEBUG", default=False)  # noqa: F405

ALLOWED_HOSTS = env("ALLOWED_HOSTS")  # noqa: F405

# Security
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_SECURE = True
SECURE_SSL_REDIRECT = env.bool("SECURE_SSL_REDIRECT", default=True)  # noqa: F405
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")

# Database
DATABASES = {
    "default": env.db("DATABASE_URL"),  # noqa: F405
}

# Cloudflare R2 storage (S3-compatible)
R2_ACCESS_KEY = env("R2_ACCESS_KEY", default="")  # noqa: F405
R2_SECRET_KEY = env("R2_SECRET_KEY", default="")  # noqa: F405
R2_BUCKET_NAME = env("R2_BUCKET_NAME", default="sherwin-universe")  # noqa: F405
R2_ENDPOINT_URL = env("R2_ENDPOINT_URL", default="")  # noqa: F405
R2_CUSTOM_DOMAIN = env("R2_CUSTOM_DOMAIN", default="")  # noqa: F405

if R2_ACCESS_KEY:
    STORAGES["default"] = {  # noqa: F405
        "BACKEND": "storages.backends.s3boto3.S3Boto3Storage",
        "OPTIONS": {
            "access_key": R2_ACCESS_KEY,
            "secret_key": R2_SECRET_KEY,
            "bucket_name": R2_BUCKET_NAME,
            "endpoint_url": R2_ENDPOINT_URL,
            "custom_domain": R2_CUSTOM_DOMAIN or None,
            "default_acl": "public-read",
            "signature_version": "s3v4",
        },
    }

# Sentry
SENTRY_DSN = env("SENTRY_DSN", default="")  # noqa: F405
if SENTRY_DSN:
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        traces_sample_rate=0.1,
        profiles_sample_rate=0.1,
        send_default_pii=False,
    )
