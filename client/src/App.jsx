import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Auth/Login.jsx';
import Register from './pages/Auth/Register.jsx';
import DashboardLayout from './layouts/DashboardLayout.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Wallet from './pages/Wallet/Wallet.jsx';
import Market from './pages/Market/Market.jsx';
import Portfolio from './pages/Portfolio/Portfolio.jsx';
import Transactions from './pages/Transactions/Transactions.jsx';
import Analytics from './pages/Analytics/Analytics.jsx';
import Profile from './pages/Profile/Profile.jsx';
import AdminPanel from './pages/AdminPanel.jsx';

// Protected Route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

// Admin Route component
const AdminRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useSelector((state) => state.auth);
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return isAdmin ? children : <Navigate to="/dashboard" replace />;
};

// User Route component (redirects admin to /admin)
const UserRoute = ({ children }) => {
  const { isAuthenticated, isAdmin } = useSelector((state) => state.auth);
  if (isAuthenticated && isAdmin) return <Navigate to="/admin" replace />;
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Route */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminPanel />
            </AdminRoute>
          }
        />

        {/* Protected Dashboard Layout and Sub-pages */}
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<UserRoute><Dashboard /></UserRoute>} />
          <Route path="wallet" element={<Wallet />} />
          <Route path="market" element={<Market />} />
          <Route path="portfolio" element={<Portfolio />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="profile" element={<Profile />} />
        </Route>

        {/* Catch-all Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
