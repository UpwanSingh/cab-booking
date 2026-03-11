import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import BookRide from './pages/BookRide';
import TripHistory from './pages/TripHistory';
import Wallet from './pages/Wallet';
import Profile from './pages/Profile';
import DriverDashboard from './pages/DriverDashboard';
import Earnings from './pages/Earnings';
import AdminDashboard from './pages/AdminDashboard';
import DriverApproval from './pages/DriverApproval';
import RideMonitor from './pages/RideMonitor';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-screen" style={{ minHeight: '100vh' }}>
        <div style={{ fontSize: '3rem' }}>🚕</div>
        <div className="spinner" style={{ width: '40px', height: '40px' }} />
        <p>Loading CabGo...</p>
      </div>
    );
  }

  const getHome = () => {
    if (!user) return '/login';
    if (user.role === 'ADMIN') return '/admin';
    if (user.role === 'DRIVER') return '/driver';
    return '/';
  };

  return (
    <>
      <Navbar />
      <Routes>
        {/* Public */}
        <Route path="/login" element={user ? <Navigate to={getHome()} /> : <LoginPage />} />
        <Route path="/register" element={user ? <Navigate to={getHome()} /> : <RegisterPage />} />

        {/* Passenger */}
        <Route path="/" element={
          <ProtectedRoute roles={['PASSENGER']}>
            <BookRide />
          </ProtectedRoute>
        } />
        <Route path="/history" element={
          <ProtectedRoute roles={['PASSENGER', 'DRIVER']}>
            <TripHistory />
          </ProtectedRoute>
        } />
        <Route path="/wallet" element={
          <ProtectedRoute roles={['PASSENGER']}>
            <Wallet />
          </ProtectedRoute>
        } />

        {/* Profile — all roles */}
        <Route path="/profile" element={
          <ProtectedRoute roles={['PASSENGER', 'DRIVER', 'ADMIN']}>
            <Profile />
          </ProtectedRoute>
        } />

        {/* Driver */}
        <Route path="/driver" element={
          <ProtectedRoute roles={['DRIVER']}>
            <DriverDashboard />
          </ProtectedRoute>
        } />
        <Route path="/driver/earnings" element={
          <ProtectedRoute roles={['DRIVER']}>
            <Earnings />
          </ProtectedRoute>
        } />

        {/* Admin */}
        <Route path="/admin" element={
          <ProtectedRoute roles={['ADMIN']}>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        <Route path="/admin/drivers" element={
          <ProtectedRoute roles={['ADMIN']}>
            <DriverApproval />
          </ProtectedRoute>
        } />
        <Route path="/admin/rides" element={
          <ProtectedRoute roles={['ADMIN']}>
            <RideMonitor />
          </ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to={getHome()} />} />
      </Routes>
    </>
  );
}

