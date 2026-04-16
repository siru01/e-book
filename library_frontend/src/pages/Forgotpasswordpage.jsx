// src/pages/ForgotPasswordPage.jsx
import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './Forgotpasswordpage.css';

const API_BASE = ''; // Use relative paths to take advantage of Vite proxy

const ForgotPasswordPage = () => {
  const navigate = useNavigate();

  const [step, setStep] = useState(1);        // 1 = email, 2 = otp + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const otpRefs = useRef([]);

  // ── Step 1: Request OTP ────────────────────────────────────
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Please enter your email.');
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong.');
      setStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // ── OTP box logic ─────────────────────────────────────────
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      otpRefs.current[5]?.focus();
      e.preventDefault();
    }
  };

  // ── Step 2: Reset password ────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setError('');
    const otpString = otp.join('');
    if (otpString.length < 6) return setError('Please enter the full 6-digit code.');
    if (!newPassword) return setError('Please enter a new password.');
    if (newPassword.length < 8) return setError('Password must be at least 8 characters.');
    if (newPassword !== confirmPassword) return setError('Passwords do not match.');

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otp: otpString,
          new_password: newPassword,
          confirm_password: confirmPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Something went wrong.');
      setSuccess('Password updated! Redirecting to login…');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError('');
    setOtp(['', '', '', '', '', '']);
    otpRefs.current[0]?.focus();
    setLoading(true);
    try {
      await fetch(`${API_BASE}/api/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fp-container">
      <div className="fp-card">
        <div className="fp-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
          SHELF
        </div>

        {/* ── Step 1: Email ── */}
        {step === 1 && (
          <>
            <h2>Forgot password?</h2>
            <p className="fp-subtitle">
              Enter your registered email and we'll send you a 6-digit reset code.
            </p>

            <form onSubmit={handleRequestOtp}>
              {error && <p className="fp-error">{error}</p>}

              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  autoFocus
                  required
                />
              </div>

              <button type="submit" className="btn-black" disabled={loading}>
                {loading ? 'SENDING...' : 'SEND RESET CODE'}
              </button>
            </form>

            <button className="fp-back-link" onClick={() => navigate('/login')}>
              ← Back to login
            </button>
          </>
        )}

        {/* ── Step 2: OTP + new password ── */}
        {step === 2 && (
          <>
            <h2>Reset password</h2>
            <p className="fp-subtitle">
              Enter the 6-digit code sent to <strong>{email}</strong>, then set your new password.
            </p>

            <form onSubmit={handleResetPassword}>
              {error && <p className="fp-error">{error}</p>}
              {success && <p className="fp-success">{success}</p>}

              {/* OTP boxes */}
              <div className="input-group">
                <label>Verification code</label>
                <div className="fp-otp-row" onPaste={handleOtpPaste}>
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (otpRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      className="fp-otp-box"
                      autoFocus={i === 0}
                    />
                  ))}
                </div>
                <button type="button" className="fp-resend-btn" onClick={handleResend} disabled={loading}>
                  Resend code
                </button>
              </div>

              {/* New password */}
              <div className="input-group">
                <label>New password</label>
                <div className="fp-pw-wrap">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                  />
                  <button type="button" className="fp-eye" onClick={() => setShowNew((v) => !v)} tabIndex={-1}>
                    {showNew ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>

              {/* Confirm password */}
              <div className="input-group">
                <label>Confirm new password</label>
                <div className="fp-pw-wrap">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat your new password"
                    autoComplete="new-password"
                  />
                  <button type="button" className="fp-eye" onClick={() => setShowConfirm((v) => !v)} tabIndex={-1}>
                    {showConfirm ? <EyeOff /> : <EyeOn />}
                  </button>
                </div>
              </div>

              <button type="submit" className="btn-black" disabled={loading || !!success}>
                {loading ? 'RESETTING...' : 'RESET PASSWORD'}
              </button>
            </form>

            <button
              className="fp-back-link"
              onClick={() => { setStep(1); setError(''); setOtp(['', '', '', '', '', '']); }}
            >
              ← Use a different email
            </button>
          </>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;

function EyeOn() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOff() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" y1="1" x2="23" y2="23" />
    </svg>
  );
}