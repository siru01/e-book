from django.db import migrations, models
import django.db.models.deletion
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
    ('books', '0004_alter_book_added_by'),
]

    operations = [
        # Add missing columns to readinghistory
        migrations.AddField(
            model_name='readinghistory',
            name='source',
            field=models.CharField(
                max_length=50,
                default='gutenberg',
                choices=[
                    ('gutenberg', 'Gutenberg'),
                    ('openlibrary', 'Open Library'),
                    ('google', 'Google Books'),
                    ('archive', 'Internet Archive'),
                ],
            ),
        ),
        migrations.AddField(
            model_name='readinghistory',
            name='finished_at',
            field=models.DateTimeField(default=django.utils.timezone.now),
        ),

        # Remove old columns from readinghistory
        migrations.RemoveField(
            model_name='readinghistory',
            name='completed_date',
        ),
        migrations.RemoveField(
            model_name='readinghistory',
            name='rating',
        ),

        # Fix unique_together
        migrations.AlterUniqueTogether(
            name='readinghistory',
            unique_together={('user', 'book_id')},
        ),

        # Create Bookmarks table
        migrations.CreateModel(
            name='Bookmarks',
            fields=[
                ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('book_id', models.CharField(max_length=255, default='gutenberg:0')),
                ('source', models.CharField(
                    max_length=50,
                    default='gutenberg',
                    choices=[
                        ('gutenberg', 'Gutenberg'),
                        ('openlibrary', 'Open Library'),
                        ('google', 'Google Books'),
                        ('archive', 'Internet Archive'),
                    ],
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('user', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    to='users.user',
                )),
            ],
            options={
                'unique_together': {('user', 'book_id')},
            },
        ),
    ]