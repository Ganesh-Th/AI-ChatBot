import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import './AuthPage.css';

export default function AuthPage() {
  const { googleLogin } = useAuth();
  const navigate = useNavigate();
  const buttonRef = useRef(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderGoogleButton = () => {
      if (cancelled || !window.google || !buttonRef.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          setError('');
          setLoading(true);
          try {
            await googleLogin(credential);
            navigate('/');
          } catch (err) {
            const message = err?.response?.data?.detail || 'Google sign-in failed. Please try again.';
            setError(typeof message === 'string' ? message : JSON.stringify(message));
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
        shape: 'rectangular',
        width: 356,
      });
    };

    if (window.google) {
      renderGoogleButton();
    } else {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
    };
  }, [googleLogin, navigate]);

  return (
    <div className="auth-root">
      {/* Animated background blobs */}
      <div className="blob blob-1" />
      <div className="blob blob-2" />
      <div className="blob blob-3" />

      <div className="auth-card">
        {/* Logo */}
        <div className="auth-logo">
          <div className="logo-icon">
            <svg viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="18" cy="18" r="18" fill="url(#grad)" />
              <path d="M10 18h16M18 10v16" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="18" cy="18" r="4" fill="white" fillOpacity="0.9" />
              <defs>
                <linearGradient id="grad" x1="0" y1="0" x2="36" y2="36" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#7C3AED" />
                  <stop offset="1" stopColor="#06B6D4" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="logo-text">GeminiChat</span>
        </div>

        <h1 className="auth-heading">Welcome to GeminiChat</h1>
        <p className="auth-sub">Continue with your Google account to start chatting with Gemini AI.</p>

        <div className="google-button" ref={buttonRef} />
        {loading && <span className="btn-spinner" aria-label="Signing in" />}
        {error && <div className="auth-error">{error}</div>}
      </div>
    </div>
  );
}
