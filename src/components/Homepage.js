import React from 'react';
import { Link } from 'react-router-dom';
import './Invitations.css';

// Data for reusable components
const features = [
  {
    icon: '💸',
    title: 'Easy Splitting',
    description: 'Split bills among roommates with just a few clicks.'
  },
  {
    icon: '📊',
    title: 'Visual Reports',
    description: 'See clear charts of who owes what at a glance.'
  },
  {
    icon: '🔔',
    title: 'Payment Reminders',
    description: 'Automated reminders to keep everyone on track.'
  },
  {
    icon: '📱',
    title: 'Mobile Friendly',
    description: 'Access from any device, anywhere.'
  }
];

const testimonials = [
  {
    quote: "RoomExpense saved our friendship! No more arguments about who paid for what.",
    author: "- Sarah, Bangalore"
  },
  {
    quote: "As someone who hates math, this app is a lifesaver for splitting expenses fairly.",
    author: "- Rohan, Mumbai"
  }
];

const footerLinks = {
  product: ['Features', 'Pricing', 'FAQ'],
  company: ['About Us', 'Blog', 'Contact'],
  legal: ['Privacy Policy', 'Terms of Service', 'Cookie Policy']
};

// Reusable Components
const FeatureCard = ({ icon, title, description }) => (
  <div className="feature-card">
    <div className="feature-icon">{icon}</div>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const TestimonialCard = ({ quote, author }) => (
  <div className="testimonial-card">
    <p>"{quote}"</p>
    <div className="testimonial-author">{author}</div>
  </div>
);

const FooterColumn = ({ title, items }) => (
  <div className="link-column">
    <h4>{title}</h4>
    {items.map((item, index) => (
      <Link key={index} to={`/${item.toLowerCase().replace(' ', '-')}`}>
        {item}
      </Link>
    ))}
  </div>
);

// Main Component
const HomePage = () => {
  const currentYear = new Date().getFullYear();

  return (
    <div className="homepage">
      {/* Navigation */}
      <nav className="navbar">
        <div className="logo">RoomExpense</div>
        <div className="auth-buttons">
          <Link to="/login" className="btn outline">Log In</Link>
          <Link to="/signup" className="btn primary">Sign Up</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero">
        <div className="hero-content">
          <h1>Track Shared Expenses with Ease</h1>
          <p>Split bills, manage room expenses, and keep everyone accountable in one simple app.</p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn primary">Get Started</Link>
            <Link to="/about" className="btn outline">Learn More</Link>
          </div>
        </div>
        <div className="hero-image">

        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <h2>Why Choose RoomExpense?</h2>
        <div className="features-grid">
          {features.map((feature, index) => (
            <FeatureCard key={index} {...feature} />
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section className="testimonials">
        <h2>What Our Users Say</h2>
        <div className="testimonials-grid">
          {testimonials.map((testimonial, index) => (
            <TestimonialCard key={index} {...testimonial} />
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta">
        <h2>Ready to Simplify Your Shared Expenses?</h2>
        <p>Join thousands of happy users managing their shared living costs effortlessly.</p>
        <Link to="/signup" className="btn primary large">Start for Free</Link>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-brand">
            <div className="logo">RoomExpense</div>
            <div className="copyright">© {currentYear} RoomExpense. All rights reserved.</div>
          </div>
          
          <div className="footer-links">
            <FooterColumn title="Product" items={footerLinks.product} />
            <FooterColumn title="Company" items={footerLinks.company} />
            <FooterColumn title="Legal" items={footerLinks.legal} />
          </div>
        </div>
        
        <div className="footer-bottom">
          <div className="social-links">
            {['facebook', 'twitter', 'instagram', 'linkedin'].map((platform) => (
              <a key={platform} href={`https://${platform}.com`} aria-label={platform}>
                <span className={`icon-${platform}`}></span>
              </a>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
