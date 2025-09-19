const express = require('express');
const database = require('../database/database');

const router = express.Router();

// Get leaderboard by category
router.get('/:category', async (req, res) => {
    try {
        const { category } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        const validCategories = ['total_coins', 'farm_level', 'sustainability'];

        if (!validCategories.includes(category)) {
            return res.status(400).json({ 
                error: 'Invalid category',
                validCategories 
            });
        }

        if (limit > 100) {
            return res.status(400).json({ error: 'Limit cannot exceed 100' });
        }

        const leaderboard = await database.getLeaderboard(category, limit);

        // Add category-specific formatting
        const formattedLeaderboard = leaderboard.map(entry => {
            let formattedScore = entry.score;
            let displayName = '';

            switch (category) {
                case 'total_coins':
                    formattedScore = `${entry.score.toLocaleString()} coins`;
                    displayName = '💰 Coin Masters';
                    break;
                case 'farm_level':
                    formattedScore = `Level ${entry.score}`;
                    displayName = '🏆 Top Farmers';
                    break;
                case 'sustainability':
                    const ratings = ['', 'Beginner', 'Learning', 'Eco Enthusiast', 'Green Farmer', 'Eco Master'];
                    formattedScore = ratings[entry.score] || 'Unknown';
                    displayName = '🌱 Eco Champions';
                    break;
            }

            return {
                rank: entry.rank_position,
                username: entry.username,
                score: entry.score,
                formattedScore,
                updatedAt: entry.updated_at
            };
        });

        res.json({
            category,
            displayName: formattedLeaderboard[0]?.displayName || 'Leaderboard',
            entries: formattedLeaderboard,
            total: formattedLeaderboard.length,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Leaderboard fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboard' });
    }
});

// Get all leaderboards (summary)
router.get('/', async (req, res) => {
    try {
        const categories = ['total_coins', 'farm_level', 'sustainability'];
        const leaderboards = {};

        for (const category of categories) {
            const data = await database.getLeaderboard(category, 5); // Top 5 for summary
            leaderboards[category] = data.map(entry => ({
                rank: entry.rank_position,
                username: entry.username,
                score: entry.score,
                updatedAt: entry.updated_at
            }));
        }

        res.json({
            message: 'Leaderboards summary',
            leaderboards,
            categories: [
                { key: 'total_coins', name: '💰 Coin Masters', description: 'Players with the most coins earned' },
                { key: 'farm_level', name: '🏆 Top Farmers', description: 'Highest level farmers' },
                { key: 'sustainability', name: '🌱 Eco Champions', description: 'Most sustainable farming practices' }
            ],
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Leaderboards summary error:', error);
        res.status(500).json({ error: 'Failed to fetch leaderboards' });
    }
});

// Get sustainability leaderboard with detailed info
router.get('/sustainability/detailed', async (req, res) => {
    try {
        // This would use the sustainability_leaderboard view from the schema
        // For now, we'll simulate it with a custom query
        const limit = parseInt(req.query.limit) || 10;

        const sustainabilityLeaderboard = await database.getLeaderboard('sustainability', limit);

        const detailedEntries = sustainabilityLeaderboard.map(entry => {
            const ratings = ['', 'Beginner', 'Learning', 'Eco Enthusiast', 'Green Farmer', 'Eco Master'];
            const rating = ratings[entry.score] || 'Unknown';
            
            // Determine badges based on score
            const badges = [];
            if (entry.score >= 5) badges.push('🏆 Eco Master');
            if (entry.score >= 4) badges.push('🌿 Green Farmer');
            if (entry.score >= 3) badges.push('♻️ Eco Enthusiast');

            return {
                rank: entry.rank_position,
                username: entry.username,
                sustainabilityRating: rating,
                score: entry.score,
                badges,
                updatedAt: entry.updated_at
            };
        });

        res.json({
            category: 'sustainability_detailed',
            displayName: '🌍 Sustainability Hall of Fame',
            description: 'Champions of eco-friendly farming practices',
            entries: detailedEntries,
            total: detailedEntries.length,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('Detailed sustainability leaderboard error:', error);
        res.status(500).json({ error: 'Failed to fetch detailed sustainability leaderboard' });
    }
});

// Get user's position in leaderboards
router.get('/user/:userId/position', async (req, res) => {
    try {
        const { userId } = req.params;
        const categories = ['total_coins', 'farm_level', 'sustainability'];
        const positions = {};

        for (const category of categories) {
            // Get full leaderboard to find user position
            const fullLeaderboard = await database.getLeaderboard(category, 1000);
            const userEntry = fullLeaderboard.find(entry => entry.user_id === parseInt(userId));
            
            if (userEntry) {
                positions[category] = {
                    rank: userEntry.rank_position,
                    score: userEntry.score,
                    totalPlayers: fullLeaderboard.length
                };
            } else {
                positions[category] = {
                    rank: null,
                    score: 0,
                    totalPlayers: fullLeaderboard.length
                };
            }
        }

        res.json({
            userId: parseInt(userId),
            positions,
            lastUpdated: new Date().toISOString()
        });

    } catch (error) {
        console.error('User position fetch error:', error);
        res.status(500).json({ error: 'Failed to fetch user leaderboard positions' });
    }
});

module.exports = router;