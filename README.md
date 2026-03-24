SHELF | Your Personal Digital Library

Shelf is a sophisticated, minimalist web application designed for the modern reader. It transforms the way you interact with your book collection by providing a seamless interface to explore new titles, manage your reading progress, and maintain a virtual "rack" of every book you've ever touched.

Whether you are a casual reader or a dedicated bibliophile, Shelf acts as your digital sanctuary—allowing you to catalog your library, track transactions, and discover your next great adventure through a beautiful, responsive interface.

🛠️ Quick Start Guide
To get the entire ecosystem up and running, follow these two simple blocks of commands. Ensure you have Python and Node.js installed on your system.

🔹 Step 1: Fire up the Backend (Django)
The "brain" of the app handles your database, user authentication (JWT), and book metadata.

Bash
# 1. Enter the backend folder
cd library_backend

# 2. Install the necessary Python tools
pip install -r requirements.txt

# 3. Prepare the database & start the server
python manage.py migrate
python manage.py runserver
Your API is now live at: http://127.0.0.1:8000/

🔸 Step 2: Launch the Frontend (React + Vite)
The "face" of the app provides the high-performance, interactive user experience.

Bash
# 1. Enter the frontend folder
cd library_frontend

# 2. Install the modern web dependencies
npm install

# 3. Start the interactive development environment
npm run dev
Access your library at: http://localhost:5173/

📖 What’s Inside?
Smart Discovery: A dedicated "Discover" zone to browse through available titles in the library.

Personal Rack: A "My Library" section where you can keep track of books you are currently reading or have finished.

Secure Access: A premium login experience that keeps your reading data private and synced across sessions.

Dynamic Theme: Toggle between a clean "Light Mode" and a focused "Dark Mode" for late-night reading sessions.

Admin Power: Built-in capabilities for librarians to import book data directly from global sources like OpenLibrary.

Would you like me to help you generate a custom seed_sample_data.py script so your "Rack" isn't empty when you first log in?


