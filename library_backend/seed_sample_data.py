# Run with: python manage.py shell -c "exec(open('seed_sample_data.py').read())"
from books.models import Book
from users.models import User
from transactions.models import Transaction

# create sample books
sample = [
    {"title": "Sample Book A", "author": "Author A", "isbn": "1111111111", "total_copies": 3},
    {"title": "Sample Book B", "author": "Author B", "isbn": "2222222222", "total_copies": 2},
    {"title": "Sample Book C", "author": "Author C", "isbn": "3333333333", "total_copies": 1},
]
for s in sample:
    # use admin user as added_by when available
    admin = None
    try:
        admin = User.objects.filter(is_superuser=True).first() or User.objects.filter(is_staff=True).first()
    except Exception:
        admin = None
    defaults = {
        'title': s['title'],
        'author': s['author'],
        'total_copies': s['total_copies'],
        'available_copies': s['total_copies'],
    }
    if admin:
        defaults['added_by'] = admin
    Book.objects.update_or_create(isbn=s['isbn'], defaults=defaults)

# create a sample student user if none
u, created = User.objects.get_or_create(email='student@example.com', defaults={'full_name':'Student','phone':'000','role':'STUDENT'})
# create a borrowed transaction for the student
b = Book.objects.filter(isbn='1111111111').first()
if b:
    try:
        Transaction.objects.update_or_create(book=b, user=u, defaults={'status':'BORROWED'})
    except Exception:
        pass

print('Seeded sample books and transaction')
