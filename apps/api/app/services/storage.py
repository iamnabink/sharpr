"""Recording storage. `local` writes to a volume; `s3` works with MinIO, R2 or AWS S3."""

from __future__ import annotations

import contextlib
import os
from collections.abc import AsyncIterator, Iterator
from functools import lru_cache
from pathlib import Path
from typing import Protocol

from app.core.config import get_settings


class Storage(Protocol):
    def save(self, key: str, chunks: Iterator[bytes]) -> int: ...
    def size(self, key: str) -> int: ...
    def stream(self, key: str, start: int, end: int) -> Iterator[bytes]: ...
    def delete(self, key: str) -> None: ...
    def exists(self, key: str) -> bool: ...


class LocalStorage:
    def __init__(self, root: str):
        self.root = Path(root)
        self.root.mkdir(parents=True, exist_ok=True)

    def _path(self, key: str) -> Path:
        p = (self.root / key).resolve()
        if self.root.resolve() not in p.parents:
            raise ValueError("invalid key")
        return p

    def save(self, key: str, chunks: Iterator[bytes]) -> int:
        p = self._path(key)
        p.parent.mkdir(parents=True, exist_ok=True)
        size = 0
        with open(p, "wb") as f:
            for c in chunks:
                f.write(c)
                size += len(c)
        return size

    def size(self, key: str) -> int:
        return self._path(key).stat().st_size

    def stream(self, key: str, start: int, end: int) -> Iterator[bytes]:
        with open(self._path(key), "rb") as f:
            f.seek(start)
            remaining = end - start + 1
            while remaining > 0:
                chunk = f.read(min(1024 * 256, remaining))
                if not chunk:
                    break
                remaining -= len(chunk)
                yield chunk

    def delete(self, key: str) -> None:
        with contextlib.suppress(FileNotFoundError):
            self._path(key).unlink()

    def exists(self, key: str) -> bool:
        return self._path(key).exists()


class S3Storage:
    def __init__(self):
        import boto3
        from botocore.exceptions import ClientError

        self._client_error = ClientError

        s = get_settings()
        self.bucket = s.s3_bucket
        self.client = boto3.client(
            "s3",
            endpoint_url=s.s3_endpoint_url or None,
            aws_access_key_id=s.s3_access_key,
            aws_secret_access_key=s.s3_secret_key,
            region_name=s.s3_region,
        )
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except ClientError:
            self.client.create_bucket(Bucket=self.bucket)

    def save(self, key: str, chunks: Iterator[bytes]) -> int:
        import io

        buf = io.BytesIO()
        for c in chunks:
            buf.write(c)
        size = buf.tell()
        buf.seek(0)
        self.client.upload_fileobj(buf, self.bucket, key)
        return size

    def size(self, key: str) -> int:
        return int(self.client.head_object(Bucket=self.bucket, Key=key)["ContentLength"])

    def stream(self, key: str, start: int, end: int) -> Iterator[bytes]:
        obj = self.client.get_object(Bucket=self.bucket, Key=key, Range=f"bytes={start}-{end}")
        yield from obj["Body"].iter_chunks(1024 * 256)

    def delete(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def exists(self, key: str) -> bool:
        try:
            self.client.head_object(Bucket=self.bucket, Key=key)
            return True
        except self._client_error:
            return False


@lru_cache
def get_storage() -> Storage:
    s = get_settings()
    if s.storage_backend == "s3":
        return S3Storage()
    return LocalStorage(s.storage_local_path)


async def aiter_upload(file, chunk_size: int = 1024 * 1024) -> AsyncIterator[bytes]:
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        yield chunk


def extension_for(mime: str) -> str:
    if "mp4" in mime:
        return "mp4"
    if "ogg" in mime:
        return "ogg"
    if "wav" in mime:
        return "wav"
    return "webm"


def storage_key(user_id: str, recording_id: str, mime: str) -> str:
    return os.path.join(user_id, f"{recording_id}.{extension_for(mime)}")
