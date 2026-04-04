from django.core.management.base import BaseCommand
from books.models import GutenbergIndex

class Command(BaseCommand):
    help = 'Manually empty the local Gutenberg search index cache'

    def handle(self, *args, **options):
        count = GutenbergIndex.objects.all().count()
        GutenbergIndex.objects.all().delete()
        self.stdout.write(self.style.SUCCESS(f'Successfully purged {count} records from the local search index.'))
