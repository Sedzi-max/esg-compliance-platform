const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// ---------------------------------------------------------
// MOCK DATABASE ABSTRACTION
// ---------------------------------------------------------
// For this stage, we will use an in-memory array. 
// When you connect PostgreSQL or MongoDB later, you only need 
// to swap out the logic inside these three helper functions.
const db = {
  users: [],
  findUserByEmail: async (email) => {
    return db.users.find(u => u.email === email);
  },
  createUser: async (user) => {
    db.users.push(user);
    return user;
  }
};

// ---------------------------------------------------------
// 1. REGISTRATION WORKFLOW (PENDING APPROVAL)
// ---------------------------------------------------------
exports.register = async (req, res) => {
  try {
    const { company_name, email, password } = req.body;

    // A. Check if the corporate email is already in the system
    const existingUser = await db.findUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ error: 'An account with this corporate email already exists.' });
    }

    // B. Cryptographically hash the password
    // We use 10 "salt rounds" - enough to stop brute-force attacks but fast enough for good UX.
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // C. Construct the user profile with a strictly locked 'Pending' role
    const newUser = {
      id: 'usr_' + Date.now().toString(),
      company_name,
      email,
      password: hashedPassword, // The plain text password is gone forever
      role: 'Pending', 
      created_at: new Date()
    };

    // D. Save to the database
    await db.createUser(newUser);

    // E. Return the success signal to trigger the frontend's "Application Received" screen
    res.status(201).json({ message: 'Registration successful. Pending admin approval.' });

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

    // A. Locate the user identity
    const user = await db.findUserByEmail(email);
    if (!user) {
      // Use generic errors to prevent attackers from knowing which emails exist
      return res.status(401).json({ error: 'Invalid authorization credentials.' });
    }

    // B. Security Checkpoint: Is the account approved?
    if (user.role === 'Pending') {
      return res.status(403).json({ error: 'Account is pending corporate compliance approval.' });
    }

    // C. Password Verification
    // Bcrypt compares the plain text password against the stored mathematical hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid authorization credentials.' });
    }

    // D. Generate the Cryptographic Session Key (JWT)
    // The payload contains safe data we want the frontend to know about.
    const payload = {
      user_id: user.id,
      role: user.role,
      email: user.email
    };

    // Sign the token using your server's secret vault key.
    // In production, process.env.JWT_SECRET MUST be a long, random string.
    const token = jwt.sign(
      payload, 
      process.env.JWT_SECRET || 'fallback_development_secret_do_not_use_in_prod', 
      { expiresIn: '24h' } // Force re-authentication every 24 hours
    );

    // E. Transmit the token and safe profile data back to the React frontend
    res.status(200).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        company_name: user.company_name
      }
    });

  } catch (error) {
    console.error('Login Error:', error);
    res.status(500).json({ error: 'Internal server error during authentication sequence.' });
  }
};