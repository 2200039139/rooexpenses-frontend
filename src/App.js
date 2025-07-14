import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import SignupPage from './components/SignupPage';
import RoommateExpenseTracker from './components/RoommateExpenseTracker';
import HomePage from './components/Homepage';

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
        <Route path="/Homepage" element={<HomePage />}/>
        
        {/* Public route */}
   
        
        {/* Protected routes */}
        <Route 
          path="/dashboard" 
          element={<PrivateRoute element={RoommateExpenseTracker} />} 
        />
      
        
        {/* Default redirect */}
        <Route path="/" element={<Navigate to="/homepage" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
