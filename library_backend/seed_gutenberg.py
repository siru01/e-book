import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from books.models import GutenbergIndex

top_books = [
    {
        "gut_id": 1342,
        "title": "Pride and Prejudice",
        "authors": ["Austen, Jane"],
        "cover_url": "https://www.gutenberg.org/cache/epub/1342/pg1342.cover.medium.jpg",
        "read_url": "https://www.gutenberg.org/files/1342/1342-0.txt",
        "download_count": 50000
    },
    {
        "gut_id": 11,
        "title": "Alice's Adventures in Wonderland",
        "authors": ["Carroll, Lewis"],
        "cover_url": "https://www.gutenberg.org/cache/epub/11/pg11.cover.medium.jpg",
        "read_url": "https://www.gutenberg.org/files/11/11-0.txt",
        "download_count": 40000
    },
    {
        "gut_id": 1661,
        "title": "The Adventures of Sherlock Holmes",
        "authors": ["Doyle, Arthur Conan"],
        "cover_url": "https://www.gutenberg.org/cache/epub/1661/pg1661.cover.medium.jpg",
        "read_url": "https://www.gutenberg.org/files/1661/1661-0.txt",
        "download_count": 35000
    },
    {
        "gut_id": 2701,
        "title": "Moby Dick; Or, The Whale",
        "authors": ["Melville, Herman"],
        "cover_url": "https://www.gutenberg.org/cache/epub/2701/pg2701.cover.medium.jpg",
        "read_url": "https://www.gutenberg.org/files/2701/2701-0.txt",
        "download_count": 30000
    },
    {
        "gut_id": 84,
        "title": "Frankenstein; Or, The Modern Prometheus",
        "authors": ["Shelley, Mary Wollstonecraft"],
        "cover_url": "https://www.gutenberg.org/cache/epub/84/pg84.cover.medium.jpg",
        "read_url": "https://www.gutenberg.org/files/84/84-0.txt",
        "download_count": 28000
    }
]

for b in top_books:
    GutenbergIndex.objects.get_or_create(
        gut_id=b["gut_id"],
        defaults=b
    )

print(f"Successfully pre-indexed {len(top_books)} classic books!")
