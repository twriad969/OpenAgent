import { Navigate, Route, Routes } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Project from './pages/Project';

function ProtectedRoute({ children }) {
  const token = localStorage.getItem('lf_token');
  if (!token) return <Navigate to="/" replace />;
  return children;
}

function RootRoute() {
  const token = localStorage.getItem('lf_token');
  return token ? <Navigate to="/dashboard" replace /> : <Login />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<RootRoute />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/project/:id"
        element={
          <ProtectedRoute>
            <Project />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
