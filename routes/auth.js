const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const crypto = require('crypto');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

// Middleware to authenticate JWT tokens
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    try {
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const session = await database.validateSession(tokenHash);
        
        if (!session) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }

        req.user = {
            id: session.user_id,
            username: session.username,
            email: session.email
        };
        next();
    } catch (error) {
        console.error('Token validation error:', error);
        res.status(403).json({ error: 'Invalid token' });
    }
};

// Validation middleware
const validateRegistration = [
    body('username')
        .isLength({ min: 3, max: 50 })
        .matches(/^[a-zA-Z0-9_]+$/)
        .withMessage('Username must be 3-50 characters and contain only letters, numbers, and underscores'),
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Please provide a valid email address'),
    body('password')
        .isLength({ min: 6 })
        .withMessage('Password must be at least 6 characters long'),
    body('confirmPassword')
        .custom((value, { req }) => {
            if (value !== req.body.password) {
                throw new Error('Password confirmation does not match password');
            }
            return true;
        })
];

const validateLogin = [
    body('username').notEmpty().withMessage('Username or email is required'),
    body('password').notEmpty().withMessage('Password is required')
];

// Register new user
router.post('/register', validateRegistration, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { username, email, password, displayName } = req.body;

        // Check if user already exists
        const existingUserByEmail = await database.getUserByEmail(email);
        if (existingUserByEmail) {
            return res.status(409).json({ error: 'Email already registered' });
        }

        const existingUserByUsername = await database.getUserByUsername(username);
        if (existingUserByUsername) {
            return res.status(409).json({ error: 'Username already taken' });
        }

        // Hash password
        const saltRounds = 12;
        const passwordHash = await bcrypt.hash(password, saltRounds);

        // Create user
        const newUser = await database.createUser({
            username,
            email,
            passwordHash,
            displayName: displayName || username
        });

        // Generate JWT token
        const token = jwt.sign(
            { userId: newUser.id, username: newUser.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Create session
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await database.createSession(
            newUser.id, 
            tokenHash, 
            expiresAt, 
            req.ip, 
            req.get('User-Agent')
        );

        res.status(201).json({
            message: 'Registration successful',
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
                displayName: newUser.displayName
            },
            token
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// Login user
router.post('/login', validateLogin, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { username, password } = req.body;

        // Find user by username or email
        let user = await database.getUserByUsername(username);
        if (!user) {
            user = await database.getUserByEmail(username);
        }

        if (!user) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Verify password
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        // Update last login
        await database.updateUserLogin(user.id);

        // Generate JWT token
        const token = jwt.sign(
            { userId: user.id, username: user.username },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES_IN }
        );

        // Create session
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
        await database.createSession(
            user.id, 
            tokenHash, 
            expiresAt, 
            req.ip, 
            req.get('User-Agent')
        );

        res.json({
            message: 'Login successful',
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                farmLevel: user.farm_level,
                totalCoins: user.total_coins,
                totalXp: user.total_xp,
                sustainabilityRating: user.sustainability_rating,
                organicCertified: user.organic_certified
            },
            token
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});

// Logout user
router.post('/logout', authenticateToken, async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (token) {
            const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
            await database.revokeSession(tokenHash);
        }

        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Logout failed' });
    }
});

// Get current user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await database.getUserById(req.user.id);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const achievements = await database.getUserAchievements(req.user.id);

        res.json({
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                displayName: user.display_name,
                farmLevel: user.farm_level,
                totalCoins: user.total_coins,
                totalXp: user.total_xp,
                sustainabilityRating: user.sustainability_rating,
                organicCertified: user.organic_certified,
                createdAt: user.created_at,
                lastLogin: user.last_login,
                totalAchievements: user.total_achievements,
                lastSaveDate: user.last_save_date
            },
            achievements
        });
    } catch (error) {
        console.error('Profile fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch profile' });
    }
});

// Verify token (for frontend to check if user is still logged in)
router.get('/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: {
            id: req.user.id,
            username: req.user.username,
            email: req.user.email
        }
    });
});

module.exports = router;