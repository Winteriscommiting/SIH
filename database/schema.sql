-- ZONORG Farming Game Database Schema
-- SQLite Database for User Management and Game Data

-- Users table for authentication and profile data
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    display_name VARCHAR(100),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME,
    is_active BOOLEAN DEFAULT 1,
    farm_level INTEGER DEFAULT 1,
    total_coins INTEGER DEFAULT 100,
    total_xp INTEGER DEFAULT 0,
    sustainability_rating VARCHAR(20) DEFAULT 'Beginner',
    organic_certified BOOLEAN DEFAULT 0
);

-- Game saves table for storing player progress
CREATE TABLE IF NOT EXISTS game_saves (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    save_name VARCHAR(100) DEFAULT 'Auto Save',
    game_state TEXT NOT NULL, -- JSON string of complete game state
    plots_data TEXT NOT NULL, -- JSON string of plots array
    camera_data TEXT NOT NULL, -- JSON string of camera position
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    is_auto_save BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Achievements table for tracking player accomplishments
CREATE TABLE IF NOT EXISTS achievements (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    achievement_type VARCHAR(50) NOT NULL,
    achievement_name VARCHAR(100) NOT NULL,
    description TEXT,
    earned_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    points INTEGER DEFAULT 0,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Leaderboard entries for competitive features
CREATE TABLE IF NOT EXISTS leaderboard (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    username VARCHAR(50) NOT NULL,
    category VARCHAR(50) NOT NULL, -- 'total_coins', 'sustainability', 'level', etc.
    score INTEGER NOT NULL,
    rank_position INTEGER,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Farm statistics for detailed analytics
CREATE TABLE IF NOT EXISTS farm_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    stat_name VARCHAR(50) NOT NULL,
    stat_value INTEGER NOT NULL,
    stat_date DATE DEFAULT (date('now')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Sessions table for JWT token management
CREATE TABLE IF NOT EXISTS user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    token_hash TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_used DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(45),
    user_agent TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_game_saves_user_id ON game_saves(user_id);
CREATE INDEX IF NOT EXISTS idx_achievements_user_id ON achievements(user_id);
CREATE INDEX IF NOT EXISTS idx_leaderboard_category ON leaderboard(category, score DESC);
CREATE INDEX IF NOT EXISTS idx_farm_stats_user_date ON farm_stats(user_id, stat_date);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(token_hash);

-- Views for common queries
CREATE VIEW IF NOT EXISTS user_profile AS
SELECT 
    u.id,
    u.username,
    u.email,
    u.display_name,
    u.created_at,
    u.last_login,
    u.farm_level,
    u.total_coins,
    u.total_xp,
    u.sustainability_rating,
    u.organic_certified,
    COUNT(a.id) as total_achievements,
    MAX(gs.updated_at) as last_save_date
FROM users u
LEFT JOIN achievements a ON u.id = a.user_id
LEFT JOIN game_saves gs ON u.id = gs.user_id AND gs.is_auto_save = 1
WHERE u.is_active = 1
GROUP BY u.id;

-- Sustainability leaderboard view
CREATE VIEW IF NOT EXISTS sustainability_leaderboard AS
SELECT 
    u.id,
    u.username,
    u.sustainability_rating,
    u.organic_certified,
    u.farm_level,
    COUNT(a.id) as eco_achievements,
    CASE 
        WHEN u.sustainability_rating = 'Eco Master' THEN 5
        WHEN u.sustainability_rating = 'Green Farmer' THEN 4
        WHEN u.sustainability_rating = 'Eco Enthusiast' THEN 3
        WHEN u.sustainability_rating = 'Learning' THEN 2
        ELSE 1
    END as rating_score
FROM users u
LEFT JOIN achievements a ON u.id = a.user_id AND a.achievement_type = 'sustainability'
WHERE u.is_active = 1
GROUP BY u.id
ORDER BY rating_score DESC, u.organic_certified DESC, eco_achievements DESC, u.farm_level DESC;