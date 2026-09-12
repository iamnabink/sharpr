from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.admin import mount_admin
from app.core.config import get_settings
from app.routers import (
    attempts,
    auth,
    books,
    collections,
    content,
    engine,
    goals,
    importing,
    notes,
    resources,
    retry,
    sessions,
    settings,
    vocabulary,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


app = FastAPI(title="Sharpr API", version="0.1.0", lifespan=lifespan, docs_url="/docs", openapi_url="/openapi.json")

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_settings().cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Range", "Accept-Ranges", "Content-Length"],
)

API = "/api/v1"
for r in (auth, content, resources, collections, vocabulary, books, notes, goals, settings, attempts, retry, sessions, engine, importing):
    app.include_router(r.router, prefix=API)


@app.get("/health")
async def health():
    return {"status": "ok"}


mount_admin(app)
