import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  fetchAdminDashboard, fetchBooks,
  addBook, deleteBook,
} from "../api/shelf";
import "./AdminDashboardPage.css";

function StatCard({ label, value, icon, color }) {
  return (
    <div className="adm-stat-card">
      <span className="adm-stat-icon">{icon}</span>
      <span className="adm-stat-value" style={{ color }}>{value}</span>
      <span className="adm-stat-label">{label}</span>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { token, logout } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [books, setBooks] = useState([]);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Add book form
  const [form, setForm] = useState({
    title: "", author: "", isbn: "", total_copies: "1", available_copies: "1",
  });

  async function loadAll() {
    setError("");
    try {
      const [dash, booksData] = await Promise.all([
        fetchAdminDashboard(token),
        fetchBooks(token),
      ]);
      setStats(dash);
      setBooks(Array.isArray(booksData) ? booksData : booksData.results || []);
    } catch (e) {
      setError(e.message);
    }
  }

  useEffect(() => { loadAll(); }, []);

  async function handleAddBook(e) {
    e.preventDefault();
    setError(""); setSuccess("");
    try {
      await addBook(token, {
        title: form.title,
        author: form.author,
        isbn: form.isbn,
        total_copies: parseInt(form.total_copies || "1"),
        available_copies: parseInt(form.available_copies || "1"),
      });
      setSuccess("Book added successfully!");
      setForm({ title: "", author: "", isbn: "", total_copies: "1", available_copies: "1" });
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  async function handleDeleteBook(id) {
    setError(""); setSuccess("");
    try {
      await deleteBook(token, id);
      setSuccess("Book deleted successfully!");
      loadAll();
    } catch (e) {
      setError(e.message);
    }
  }

  function handleFormChange(key, val) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  return (
    <div className="adm-root">
      {/* Navbar */}
      <nav className="adm-navbar">
        <h1 className="adm-navbar-title">Library Admin</h1>
        <div className="adm-navbar-right">
          <span className="adm-badge">ADMIN</span>
          <button className="adm-logout-btn" onClick={() => { logout(); navigate("/"); }}>Logout</button>
        </div>
      </nav>

      <div className="adm-content">
        <h2 className="adm-heading">Admin Dashboard</h2>
        <p className="adm-subheading">Library overview and management</p>

        {/* Stat cards */}
        <div className="adm-stats-row">
          <StatCard label="Total Books"  value={stats.total_books || 0}         icon="📚" color="#3b82f6" />
          <StatCard label="Borrowed"     value={stats.total_borrowed_books || 0} icon="📖" color="#f59e0b" />
          <StatCard label="Overdue"      value={stats.total_overdue_books || 0}  icon="⏰" color="#ef4444" />
          <StatCard label="Total Users"  value={stats.total_users || 0}          icon="👥" color="#8b5cf6" />
          <StatCard label="Available"    value={stats.total_available_copies || 0} icon="✅" color="#22c55e" />
        </div>

        {/* Fine warning */}
        {(stats.total_pending_fine || 0) > 0 && (
          <div className="adm-fine-warn">
            Pending fines: Rs.{stats.total_pending_fine} across {stats.total_overdue_books} overdue books.
          </div>
        )}

        {/* Feedback */}
        {success && <div className="adm-success">{success}</div>}
        {error   && <div className="adm-error">{error}</div>}

        {/* Add book form */}
        <div className="adm-form-card">
          <h3 className="adm-form-title">Add New Book</h3>
          <form className="adm-form" onSubmit={handleAddBook}>
            <div className="adm-form-row">
              <div className="adm-field">
                <label>Title</label>
                <input placeholder="Book title" value={form.title} onChange={(e) => handleFormChange("title", e.target.value)} required />
              </div>
              <div className="adm-field">
                <label>Author</label>
                <input placeholder="Author name" value={form.author} onChange={(e) => handleFormChange("author", e.target.value)} />
              </div>
            </div>
            <div className="adm-form-row">
              <div className="adm-field">
                <label>ISBN</label>
                <input placeholder="ISBN number" value={form.isbn} onChange={(e) => handleFormChange("isbn", e.target.value)} />
              </div>
              <div className="adm-field">
                <label>Total Copies</label>
                <input type="number" placeholder="e.g. 5" value={form.total_copies} onChange={(e) => handleFormChange("total_copies", e.target.value)} />
              </div>
              <div className="adm-field">
                <label>Available Copies</label>
                <input type="number" placeholder="e.g. 5" value={form.available_copies} onChange={(e) => handleFormChange("available_copies", e.target.value)} />
              </div>
            </div>
            <button className="adm-add-btn" type="submit">+ Add Book</button>
          </form>
        </div>

        {/* Books table */}
        <div className="adm-table-card">
          <div className="adm-table-header">
            <h3>All Books</h3>
            <button className="adm-refresh-btn" onClick={loadAll}>Refresh</button>
          </div>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>ID</th><th>Title</th><th>Author</th>
                  <th>ISBN</th><th>Available</th><th>Total</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {books.map((b) => (
                  <tr key={b.id}>
                    <td>{b.id}</td>
                    <td>{b.title}</td>
                    <td>{b.author}</td>
                    <td>{b.isbn}</td>
                    <td>{b.available_copies}</td>
                    <td>{b.total_copies}</td>
                    <td>
                      <button className="adm-delete-btn" onClick={() => handleDeleteBook(b.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}