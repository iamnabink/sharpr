import secrets
import time


def new_id() -> str:
    """12-char URL-safe id (same shape as the web client's nanoid)."""
    return secrets.token_urlsafe(9)


def now_ms() -> int:
    return int(time.time() * 1000)
