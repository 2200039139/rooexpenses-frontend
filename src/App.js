import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import Dashboard from './components/RoommateExpenseTracker';
import RoommateAccessManager from './components/RoommateAccessManager';
import Invitations from './components/Invitations';

// Updated PrivateRoute for React Router v6
const PrivateRoute = ({ element: Element }) => {
  const isAuthenticated = localStorage.getItem('token') !== null;
  return isAuthenticated ? <Element /> : <Navigate to="/login" replace />;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        
        {/* Public route */}
        <Route path="/RoommateAccessManager" element={<RoommateAccessManager />} />
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={<PrivateRoute element={Dashboard} />} 
        />
        <Route 
          path="/invitations" 
          element={<PrivateRoute element={Invitations} />} 
        />
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;