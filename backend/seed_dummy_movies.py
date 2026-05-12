"""Insert sample movies, theaters, screens, shows and seats into MongoDB.

Run from the backend folder with the venv active:

    python seed_dummy_movies.py

Requires MONGODB_URI in the environment (same as Uvicorn), e.g. from repo-root .env.
"""

from datetime import UTC, datetime, timedelta
from pathlib import Path

from dotenv import load_dotenv

from app.database import get_database


load_dotenv(Path(__file__).resolve().parents[1] / ".env")

DUMMY_MOVIES = [
    {
        "title": "Neo Tokyo Drift",
        "description": "A courier discovers a glitch in the city grid and races ghosts through midnight tunnels.",
        "genre": ["Sci-Fi", "Action"],
        "duration_minutes": 118,
        "release_date": datetime(2025, 11, 7),
        "rating": 8.2,
        "poster_url": "https://placehold.co/400x600/1a1a2e/eee?text=Neo+Tokyo",
        "trailer_youtube_id": "dQw4w9WgXcQ",
        "language": "Japanese",
        "director": "Yuki Nakamura",
        "cast": ["Hiro Sato", "Mina Abe", "Leo Zhang"],
    },
    {
        "title": "The Lighthouse Keeper",
        "description": "On a fogbound coast, siblings inherit a lighthouse and the secrets carved into its stairs.",
        "genre": ["Drama", "Mystery"],
        "duration_minutes": 104,
        "release_date": datetime(2025, 9, 19),
        "rating": 7.6,
        "poster_url": "https://placehold.co/400x600/16213e/eee?text=Lighthouse",
        "language": "English",
        "director": "Clara Whitmore",
        "cast": ["Sam Ellis", "Jules Hart", "Omar Reyes"],
    },
    {
        "title": "Byte Size",
        "description": "A junior dev accidentally backs up consciousness to a floppy disk—with hilarious consequences.",
        "genre": ["Comedy"],
        "duration_minutes": 96,
        "release_date": datetime(2026, 3, 14),
        "rating": 7.1,
        "poster_url": "https://placehold.co/400x600/0f3460/eee?text=Byte+Size",
        "trailer_youtube_id": "LXb3EKWsInQ",
        "language": "English",
        "director": "Priya Kapoor",
        "cast": ["Noah Brooks", "Elena Park", "Dev Singh"],
    },
    {
        "title": "Midnight in Marrakech",
        "description": "Two strangers trade stories in a tiled courtyard until dawn reveals who they really are.",
        "genre": ["Romance", "Drama"],
        "duration_minutes": 112,
        "release_date": datetime(2026, 1, 23),
        "rating": 7.9,
        "poster_url": "https://placehold.co/400x600/533483/eee?text=Marrakech",
        "language": "Arabic",
        "director": "Amel Benali",
        "cast": ["Youssef Alaoui", "Sara Mekki", "Lina Vogel"],
    },
    {
        "title": "Deep Field",
        "description": "A repair bot on Europa finds a pulse coming from beneath the ice.",
        "genre": ["Sci-Fi", "Thriller"],
        "duration_minutes": 128,
        "release_date": datetime(2026, 7, 4),
        "rating": 8.0,
        "poster_url": "https://placehold.co/400x600/e94560/eee?text=Deep+Field",
        "language": "English",
        "director": "Jordan Hale",
        "cast": ["Ava Chen", "Marcus Holt", "Iris Okonkwo"],
    },
]

DUMMY_THEATERS = [
    {
        "name": "CineMax Downtown",
        "location": "Downtown",
        "city": "New York",
        "address": "123 Main St, New York, NY 10001",
    },
    {
        "name": "Galaxy Cinemas",
        "location": "Westside",
        "city": "Los Angeles",
        "address": "456 Sunset Blvd, Los Angeles, CA 90028",
    },
]

# Show time slots relative to "today" (seeding date)
SHOW_OFFSETS_HOURS = [10, 14, 18, 21]  # 10am, 2pm, 6pm, 9pm
TICKET_PRICES = [12.50, 14.00]


