import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import './Login.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const role = await login(email, password);
      if (role === 'ADMIN' || role === 'LIBRARIAN') {
        // replace: true removes /login from history so back button
        // cannot return to the login page after a successful login
        navigate('/admin-dashboard', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="logo">SHELF</div>
        <h2>Welcome Back</h2>
        <p className="subtitle">Log in to continue your journey</p>

        <form onSubmit={handleSubmit}>
          {error && <p style={{ color: 'red', marginBottom: '12px', fontSize: '0.9rem' }}>{error}</p>}
          <div className="input-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              required
            />
          </div>

          <div className="input-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
            />
          </div>

          <button type="submit" className="btn-black" disabled={loading}>
            {loading ? 'LOGGING IN...' : 'LOG IN'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;