"""Insert sample movies into MongoDB.

Run from the backend folder with the venv active:

    python seed_dummy_movies.py

Requires MONGODB_URI in the environment (same as Uvicorn), e.g. from repo-root .env.
"""

from datetime import UTC, datetime
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


def main() -> None:
    db = get_database()
    now = datetime.now(UTC)
    added = 0
    skipped = 0

    for doc in DUMMY_MOVIES:
        if db.movies.find_one({"title": doc["title"]}) is not None:
            skipped += 1
            continue
        db.movies.insert_one({**doc, "created_at": now, "is_active": True})
        added += 1

    print(f"Inserted {added} movies, skipped {skipped} (titles already existed).")


if __name__ == "__main__":
    main()
