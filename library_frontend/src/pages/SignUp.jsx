// pages/SignUp.jsx
import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/Authcontext';
import './SignUp.css';

const SignUp = () => {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  // OTP State
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const [otpError, setOtpError] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const inputRefs = useRef([]);
  
  const navigate = useNavigate();
  const { signup, sendOtp } = useAuth();

  const validateForm = () => {
    if (!username.trim()) {
      setError('Username is required'); return false;
    }
    if (username.length < 3) {
      setError('Username must be at least 3 characters long'); return false;
    }
    if (!email.trim()) {
      setError('Email is required'); return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address'); return false;
    }
    if (!password) {
      setError('Password is required'); return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters long'); return false;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match'); return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!validateForm()) return;
    
    setLoading(true);
    
    try {
      await sendOtp(email);
      setStep(2);
    } catch (err) {
      setError(err.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index, value) => {
    if (isNaN(value)) return; // Only numbers
    const newOtp = [...otpValues];
    newOtp[index] = value;
    setOtpValues(newOtp);

    // Auto focus next
    if (value !== '' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      // Focus prev
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setOtpError('');
    
    const otpString = otpValues.join('');
    if (otpString.length !== 6) {
      setOtpError('Please enter all 6 digits.');
      return;
    }

    setOtpLoading(true);

    try {
      await signup(username, email, password, otpString);
      navigate('/login', { replace: true });
    } catch (err) {
      const errMsg = err.message || 'Verification failed';
      setOtpError(errMsg);
      if (errMsg.includes('blocked for 24 hours')) {
        setTimeout(() => {
          setStep(1); // Go back to details
          setError('This email is blocked for 24 hours due to too many failed attempts.');
          setOtpValues(['', '', '', '', '', '']);
        }, 3000); 
      }
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResend = async () => {
    setOtpError('');
    setOtpValues(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    try {
      await sendOtp(email);
      setOtpError('A new OTP has been sent.');
    } catch (err) {
      setOtpError(err.message || 'Failed to resend OTP.');
    }
  };

  return (
    <div className="signup-container">
      <div className={`signup-card ${step === 2 ? 'otp-mode' : ''}`}>
        <div className="logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>SHELF</div>
        
        {step === 1 && (
          <>
            <h2>Create Account</h2>
            <p className="subtitle">Join our community of readers</p>

            <form onSubmit={handleSubmit}>
              {error && <p className="error-message">{error}</p>}
              
              <div className="input-group">
                <label>Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Choose a username"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Create a password"
                  required
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Re-enter Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm your password"
                  required
                  disabled={loading}
                />
              </div>

              <button type="submit" className="btn-black" disabled={loading}>
                {loading ? 'SENDING OTP...' : 'SIGN UP'}
              </button>
            </form>
            
            <div className="login-link">
              <p>
                Already have an account?{' '}
                <span onClick={() => navigate('/login')} className="link-text">
                  Log in
                </span>
              </p>
            </div>
          </>
        )}

        {step === 2 && (
          <div className="otp-verification-step">
            <h2>Verify Email</h2>
            <p className="subtitle">We've sent a 6-digit code to <strong>{email}</strong></p>
            
            <form onSubmit={handleOtpSubmit}>
              {otpError && <p className={`error-message ${otpError.includes('sent') ? 'success-text' : ''}`}>{otpError}</p>}
              
              <div className="otp-inputs-container">
                {otpValues.map((digit, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    value={digit}
                    ref={(el) => (inputRefs.current[idx] = el)}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    className="otp-digit-input"
                    disabled={otpLoading}
                  />
                ))}
              </div>

              <button type="submit" className="btn-black btn-verify" disabled={otpLoading || otpValues.includes('')}>
                {otpLoading ? 'VERIFYING...' : 'VERIFY IDENTITY'}
              </button>
            </form>

            <div className="resend-container">
              <p>Didn't receive code? <span className="link-text" onClick={handleResend}>Resend OTP</span></p>
              <p className="back-link link-text mt-2" onClick={() => setStep(1)}>Change Email</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default SignUp;