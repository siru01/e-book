# Library Project Documentation

A comprehensive guide to the Library application architecture, features, and implementation details.

---

## 1. Project Overview
The Library application is a high-performance, multi-source book discovery and reading platform. It aggregates full-text books from various external APIs (Gutenberg, Open Library, Google Books, and Internet Archive) and provides a premium, interactive reading experience with integrated user analytics, reading streaks, and a GitHub-style activity heatmap.

---

## 2. Technology Stack

### Backend (Django)
- **Framework**: Django 6.0.2 with Django REST Framework (DRF).
- **Authentication**: JWT (JSON Web Token) via `rest_framework_simplejwt`.
- **Database**: PostgreSQL (Neon.tech) with a local SQLite fallback for development.
- **Caching**: Redis Cache (Upstash) with a fallback to Django `LocMemCache`. Used for search results, trending lists, and book details.
- **Email Service**: Gmail SMTP for sending OTP (One-Time Password) verification codes.
- **Filtering**: `django-filters` for advanced querying.

### Frontend (React)
- **Framework**: Vite + React 19.
- **Styling**: TailwindCSS v4 with custom CSS for high-fidelity animations and glassmorphism.
- **Routing**: React Router v7 with protected routes based on user roles and authentication status.
- **Data Fetching**: TanStack React Query v5 for efficient caching, background refetching, and state management.
- **Icons/Assets**: Lucide-React (inferred from components) and custom SVGs.

---

## 3. Core Features & Functional Details

### A. Authentication & User Management
- **User Roles**: Supports `STUDENT`, `LIBRARIAN`, and `ADMIN`.
- **JWT Flow**: Modern login system issuing access and refresh tokens. Access tokens have a 1-day lifetime; refresh tokens last 7 days.
- **OTP Verification**: Multi-step registration/login protection using 6-digit OTPs sent via email.
- **Custom User Model**: Extended Django user with `full_name`, `phone`, and `role` fields.

### B. Book Discovery Engine (BFF Pattern)
The backend acts as a **Backend For Frontend (BFF)**, aggregating and normalizing data from:
1.  **Project Gutenberg**: Primary source for full-text public domain books.
2.  **Open Library**: Used for metadata and covers.
3.  **Google Books**: Secondary metadata and volume info.
4.  **Internet Archive**: Fallback source for specific titles.

**Key Features**:
- **Gutenberg Indexing**: A local `GutenbergIndex` model stores metadata for thousands of books to provide instant search results without external API latency.
- **Smart Search**: Parallel fetching and caching of search results with a 12-hour TTL.
- **Rate-Limit Handling**: Frontend includes a 2-second retry mechanism for `429 Too Many Requests` responses from the aggregator.

### C. The Reader Experience
- **Full-Text Viewer**: Optimized for long-form reading with custom typography and CSS.
- **Text Streaming**: Content is fetched dynamically via proxy to avoid CORS issues and cached for 24 hours.
- **UI Customization**: Dark/Light mode support with premium glassmorphic overlays.
- **Progress Tracking**: Real-time progress percentage calculation saved as the user reads.

### D. Analytics & Dashboard
- **Reading Streaks**: Backend calculates daily reading streaks based on `ReadingSession` history.
- **GitHub-style Heatmap**: A visual calendar representation of reading activity (minutes per day).
- **Recent Activity**: A dedicated panel showing the last 3 active books with progress bars.
- **History Log**: Comprehensive log of finished and in-progress books with relative completion timestamps (e.g., "3 hours ago").
- **Bookmarks**: Quick-save functionality with cached metadata for instant loading.

---

## 4. Backend Architecture: Database Models

| Model | Purpose | Key Fields |
| :--- | :--- | :--- |
| **User** | Custom authentication model. | `email`, `role`, `is_verified` |
| **GutenbergIndex** | Fast local search for classics. | `gut_id`, `download_count`, `authors` (JSON) |
| **ReadingActivity** | Tracks progress & state. | `book_id`, `progress_percent`, `is_finished` |
| **ReadingSession** | Daily activity stats for heatmaps. | `date`, `minutes_read` |
| **Bookmarks** | User's saved books shelf. | `book_id`, `source`, `book_title` |
| **OTPVerification** | Register/Security flow. | `otp`, `blocked_until`, `attempts` |

---

## 5. Implementation Details (Minute Features)

### Heartbeat Mechanism
To ensure accurate analytics, the Reader page implements a **1-minute heartbeat**. 
- Every 60 seconds of active reading, the frontend makes a POST request to `/api/my-sessions/`.
- The backend increments the `minutes_read` for the current user and date in the `ReadingSession` model.

### Caching Strategy
The system uses a tiered caching strategy defined in `settings.py`:
- **Trending/Category/Search**: 12 hours.
- **Book Details**: 24 hours.
- **New Arrivals**: 12 hours.

### Gutenberg Seed Service
The `seed_gutenberg.py` script allows admins to pre-populate the database with the top 1000+ most downloaded books from Project Gutenberg, ensuring the "Discover" page is never empty.

### UI/UX: Aesthetics
- **CSS Variables**: Extensive use of HSL colors for a unified, modern palette.
- **Animations**: Subtle hover transitions on book cards and slide-in effects for dashboard panels.
- **Glassmorphism**: Backdrop filters (`blur`) used on navigation bars and modal overlays to create a "premium" depth.

---

## 6. API Reference (Core Endpoints)

### Books & Discovery
- `GET /api/books/search/?q=...`: Aggregated multi-source search.
- `GET /api/books/trending/`: Cached list of popular Gutenberg titles.
- `GET /api/books/read/?book_id=...`: Fetches full book metadata and reading URL.

### User Statistics
- `GET /api/my-activity-summary/`: Returns streak data, total books read, and current stats.
- `GET /api/my-sessions/`: Returns data formatted for the activity heatmap.
- `POST /api/my-activity/`: Updates book progress or marks as finished.

---

## 7. Developer Notes
- **Local Dev**: Use `.env` to toggle between SQLite and Neon.
- **Admin Panel**: Accessible at `/admin/` for Librarians/Admins to manage the local `Book` catalog and users.
- **Environment Variables**:
  - `DATABASE_URL`: Backend DB connection string.
  - `REDIS_URL`: Redis cache connection.
  - `GOOGLE_BOOKS_API_KEY`: For extended metadata.
  - `EMAIL_HOST_USER/PASSWORD`: For OTP delivery.
