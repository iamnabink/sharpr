RETRY_THRESHOLD = 6


def should_recommend_retry(review: dict | None) -> bool:
    if not review:
        return False
    overall = review.get("overall")
    if overall is not None and overall < RETRY_THRESHOLD:
        return True
    return len(review.get("flags") or []) >= 3
