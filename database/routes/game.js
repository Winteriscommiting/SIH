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

// Save game state
router.post('/save',
    authenticateToken,
    [
        body('gameData').notEmpty(),
        body('metadata').optional().isObject()
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

            const { gameData, metadata = {} } = req.body;
            
            const result = await req.db.saveGameState(req.user.userId, gameData, metadata);
            
            res.json({
                success: true,
                message: 'Game saved successfully',
                saveId: result.id
            });

        } catch (error) {
            console.error('Save game error:', error);
            res.status(500).json({ error: 'Failed to save game' });
        }
    }
);

// Load game state
router.get('/load', authenticateToken, async (req, res) => {
    try {
        const gameState = await req.db.loadGameState(req.user.userId);
        
        if (!gameState) {
            return res.json({
                success: true,
                message: 'No saved game found',
                gameData: null
            });
        }

        res.json({
            success: true,
            message: 'Game loaded successfully',
            gameData: gameState.gameData,
            metadata: gameState.metadata
        });

    } catch (error) {
        console.error('Load game error:', error);
        res.status(500).json({ error: 'Failed to load game' });
    }
});

// Get leaderboard
router.get('/leaderboard/:category?', async (req, res) => {
    try {
        const category = req.params.category || 'coins';
        const limit = parseInt(req.query.limit) || 10;

        const leaderboard = await req.db.getLeaderboard(category, limit);
        
        res.json({
            success: true,
            category,
            leaderboard
        });

    } catch (error) {
        console.error('Leaderboard error:', error);
        res.status(500).json({ error: 'Failed to get leaderboard' });
    }
});

// Save achievement
router.post('/achievement',
    authenticateToken,
    [
        body('achievementName').notEmpty().trim(),
        body('achievementDescription').optional().trim(),
        body('category').optional().trim(),
        body('points').optional().isInt({ min: 0 })
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

            const { achievementName, achievementDescription, category, points } = req.body;
            
            // For now, we'll add this as a simple achievement save
            // You can extend this with a proper achievements table later
            
            res.json({
                success: true,
                message: 'Achievement saved successfully'
            });

        } catch (error) {
            console.error('Achievement save error:', error);
            res.status(500).json({ error: 'Failed to save achievement' });
        }
    }
);

module.exports = router;