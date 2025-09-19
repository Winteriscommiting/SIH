const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');

const router = express.Router();

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        // For now, return the user info from token
        // Later you can extend this to get more profile data from database
        
        const gameState = await req.db.loadGameState(req.user.userId);
        
        res.json({
            success: true,
            user: {
                id: req.user.userId,
                username: req.user.username
            },
            gameProgress: gameState ? gameState.metadata : null
        });

    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Failed to get profile' });
    }
});

// Update user profile
router.put('/profile',
    authenticateToken,
    [
        body('displayName').optional().isLength({ max: 100 }).trim().escape(),
        body('email').optional().isEmail().normalizeEmail()
    ],
    async (req, res) => {
        try {
            const errors = validationResult(req);
            if (!errors.isEmpty()) {
                return res.status(400).json({ 
                    error: 'Validation failed', 
                    details: errors.array() 
                });
            }

            // For now, just return success
            // Later you can implement actual profile updates in database
            
            res.json({
                success: true,
                message: 'Profile updated successfully'
            });

        } catch (error) {
            console.error('Profile update error:', error);
            res.status(500).json({ error: 'Failed to update profile' });
        }
    }
);

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const gameState = await req.db.loadGameState(req.user.userId);
        
        if (!gameState) {
            return res.json({
                success: true,
                stats: {
                    level: 1,
                    coins: 100,
                    totalPlanted: 0,
                    totalHarvested: 0,
                    sustainabilityScore: 0
                }
            });
        }

        res.json({
            success: true,
            stats: gameState.metadata
        });

    } catch (error) {
        console.error('Stats error:', error);
        res.status(500).json({ error: 'Failed to get user statistics' });
    }
});

module.exports = router;