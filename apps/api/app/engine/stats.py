"""Progress statistics. Pure functions over attempt rows so they are easy to test."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from app.models.practice import Attempt, Goal

DAY_MS = 86_400_000


def _local(ts_ms: int, tz_offset_min: int) -> datetime:
    """UTC instant shifted into the client's local wall-clock time (offset as JS getTimezoneOffset)."""
    return datetime.fromtimestamp(ts_ms / 1000, tz=UTC) - timedelta(minutes=tz_offset_min)


def day_key(ts_ms: int, tz_offset_min: int) -> str:
    return _local(ts_ms, tz_offset_min).strftime("%Y-%m-%d")


def start_of_day_ms(now_ms: int, tz_offset_min: int) -> int:
    start_local = _local(now_ms, tz_offset_min).replace(hour=0, minute=0, second=0, microsecond=0)
    return int((start_local + timedelta(minutes=tz_offset_min)).timestamp() * 1000)


def start_of_week_ms(now_ms: int, tz_offset_min: int) -> int:
    sod = start_of_day_ms(now_ms, tz_offset_min)
    return sod - _local(sod, tz_offset_min).weekday() * DAY_MS


def compute_stats(attempts: list[Attempt], retried_ids: set[str], now_ms: int, tz_offset_min: int) -> dict:
    days: set[str] = set()
    by_cat: dict[str, dict] = {}
    by_type: dict[str, int] = {}
    topics: set[str] = set()
    total_seconds = 0
    recordings = 0
    ratings: list[float] = []
    t0 = start_of_day_ms(now_ms, tz_offset_min)
    w0 = start_of_week_ms(now_ms, tz_offset_min)
    today_seconds = 0
    week_seconds = 0

    for a in attempts:
        days.add(day_key(a.completed_at, tz_offset_min))
        total_seconds += a.duration_seconds
        if a.content_id:
            topics.add(a.content_id)
        by_type[a.content_type] = by_type.get(a.content_type, 0) + 1
        if a.recording_id:
            recordings += 1
        if a.completed_at >= t0:
            today_seconds += a.duration_seconds
        if a.completed_at >= w0:
            week_seconds += a.duration_seconds
        cat = by_cat.setdefault(a.category, {"attempts": 0, "seconds": 0, "ratings": []})
        cat["attempts"] += 1
        cat["seconds"] += a.duration_seconds
        overall = (a.review or {}).get("overall")
        if overall is not None:
            cat["ratings"].append(float(overall))
            ratings.append(float(overall))

    by_category = [
        {
            "category": k,
            "attempts": v["attempts"],
            "seconds": v["seconds"],
            "avgRating": (sum(v["ratings"]) / len(v["ratings"])) if v["ratings"] else None,
        }
        for k, v in by_cat.items()
    ]
    rated = [c for c in by_category if c["avgRating"] is not None and c["attempts"] >= 2]
    strongest = sorted(rated, key=lambda c: -c["avgRating"])[:3]
    weakest = sorted(rated, key=lambda c: c["avgRating"])[:3]
    most_practiced = sorted(by_category, key=lambda c: -c["attempts"])[:5]

    sorted_days = sorted(days)
    longest = run = 0
    prev = None
    for k in sorted_days:
        t = datetime.strptime(k, "%Y-%m-%d").replace(tzinfo=UTC)
        run = run + 1 if prev is not None and (t - prev).days == 1 else 1
        longest = max(longest, run)
        prev = t
    current = 0
    today = day_key(now_ms, tz_offset_min)
    yesterday = day_key(now_ms - DAY_MS, tz_offset_min)
    if today in days or yesterday in days:
        cursor = now_ms if today in days else now_ms - DAY_MS
        while day_key(cursor, tz_offset_min) in days:
            current += 1
            cursor -= DAY_MS

    daily = []
    for i in range(13, -1, -1):
        ts = t0 - i * DAY_MS
        key = day_key(ts, tz_offset_min)
        day_attempts = [a for a in attempts if day_key(a.completed_at, tz_offset_min) == key]
        daily.append({"key": key, "seconds": sum(a.duration_seconds for a in day_attempts), "attempts": len(day_attempts)})

    trend = [
        {"at": a.completed_at, "overall": float(a.review["overall"])}
        for a in sorted(attempts, key=lambda a: a.completed_at)
        if a.review and a.review.get("overall") is not None
    ][-30:]

    return {
        "totalAttempts": len(attempts),
        "totalSeconds": total_seconds,
        "practiceDays": len(days),
        "currentStreak": current,
        "longestStreak": longest,
        "topicsCompleted": len(topics),
        "topicsRetried": len([t for t in topics if t in retried_ids]),
        "avgRating": (sum(ratings) / len(ratings)) if ratings else None,
        "recordingsCreated": recordings,
        "byCategory": sorted(by_category, key=lambda c: -c["attempts"]),
        "strongest": strongest,
        "weakest": weakest,
        "mostPracticed": most_practiced,
        "byType": by_type,
        "daily": daily,
        "ratingTrend": trend,
        "todaySeconds": today_seconds,
        "weekSeconds": week_seconds,
    }


def goal_progress(goal: Goal, attempts: list[Attempt], pages_read: int, now_ms: int, tz_offset_min: int) -> dict:
    start = start_of_day_ms(now_ms, tz_offset_min) if goal.period == "day" else start_of_week_ms(now_ms, tz_offset_min)
    in_period = [a for a in attempts if a.completed_at >= start]
    m = goal.metric
    if m == "speaking_minutes":
        value = sum(a.duration_seconds for a in in_period) / 60
    elif m == "attempts":
        value = len(in_period)
    elif m == "interview_questions":
        value = len([a for a in in_period if a.content_type == "interview_question"])
    elif m == "stories":
        value = len([a for a in in_period if a.content_type == "storytelling_prompt"])
    elif m == "concepts_learned":
        value = len({a.content_id for a in in_period if a.content_type in ("technical_topic", "knowledge_topic")})
    elif m == "podcasts":
        value = len([a for a in in_period if a.content_type == "podcast_topic"])
    elif m == "practice_days":
        value = len({day_key(a.completed_at, tz_offset_min) for a in in_period})
    elif m == "pages_read":
        value = pages_read
    else:
        value = 0
    value = round(value * 10) / 10
    pct = min(100, round(value / goal.target * 100)) if goal.target else 0
    return {"goalId": goal.id, "value": value, "target": goal.target, "pct": pct}
