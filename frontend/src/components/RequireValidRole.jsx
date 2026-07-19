import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Recognized platform roles. Kept in one place so it's easy to update if a
// new role is ever added.
const VALID_ROLES = ['Admin', 'Manager', 'Data Entry', 'auditor'];

// Second line of defense against unassigned/mis-approved accounts reaching
// any part of the app. This catches the case where a user has a valid
// session (passed login) but role is missing, 'Pending', or otherwise not
// one of the recognized values — e.g. an approval action that flipped
// status without ever setting a real role.
//
// Wrap this around DashboardRouter (and any other route lacking an
// allowedRoles check) in App.jsx:
//   <Route path="/dashboard" element={<RequireValidRole><DashboardRouter /></RequireValidRole>} />
function RequireValidRole({ children }) {
    const { user, logout } = useAuth();

    const hasValidRole = user?.role && VALID_ROLES.includes(user.role);

    if (!hasValidRole) {
        console.warn(`Blocked access: role "${user?.role}" is not recognized.`);
        logout(); // Clear the invalid session rather than leaving them stuck in limbo
        return (
            <Navigate
                to="/login"
                replace
                state={{ message: 'Your account role has not been fully configured yet. Please contact your administrator.' }}
            />
        );
    }

    return children;
}

export default RequireValidRole;
