import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

const LoginPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Initialize Google Sign-In API
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    document.body.appendChild(script);

    script.onload = () => {
      if (window.google) {
        window.google.accounts.id.initialize({
          client_id: '37085501976-b54lfva9uchil1jq6boc6vt4jb1bqb5d.apps.googleusercontent.com',
          callback: handleGoogleResponse
        });
        window.google.accounts.id.renderButton(
          document.getElementById('google-login-button'),
          { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, );

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    setError('hi');
    
    try {
      const backendResponse = await fetch('https://ample-ambition-production.up.railway.app/api/users/google-auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: response.credential
        }),
      });
      
      const data = await backendResponse.json();
      
      if (!backendResponse.ok) {
        throw new Error(data.error || 'Google login failed');
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to login with Google');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('https://ample-ambition-production.up.railway.app/api/users/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Login failed');
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-container">
      {/* Left side - Login form */}
      <div className="login-side">
        <div className="login-card">
          <button className="back-button" onClick={() => navigate('/')}> homepage
            
          </button>

          
          <div className="login-header">
            <h2>Login to Room Expenses</h2>
            <p className="subtitle">Track and split shared expenses with ease</p>
          </div>
          
          {error && (
            <div className="error-message">
              <FiInfo className="error-icon" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <div className="input-with-icon">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>
            
            <div className="form-options">
              <div className="remember-me">
                <input
                  type="checkbox"
                  id="remember"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <label htmlFor="remember">Remember me</label>
              </div>
              
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>
            
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Logging in...</span>
                </>
              ) : 'Next'}
            </button>
          </form>
          
          <div className="separator">
            <span className="separator-line"></span>
            <span className="separator-text">or</span>
            <span className="separator-line"></span>
          </div>
          
          <div id="google-login-button" className="google-login-button"></div>
          
          <div className="signup-prompt">
            <p>Don't have an account? <Link to="/signup" className="signup-link">Sign up</Link></p>
          </div>
        </div>
      </div>
      
      {/* Right side - Informational content */}
      <div className="info-side">
        <div className="info-content">
          <div className="info-logo">Room Expenses</div>
          <h3>Did you know?</h3>
          <p className="statistic">SplitEase helps thousands of roommates manage over $1M in shared expenses every month.</p>
          
          <div className="testimonial">
            <p className="quote">"This app saved us countless hours of calculating who owes what. Now we just log expenses and it does all the math for us!"</p>
            <p className="author">- Sarah & Roommates, New York</p>
          </div>
          
          <div className="features">
            <div className="feature-item">
              <FiCheck className="feature-icon" />
              <span>Track all shared expenses in one place</span>
            </div>
            <div className="feature-item">
              <FiCheck className="feature-icon" />
              <span>Automatically calculate who owes what</span>
            </div>
            <div className="feature-item">
              <FiCheck className="feature-icon" />
              <span>Get payment reminders and notifications</span>
            </div>
          </div>
          
          <div className="thank-you">
            <p>Thank you for being our valued user!</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
