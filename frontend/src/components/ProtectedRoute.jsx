import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  // 1. Check if they are logged in at all
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. If this specific route requires certain roles, check their ID badge
  if (allowedRoles && userStr) {
    try {
      const user = JSON.parse(userStr);
      
      // If their role isn't in the allowed list, kick them back to the safe Dashboard
      if (!allowedRoles.includes(user.role)) {
        console.warn(`Access Denied: Requires ${allowedRoles}, user is ${user.role}`);
        return <Navigate to="/" replace />; 
      }
    } catch (e) {
      // If the user data is corrupted, force them to log in again
      return <Navigate to="/login" replace />;
    }
  }

  // They have the token AND the right role! Let them in.
  return children;
}

export default ProtectedRoute;