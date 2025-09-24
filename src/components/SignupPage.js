import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  FiArrowLeft, 
  FiCheck, 
  FiInfo,
  FiEye, 
  FiEyeOff,
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
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
        
        const button = document.getElementById('google-signup-button');
        if (button) {
          window.google.accounts.id.renderButton(button, {
            theme: 'outline',
            size: 'large',
            width: '100%',
            text: 'signup_with'
          });
        }
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
        throw new Error(data.message || 'Google signup failed');
      }
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('token', data.data.token);
        navigate('/dashboard');
      } else {
        throw new Error(data.message || 'Signup failed');
      }
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

  const validatePassword = (password) => {
    const requirements = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      number: /[0-9]/.test(password),
      special: /[^A-Za-z0-9]/.test(password)
    };
    
    return {
      ...requirements,
      strength: Object.values(requirements).filter(Boolean).length
    };
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
    
    const passwordValidation = validatePassword(formData.password);
    if (passwordValidation.strength < 3) {
      setError('Password is too weak. Please include uppercase letters, numbers, and special characters.');
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
        throw new Error(data.message || 'Registration failed');
      }
      
      if (data.success) {
        localStorage.setItem('user', JSON.stringify(data.data.user));
        localStorage.setItem('token', data.data.token);
        navigate('/dashboard');
      } else {
        throw new Error(data.message || 'Registration failed');
      }
    } catch (err) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const PasswordStrengthIndicator = ({ password }) => {
    const validation = validatePassword(password);
    const strengthLabels = ['Very Weak', 'Weak', 'Fair', 'Good', 'Strong'];
    
    return (
      <div className="password-strength-detailed">
        <div className="strength-meter">
          <div className="strength-bars">
            {[1, 2, 3, 4].map((level) => (
              <div
                key={level}
                className={`strength-bar ${validation.strength >= level ? 'active' : ''} strength-${validation.strength}`}
              />
            ))}
          </div>
          <span className="strength-label">
            {password ? strengthLabels[validation.strength] : 'Enter password'}
          </span>
        </div>
        
        {password && (
          <div className="password-requirements">
            <div className={`requirement ${validation.length ? 'met' : ''}`}>
              <FiCheck size={14} />
              At least 8 characters
            </div>
            <div className={`requirement ${validation.uppercase ? 'met' : ''}`}>
              <FiCheck size={14} />
              Uppercase letter
            </div>
            <div className={`requirement ${validation.lowercase ? 'met' : ''}`}>
              <FiCheck size={14} />
              Lowercase letter
            </div>
            <div className={`requirement ${validation.number ? 'met' : ''}`}>
              <FiCheck size={14} />
              Number
            </div>
            <div className={`requirement ${validation.special ? 'met' : ''}`}>
              <FiCheck size={14} />
              Special character
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="split-container">
      {/* Left side - Signup form */}
      <div className="login-side">
        <div className="login-card">
          <button 
            className="back-button" 
            onClick={() => navigate('/')}
            type="button"
            disabled={isLoading}
          >
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
                  disabled={isLoading}
                  maxLength={255}
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
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div className="form-group">
              <label htmlFor="password">Create Password</label>
              <div className="input-with-password">
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Make it strong and secure"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              <PasswordStrengthIndicator password={formData.password} />
            </div>
            
            <div className="form-group">
              <label htmlFor="confirmPassword">Confirm Password</label>
              <div className="input-with-password">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  name="confirmPassword"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Type your password again"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isLoading}
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <div className="error-text">Passwords do not match</div>
              )}
            </div>
            
            <div className="value-proposition">
              <div className="value-item">
                <FiCheck className="value-icon" />
                <span>No credit card required</span>
              </div>
              <div className="value-item">
                <FiCheck className="value-icon" />
                <span>Free forever for basic use</span>
              </div>
              <div className="value-item">
                <FiCheck className="value-icon" />
                <span>30-day money-back guarantee</span>
              </div>
            </div>
            
            <button
              type="submit"
              className={`login-button ${isLoading ? 'loading' : ''}`}
              disabled={isLoading || !formData.fullName || !formData.email || !formData.password || formData.password !== formData.confirmPassword}
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
            <div className="badge-item">⭐ 4.9/5 rating</div>
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
          
          <div className="privacy-notice">
            <p>By signing up, you agree to our <a href="/terms">Terms of Service</a> and <a href="/privacy">Privacy Policy</a>.</p>
          </div>
        </div>
      </div>
      
      {/* Right side - Persuasive content */}
      <div className="info-side">
        <div className="info-content">
          <div className="info-logo">
            <span className="logo-highlight">Spl</span>itta
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
            <div className="testimonial-quote-icon">"</div>
            <div className="testimonial-content">
              "After 3 years of awkward money talks, Splitta gave us back our friendship. We saved 7+ hours/month and eliminated all financial tension. The auto-settle feature alone is worth it."
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
                <p>Smart algorithms that learn your spending patterns to suggest fair splits for complex scenarios.</p>
                <div className="feature-badge">PATENT PENDING</div>
              </div>
              <div className="feature-card hover-grow">
                <div className="feature-card-icon-container">
                  <FiBell className="feature-card-icon" />
                </div>
                <h5>Relationship-Safe Reminders</h5>
                <p>Behavior-based nudges that get results without awkwardness. 92% payment rate before manual follow-up.</p>
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
              <strong>Industry-Leading Guarantee:</strong> 30-day money-back guarantee plus free migration assistance.
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
