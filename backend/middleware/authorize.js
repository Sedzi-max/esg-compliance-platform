const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = async (req, res, next) => {
    try {
        // 1. Look for the Authorization header in the incoming request
        const authHeader = req.header("Authorization");
        
        if (!authHeader) {
            return res.status(403).json({ error: "Access Denied: No token provided" });
        }

        // 2. Extract the token (Format usually comes in as "Bearer eyJhbGciOi...")
        const token = authHeader.split(" ")[1];

        // 3. Verify the token using your secret key
        const payload = jwt.verify(token, process.env.JWT_SECRET);

        // 4. CRITICAL FIX: Attach the ENTIRE payload to the request!
        // This ensures req.user now contains BOTH req.user.id and req.user.role
        req.user = payload;
        
        // Let them pass!
        next(); 
        
    } catch (err) {
        // If the token is fake, expired, or manipulated, reject them
        console.error("JWT Verification Error:", err.message);
        return res.status(403).json({ error: "Access Denied: Invalid token" });
    }
};