import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiLock, 
  FiCheck, 
  FiInfo,
  FiDollarSign,
  FiUsers,
  FiPieChart,
  FiBell,
  FiClock,
  FiStar,
  FiShield,
  FiAward,
  FiCheckCircle,
  FiHeart
} from 'react-icons/fi';
import './SignupPage.css';

const SignupPage = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

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
          document.getElementById('google-signup-button'),
          { theme: 'outline', size: 'large', width: '100%', text: 'signup_with' }
        );
      }
    };

    return () => {
      if (document.body.contains(script)) {
        document.body.removeChild(script);
      }
    };
  }, []);

  const handleGoogleResponse = async (response) => {
    setIsLoading(true);
    setError('');
    
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
        throw new Error(data.error || 'Google signup failed');
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to sign up with Google');
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
    
    if (!formData.fullName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('Please fill in all fields');
      setIsLoading(false);
      return;
    }
    
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }
    
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      setIsLoading(false);
      return;
    }
    
    try {
      const response = await fetch('https://ample-ambition-production.up.railway.app/api/users/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName,
          email: formData.email,
          password: formData.password
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      localStorage.setItem('user', JSON.stringify(data.user));
      localStorage.setItem('token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="split-container">
      {/* Left side - Signup form */}
      <div className="login-side">
        <div className="login-card">
          <button className="back-button" onClick={() => navigate('/')}>
            <FiArrowLeft size={18} />
          </button>

          <div className="login-header">
            <h2>Stop the "Who Owes What" Chaos</h2>
            <p className="subtitle">Create your account in 30 seconds and never argue about money again</p>
          </div>
          
          {error && (
            <div className="error-message">
              <FiInfo className="error-icon" />
              <span>{error}</span>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-group">
              <label htmlFor="fullName">Your Name</label>
              <div className="input-with-icon">
                <input
                  type="text"
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="How should we call you?"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="email">Email</label>
              <div className="input-with-icon">
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Your most-used email"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Create Password</label>
              <div className="input-with-icon">
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Make it strong"
                  required
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-icon">
                <input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="One more time"
                  required
                />
              </div>
            </div>
            
            <div className="value-proposition">
              <div className="value-item">
                <span>No credit card required</span>
              </div>
              <div className="value-item">
                <FiCheck className="value-icon" />
                <span>Free forever for basic use</span>
              </div>
            </div>
            
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="spinner"></span>
                  <span>Securing your account...</span>
                </>
              ) : 'Start Splitting Fairly →'}
            </button>
          </form>
          
          <div className="trust-badges">
            <div className="badge-item">🔒 256-bit encryption</div>
            <div className="badge-item">🚀 99.9% uptime</div>
          </div>
          
          <div className="separator">
            <span className="separator-line"></span>
            <span className="separator-text">or join with</span>
            <span className="separator-line"></span>
          </div>
          
          <div id="google-signup-button" className="google-login-button"></div>
          
          <div className="login-prompt">
            <p>Already keeping track? <Link to="/login" className="signup-link">Access your dashboard</Link></p>
          </div>
        </div>
      </div>
      
      {/* Right side - Persuasive content */}
<div className="info-side">
  <div className="info-content">
    <div className="info-logo">
      <span className="logo-highlight">Room</span>Expenses
    </div>
    <h3 className="headline">
      <span className="headline-decoration">///</span> The Smarter Way to Split Expenses
      <span className="headline-decoration">///</span>
    </h3>
    
    <div className="results-stats">
      <div className="stat-item glow-effect">
        <FiDollarSign className="stat-icon" />
        <div>
          <div className="stat-number">$1.4M+</div>
          <div className="stat-label">tracked weekly</div>
          <div className="stat-trend up">↑ 12% MoM</div>
        </div>
      </div>
      <div className="stat-item glow-effect">
        <FiUsers className="stat-icon" />
        <div>
          <div className="stat-number">23K+</div>
          <div className="stat-label">active groups</div>
          <div className="stat-trend up">↑ 8% MoM</div>
        </div>
      </div>
      <div className="stat-item glow-effect">
        <FiClock className="stat-icon" />
        <div>
          <div className="stat-number">7.2 hrs</div>
          <div className="stat-label">saved monthly</div>
          <div className="stat-trend up">↑ 15% MoM</div>
        </div>
      </div>
    </div>
    
    <div className="testimonial-card floating-card">
      <div className="testimonial-quote-icon">“</div>
      <div className="testimonial-content">
        "After 3 years of awkward money talks,  gave us back our friendship. We saved 7+ hours/month and eliminated all financial tension. The auto-settle feature alone is worth the subscription."
      </div>
      <div className="testimonial-author">
        <div className="author-avatar" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>JD</div>
        <div className="author-info">
          <div className="author-name">Jamie D.</div>
          <div className="author-title">3-person household • Power User since 2025</div>
          <div className="author-rating">
            {[...Array(5)].map((_, i) => (
              <FiStar key={i} className="star-icon filled" />
            ))}
          </div>
        </div>
      </div>
    </div>
    
    <div className="unique-features">
      <h4 className="section-title">
        <span className="title-underline">Why Top Groups Choose Us</span>
      </h4>
      <div className="feature-grid">
        <div className="feature-card hover-grow">
          <div className="feature-card-icon-container">
            <FiPieChart className="feature-card-icon" />
          </div>
          <h5>AI-Powered Splitting</h5>
          <p>Our algorithm learns your spending patterns to suggest fair splits, even for complex scenarios like vacations or shared groceries.</p>
          <div className="feature-badge">PATENT PENDING</div>
        </div>
        <div className="feature-card hover-grow">
          <div className="feature-card-icon-container">
            <FiBell className="feature-card-icon" />
          </div>
          <h5>Relationship-Safe Reminders</h5>
          <p>Behavior-based nudges that get results without awkwardness. 92% payment rate before manual follow-up needed.</p>
        </div>
        <div className="feature-card hover-grow">
          <div className="feature-card-icon-container">
            <FiShield className="feature-card-icon" />
          </div>
          <h5>Fraud Protection</h5>
          <p>Real-time expense verification and dispute resolution to prevent misuse in shared budgets.</p>
        </div>
      </div>
    </div>
    
    <div className="guarantee-badge pulse-animation">
      <div className="guarantee-icon">
        <FiAward />
      </div>
      <div className="guarantee-text">
        <strong>Industry-Leading Guarantee:</strong> 30-day money-back guarantee plus free migration assistance if you're switching from another app.
      </div>
    </div>
    
    <div className="trust-badges">
      <div className="trust-item">
        <FiLock /> Bank-Level Security
      </div>
      <div className="trust-item">
        <FiCheckCircle /> PCI Compliant
      </div>
      <div className="trust-item">
        <FiHeart /> Carbon Neutral
      </div>
    </div>
  </div>
</div>
    </div>
  );
};

export default SignupPage;
