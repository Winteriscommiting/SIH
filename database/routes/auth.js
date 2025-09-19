const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const rateLimit = require('express-rate-limit');

const router = express.Router();

// Auth-specific rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth
    message: { error: 'Too many authentication attempts, please try again later.' }
});

// Register endpoint
router.post('/register', 
    authLimiter,
    [
        body('username').isLength({ min: 3, max: 50 }).trim().escape(),
        body('email').isEmail().normalizeEmail(),
        body('password').isLength({ min: 6 }),
        body('displayName').optional().isLength({ max: 100 }).trim().escape()
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed', 
                    details: errors.array() 
                });
            }

            const { username, email, password, displayName } = req.body;

            // Create user
            const user = await req.db.createUser(username, email, password, displayName);

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.status(201).json({
                success: true,
                message: 'User registered successfully',
                user: { id: user.id, username: user.username, email: user.email },
                token
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(400).json({ 
                error: error.message || 'Registration failed' 
            });
        }
    }
);

// Login endpoint
router.post('/login',
    authLimiter,
    [
        body('usernameOrEmail').notEmpty().trim().escape(),
        body('password').notEmpty()
    ],
    async (req, res) => {
        try {
            // Check validation errors
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed', 
                    details: errors.array() 
                });
            }

            const { usernameOrEmail, password } = req.body;

            // Authenticate user
            const user = await req.db.authenticateUser(usernameOrEmail, password);

            // Generate JWT token
            const token = jwt.sign(
                { userId: user.id, username: user.username },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                user: { id: user.id, username: user.username, email: user.email, display_name: user.display_name },
                token
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(401).json({ 
                error: error.message || 'Login failed' 
            });
        }
    }
);

// Verify token endpoint
router.get('/verify', async (req, res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ error: 'No token provided' });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        res.json({
            success: true,
            user: { id: decoded.userId, username: decoded.username }
        });

    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Logout endpoint (optional - mainly for client-side token removal)
router.post('/logout', (req, res) => {
    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;