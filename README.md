# Library App (dev)

Run backend:

```bash
cd library_backend
python -m pip install -r requirements.txt
python manage.py migrate
python manage.py runserver 8001
```

Run frontend (Reflex):

```bash
cd library_frontend
python -m pip install -r requirements.txt
reflex run
```

Discover page: http://127.0.0.1:3000/discover

Notes:
- The import endpoint `/api/openlibrary/import/` requires an authenticated admin or librarian account.
- Create a superuser or admin and obtain a JWT token via `/api/token/` to call protected endpoints.
- Seed sample data: run `python manage.py shell -c "exec(open('seed_sample_data.py').read())"` to add sample books and transactions.
