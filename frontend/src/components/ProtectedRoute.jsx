import { Navigate } from 'react-router-dom';

// Recognized platform roles. Kept in one place so it's easy to update if a
// new role is ever added.
const VALID_ROLES = ['Admin', 'Manager', 'Data Entry', 'auditor'];

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');

  // 1. Check if they are logged in at all
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Second line of defense: even routes with NO allowedRoles restriction
  // (like /dashboard) still require the user to have a real, recognized
  // role. This catches accounts left in a bad state — e.g. an approval
  // action that flipped status to 'approved' without ever assigning a
  // real role, leaving role as 'Pending' or missing entirely.
  if (userStr) {
    try {
      const user = JSON.parse(userStr);

      if (!user.role || !VALID_ROLES.includes(user.role)) {
        console.warn(`Access Denied: "${user.role}" is not a recognized role.`);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return (
          <Navigate
            to="/login"
            replace
            state={{ message: 'Your account role has not been fully configured yet. Please contact your administrator.' }}
          />
        );
      }

      // 3. If this specific route requires certain roles, check their ID badge
      if (allowedRoles && !allowedRoles.includes(user.role)) {
        console.warn(`Access Denied: Requires ${allowedRoles}, user is ${user.role}`);
        return <Navigate to="/" replace />;
      }
    } catch (e) {
      // If the user data is corrupted, force them to log in again
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      return <Navigate to="/login" replace />;
    }
  } else {
    // Has a token but no user object at all — corrupted/incomplete session
    localStorage.removeItem('token');
    return <Navigate to="/login" replace />;
  }

  // They have the token AND a valid, permitted role! Let them in.
  return children;
}

export default ProtectedRoute;
