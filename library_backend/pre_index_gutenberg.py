import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from books.services import gutendex

print("Pre-indexing popular Gutenberg books...")
try:
    # Trending will now auto-index
    books = gutendex.trending()
    print(f"Successfully indexed {len(books)} popular books.")
    
    # Common genres
    for genre in ["fiction", "mystery", "history", "science fiction", "philosophy"]:
        print(f"Indexing genre: {genre}...")
        gutendex.by_category(genre)
        
    print("Done pre-indexing!")
except Exception as e:
    print(f"Pre-indexing failed: {e}")
