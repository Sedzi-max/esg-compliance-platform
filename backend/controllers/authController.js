const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db'); // Imports the real PostgreSQL connection

// ---------------------------------------------------------
// 1. REGISTRATION WORKFLOW (PENDING APPROVAL)
// ---------------------------------------------------------
exports.register = async (req, res) => {
  try {
    // Note: Swapped company_name for unit_id to match the database architecture
    const { email, password, unit_id } = req.body;

    // A. Check if the corporate email is already in the system
    const existingUserResult = await pool.query(
        'SELECT email FROM users WHERE email = $1', 
        [email]
    );
    
    if (existingUserResult.rows.length > 0) {
      return res.status(400).json({ error: 'An account with this corporate email already exists.' });
    }

    // B. Cryptographically hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // C. Insert the new user directly into the PostgreSQL database
    const newUserResult = await pool.query(
        `INSERT INTO users (email, password_hash, role, unit_id) 
         VALUES ($1, $2, $3, $4) RETURNING user_id, email, role, unit_id`,
        [email, hashedPassword, 'Pending', unit_id || null]
    );

    // D. Return the success signal to trigger the frontend's "Application Received" screen
    res.status(201).json({ 
        message: 'Registration successful. Pending admin approval.',
        user: newUserResult.rows[0]
    });

  } catch (error) {
    console.error('Registration Error:', error);
    res.status(500).json({ error: 'Internal server error during registration pipeline.' });
  }
};

// ---------------------------------------------------------
// 2. AUTHENTICATION & LOGIN WORKFLOW
// ---------------------------------------------------------
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // A. Locate the user identity in the real database
    const userResult = await pool.query(
        'SELECT user_id, email, password_hash, role, unit_id FROM users WHERE email = $1',
        [email]
    );

    if (userResult.rows.length === 0) {
      // Use generic errors to prevent attackers from knowing which emails exist
      return res.status(401).json({ error: 'Invalid authorization credentials.' });
    }

    const user = userResult.rows[0];

    // B. Security Checkpoint: Is the account approved?
    // Note: We bypass this check if the user is an admin so you can log in right now!
    if (user.role === 'Pending') {
      return res.status(403).json({ error: 'Account is pending corporate compliance approval.' });
    }

    // C. Password Verification
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid authorization credentials.' });
    }

    // D. Generate the Cryptographic Session Key (JWT)
    const payload = {
      user_id: user.user_id,
      role: user.role,
      email: user.email,
      unit_id: user.unit_id // Injects the multi-tenant routing ID directly into the token
    };

    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod', 
      { expiresIn: '24h' }
    );

    // E. Transmit the token and safe profile data back to the React frontend
    res.status(200).json({
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        unit_id: user.unit_id
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during authentication sequence.' });
  }
};