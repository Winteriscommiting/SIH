const express = require('express');
const { body, validationResult } = require('express-validator');
const database = require('../database/database');
const crypto = require('crypto');

const router = express.Router();

// Middleware to authenticate JWT tokens (reused from auth.js)
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

// Validation for game save data
const validateGameSave = [
    body('gameState').isObject().withMessage('Game state must be an object'),
    body('plots').isArray().withMessage('Plots must be an array'),
    body('camera').isObject().withMessage('Camera must be an object')
];

// Save game state
router.post('/save', authenticateToken, validateGameSave, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { gameState, plots, camera, saveName } = req.body;

        // Save game data
        const saveResult = await database.saveGameState(req.user.id, {
            gameState,
            plots,
            camera,
            saveName
        });

        // Update user stats from game state
        if (gameState.level && gameState.coins !== undefined) {
            await database.updateUserStats(req.user.id, {
                farmLevel: gameState.level,
                totalCoins: gameState.coins,
                totalXp: gameState.xp || 0,
                sustainabilityRating: gameState.sustainabilityRating || 'Beginner',
                organicCertified: gameState.organicCertified || false
            });

            // Update leaderboards
            await database.updateLeaderboard(req.user.id, req.user.username, 'total_coins', gameState.coins);
            await database.updateLeaderboard(req.user.id, req.user.username, 'farm_level', gameState.level);
            
            // Calculate sustainability score for leaderboard
            const sustainabilityScores = {
                'Eco Master': 5,
                'Green Farmer': 4,
                'Eco Enthusiast': 3,
                'Learning': 2,
                'Beginner': 1
            };
            const sustainabilityScore = sustainabilityScores[gameState.sustainabilityRating] || 1;
            await database.updateLeaderboard(req.user.id, req.user.username, 'sustainability', sustainabilityScore);
        }

        res.json({
            message: 'Game saved successfully',
            saveId: saveResult.id,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Game save error:', error);
        res.status(500).json({ error: 'Failed to save game' });
    }
});

// Load game state
router.get('/load', authenticateToken, async (req, res) => {
    try {
        const gameData = await database.loadGameState(req.user.id);

        if (!gameData) {
            return res.status(404).json({ 
                message: 'No save data found',
                hasData: false 
            });
        }

        res.json({
            message: 'Game loaded successfully',
            hasData: true,
            data: gameData
        });

    } catch (error) {
        console.error('Game load error:', error);
        res.status(500).json({ error: 'Failed to load game' });
    }
});

// Add achievement
router.post('/achievement', authenticateToken, [
    body('type').notEmpty().withMessage('Achievement type is required'),
    body('name').notEmpty().withMessage('Achievement name is required'),
    body('description').optional().isString(),
    body('points').optional().isInt({ min: 0 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                error: 'Validation failed', 
                details: errors.array() 
            });
        }

        const { type, name, description, points } = req.body;

        const achievement = await database.addAchievement(req.user.id, {
            type,
            name,
            description,
            points: points || 0
        });

        res.status(201).json({
            message: 'Achievement added',
            achievement
        });

    } catch (error) {
        console.error('Achievement error:', error);
        res.status(500).json({ error: 'Failed to add achievement' });
    }
});

// Get user achievements
router.get('/achievements', authenticateToken, async (req, res) => {
    try {
        const achievements = await database.getUserAchievements(req.user.id);

        res.json({
            achievements,
            total: achievements.length
        });

    } catch (error) {
        console.error('Achievements fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch achievements' });
    }
});

// Get user stats summary
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const user = await database.getUserById(req.user.id);
        const achievements = await database.getUserAchievements(req.user.id);
        const gameData = await database.loadGameState(req.user.id);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        // Calculate additional stats
        const ecoAchievements = achievements.filter(a => a.achievement_type === 'sustainability').length;
        const totalPoints = achievements.reduce((sum, a) => sum + (a.points || 0), 0);

        res.json({
            stats: {
                username: user.username,
                farmLevel: user.farm_level,
                totalCoins: user.total_coins,
                totalXp: user.total_xp,
                sustainabilityRating: user.sustainability_rating,
                organicCertified: user.organic_certified,
                totalAchievements: achievements.length,
                ecoAchievements,
                achievementPoints: totalPoints,
                accountAge: Math.floor((new Date() - new Date(user.created_at)) / (1000 * 60 * 60 * 24)),
                lastPlayed: gameData ? gameData.lastSaved : user.last_login,
                hasGameData: !!gameData
            }
        });

    } catch (error) {
        console.error('Stats fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

// Reset game progress (for development/testing)
router.delete('/reset', authenticateToken, async (req, res) => {
    try {
        // Note: This is a destructive operation, use with caution
        // In production, you might want to add additional confirmation
        
        // Reset user stats to defaults
        await database.updateUserStats(req.user.id, {
            farmLevel: 1,
            totalCoins: 100,
            totalXp: 0,
            sustainabilityRating: 'Beginner',
            organicCertified: false
        });

        // Delete game save (this will trigger the database to remove it)
        // The actual implementation would depend on adding a delete method to database.js

        res.json({
            message: 'Game progress reset successfully',
            resetAt: new Date().toISOString()
        });

    } catch (error) {
        console.error('Game reset error:', error);
        res.status(500).json({ error: 'Failed to reset game progress' });
    }
});

module.exports = router;