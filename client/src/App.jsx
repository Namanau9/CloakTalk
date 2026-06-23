import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import PinSetup from './pages/PinSetup';
import Dashboard from './pages/Dashboard';
import Chat from './pages/Chat';
import ProtectedRoute from './components/ProtectedRoute';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/auth-callback" element={<Login />} />
      <Route
        path="/setup-pin"
        element={
          <ProtectedRoute>
            <PinSetup />
          </ProtectedRoute>
        }
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat/:userId"
        element={
          <ProtectedRoute>
            <Chat />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