def main() -> None:
    db = get_database()
    now = datetime.now(UTC)

    # ── Movies ────────────────────────────────────────────────────────────────
    movie_added = movie_skipped = 0
    for doc in DUMMY_MOVIES:
        if db.movies.find_one({"title": doc["title"]}) is not None:
            movie_skipped += 1
            continue
        db.movies.insert_one({**doc, "created_at": now, "is_active": True})
        movie_added += 1
    print(f"Movies  → inserted {movie_added}, skipped {movie_skipped} (already existed).")

    # ── Theaters & Screens ────────────────────────────────────────────────────
    theater_ids = []
    screen_ids = []
    screen_layouts = []

    for t in DUMMY_THEATERS:
        existing = db.theaters.find_one({"name": t["name"]})
        if existing:
            theater_id = str(existing["_id"])
        else:
            result = db.theaters.insert_one({**t, "created_at": now})
            theater_id = str(result.inserted_id)
        theater_ids.append(theater_id)

        # One screen per theater
        existing_screen = db.screens.find_one({"theater_id": theater_id})
        rows, cols = 8, 12
        layout = {"rows": rows, "columns": cols, "aisles": []}
        total = rows * cols
        if existing_screen:
            screen_id = str(existing_screen["_id"])
            layout = existing_screen.get("seat_layout", layout)
        else:
            result = db.screens.insert_one({
                "theater_id": theater_id,
                "name": "Screen 1",
                "total_seats": total,
                "seat_layout": layout,
                "created_at": now,
            })
            screen_id = str(result.inserted_id)

        screen_ids.append(screen_id)
        screen_layouts.append(layout)

    print(f"Theaters → {len(theater_ids)} ready.  Screens → {len(screen_ids)} ready.")

    # ── Shows ─────────────────────────────────────────────────────────────────
    movies = list(db.movies.find({}))
    base_date = now.replace(hour=0, minute=0, second=0, microsecond=0)

    # Build the full set of shows we want
    desired_shows = []
    for i, movie in enumerate(movies):
        movie_id = str(movie["_id"])
        duration = movie.get("duration_minutes", 120)
        for day_offset in range(7):
            for slot_hour in SHOW_OFFSETS_HOURS:
                t_idx = (i + day_offset) % len(theater_ids)
                start_time = base_date + timedelta(days=day_offset, hours=slot_hour)
                desired_shows.append({
                    "movie_id": movie_id,
                    "duration": duration,
                    "start_time": start_time,
                    "t_idx": t_idx,
                })

    # Fetch existing (movie_id, screen_id, start_time) combos in one query
    existing_shows = db.shows.find(
        {},
        {"movie_id": 1, "screen_id": 1, "start_time": 1}
    )
    existing_keys = {
        (s["movie_id"], s["screen_id"], s["start_time"])
        for s in existing_shows
    }

    shows_to_insert = []
    for s in desired_shows:
        t_idx = s["t_idx"]
        screen_id = screen_ids[t_idx]
        key = (s["movie_id"], screen_id, s["start_time"])
        if key in existing_keys:
            continue
        shows_to_insert.append({
            "movie_id": s["movie_id"],
            "screen_id": screen_id,
            "theater_id": theater_ids[t_idx],
            "start_time": s["start_time"],
            "end_time": s["start_time"] + timedelta(minutes=s["duration"]),
            "price": TICKET_PRICES[t_idx % len(TICKET_PRICES)],
            "created_at": now,
        })

    if shows_to_insert:
        result = db.shows.insert_many(shows_to_insert)
        inserted_show_ids = [str(oid) for oid in result.inserted_ids]
    else:
        inserted_show_ids = []

    print(f"Shows   → inserted {len(shows_to_insert)}, skipped {len(desired_shows) - len(shows_to_insert)} (already existed).")

    # ── Seats ─────────────────────────────────────────────────────────────────
    # Find which of the newly inserted shows already have seats (safety check)
    existing_seat_show_ids = set(
        s["show_id"] for s in db.seats.find(
            {"show_id": {"$in": inserted_show_ids}},
            {"show_id": 1}
        )
    )

    all_seats = []
    for show_doc, show_id in zip(shows_to_insert, inserted_show_ids):
        if show_id in existing_seat_show_ids:
            continue
        t_idx = theater_ids.index(show_doc["theater_id"])
        layout = screen_layouts[t_idx]
        rows = layout.get("rows", 8)
        cols = layout.get("columns", 12)
        for row_num in range(rows):
            row_letter = chr(65 + row_num)
            for col_num in range(1, cols + 1):
                all_seats.append({
                    "show_id": show_id,
                    "row": row_letter,
                    "number": col_num,
                    "status": "available",
                })

    if all_seats:
        db.seats.insert_many(all_seats, ordered=False)

    print(f"Seats   → inserted {len(all_seats)} total.")


if __name__ == "__main__":
    main()

