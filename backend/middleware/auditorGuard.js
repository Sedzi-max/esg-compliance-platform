// backend/middleware/auditorGuard.js

const auditorGuard = (req, res, next) => {
    // 1. Ensure the user is actually logged in (your authorize.js should have handled this)
    // We assume your authorize middleware attaches the decoded token to `req.user`
    const userRole = req.user?.role; 

    if (!userRole) {
        return res.status(403).json({ error: "Access Denied: Missing role credentials." });
    }

    // 2. The Gatekeeper Logic
    if (userRole === 'auditor') {
        // If they are an auditor, check the HTTP method.
        // Auditors are ONLY allowed to use GET (Read) requests.
        if (req.method !== 'GET') {
            return res.status(403).json({ 
                error: "Audit Compliance Lock: Auditor accounts have strict read-only permissions. You cannot alter data." 
            });
        }
    }

    // 3. If they are a manager, or an auditor just looking at data (GET), let them through!
    next();
};

module.exports = auditorGuard;