import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LockScreen from '../pages/LockScreen';

export default function ProtectedRoute({ children }) {
  const { user, loading, isLocked } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-950">
        <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (isLocked) {
    return <LockScreen />;
  }

  return children;
}
