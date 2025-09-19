const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

class Database {
    constructor() {
        // Create database directory if it doesn't exist
        const dbDir = path.join(__dirname);
        if (!fs.existsSync(dbDir)) {
            fs.mkdirSync(dbDir, { recursive: true });
        }
        
        this.db = new sqlite3.Database(path.join(__dirname, 'zonorg.db'), (err) => {
            if (err) {
                console.error('❌ Database connection failed:', err.message);
            } else {
                console.log('✅ Connected to SQLite database');
                this.initSchema();
            }
        });
    }

    async initSchema() {
        return new Promise((resolve, reject) => {
            try {
                // Read schema file with correct path
                const schemaPath = path.join(__dirname, 'schema.sql');
                console.log('📂 Looking for schema at:', schemaPath);
                
                if (!fs.existsSync(schemaPath)) {
                    console.log('📝 Schema file not found, creating tables directly...');
                    this.createTablesDirectly(resolve, reject);
                    return;
                }
                
                const schema = fs.readFileSync(schemaPath, 'utf8');
                
                this.db.exec(schema, (err) => {
                    if (err) {
                        console.error('❌ Schema initialization failed:', err.message);
                        reject(err);
                    } else {
                        console.log('✅ Database schema initialized successfully');
                        resolve();
                    }
                });
            } catch (error) {
                console.error('❌ Database initialization failed:', error);
                this.createTablesDirectly(resolve, reject);
            }
        });
    }

    createTablesDirectly(resolve, reject) {
        console.log('🔧 Creating database tables directly...');
        
        const tables = [
            // Users table
            `CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username VARCHAR(50) UNIQUE NOT NULL,
                email VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                display_name VARCHAR(100),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                last_login DATETIME,
                is_active BOOLEAN DEFAULT TRUE
            )`,
            
            // Game saves table
            `CREATE TABLE IF NOT EXISTS game_saves (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                save_name VARCHAR(100) DEFAULT 'Auto Save',
                game_data TEXT NOT NULL,
                level INTEGER DEFAULT 1,
                coins INTEGER DEFAULT 100,
                total_planted INTEGER DEFAULT 0,
                total_harvested INTEGER DEFAULT 0,
                sustainability_score INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Achievements table
            `CREATE TABLE IF NOT EXISTS achievements (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                achievement_name VARCHAR(100) NOT NULL,
                achievement_description TEXT,
                category VARCHAR(50) DEFAULT 'farming',
                points INTEGER DEFAULT 0,
                unlocked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, achievement_name)
            )`,
            
            // Leaderboards table
            `CREATE TABLE IF NOT EXISTS leaderboards (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                username VARCHAR(50) NOT NULL,
                category VARCHAR(50) NOT NULL,
                score INTEGER NOT NULL,
                rank_position INTEGER,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                UNIQUE(user_id, category)
            )`,
            
            // Sessions table
            `CREATE TABLE IF NOT EXISTS sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                token VARCHAR(255) UNIQUE NOT NULL,
                expires_at DATETIME NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`,
            
            // Farm analytics table
            `CREATE TABLE IF NOT EXISTS farm_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                metric_name VARCHAR(50) NOT NULL,
                metric_value REAL NOT NULL,
                recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
            )`
        ];

        let completed = 0;
        let hasError = false;

        tables.forEach((sql, index) => {
            this.db.run(sql, (err) => {
                if (err && !hasError) {
                    console.error(`❌ Failed to create table ${index + 1}:`, err.message);
                    hasError = true;
                    reject(err);
                    return;
                }
                
                completed++;
                console.log(`✅ Table ${index + 1}/${tables.length} created successfully`);
                
                if (completed === tables.length && !hasError) {
                    console.log('🎉 All database tables created successfully!');
                    resolve();
                }
            });
        });
    }

    // User management methods
    async createUser(username, email, password, displayName = null) {
        return new Promise((resolve, reject) => {
            const hashedPassword = bcrypt.hashSync(password, 10);
            
            const sql = `INSERT INTO users (username, email, password_hash, display_name) 
                         VALUES (?, ?, ?, ?)`;
            
            this.db.run(sql, [username, email, hashedPassword, displayName || username], function(err) {
                if (err) {
                    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                        reject(new Error('Username or email already exists'));
                    } else {
                        reject(err);
                    }
                } else {
                    resolve({ id: this.lastID, username, email });
                }
            });
        });
    }

    async authenticateUser(usernameOrEmail, password) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM users 
                         WHERE (username = ? OR email = ?) AND is_active = TRUE`;
            
            this.db.get(sql, [usernameOrEmail, usernameOrEmail], (err, user) => {
                if (err) {
                    reject(err);
                } else if (!user) {
                    reject(new Error('User not found'));
                } else if (!bcrypt.compareSync(password, user.password_hash)) {
                    reject(new Error('Invalid password'));
                } else {
                    // Update last login
                    this.db.run(`UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = ?`, [user.id]);
                    resolve({ id: user.id, username: user.username, email: user.email, display_name: user.display_name });
                }
            });
        });
    }

    async saveGameState(userId, gameData, metadata = {}) {
        return new Promise((resolve, reject) => {
            const sql = `INSERT OR REPLACE INTO game_saves 
                         (user_id, game_state, plots_data, camera_data, updated_at) 
                         VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)`;
            
            // Extract plots data and camera data from gameData
            const plots = gameData.plots || [];
            const camera = gameData.camera || { x: 0, y: 0, scrollEnabled: false };
            
            this.db.run(sql, [
                userId,
                JSON.stringify(gameData.gameState || {}),
                JSON.stringify(plots),
                JSON.stringify(camera)
            ], function(err) {
                if (err) {
                    reject(err);
                } else {
                    console.log('✅ Game state saved for user:', userId);
                    resolve({ id: this.lastID });
                }
            });
        });
    }

    async loadGameState(userId) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT * FROM game_saves WHERE user_id = ? ORDER BY updated_at DESC LIMIT 1`;
            
            this.db.get(sql, [userId], (err, save) => {
                if (err) {
                    reject(err);
                } else if (!save) {
                    resolve(null);
                } else {
                    try {
                        const gameState = JSON.parse(save.game_state);
                        const plots = JSON.parse(save.plots_data);
                        const camera = JSON.parse(save.camera_data);
                        
                        resolve({
                            gameData: {
                                gameState,
                                plots,
                                camera,
                                // Include other data if needed
                                sustainabilityMetrics: gameState.sustainabilityMetrics || {},
                                weather: gameState.weather || {},
                                season: gameState.season || {}
                            },
                            metadata: {
                                lastSaved: save.updated_at
                            }
                        });
                    } catch (parseErr) {
                        reject(new Error('Invalid game data format'));
                    }
                }
            });
        });
    }

    async getLeaderboard(category = 'coins', limit = 10) {
        return new Promise((resolve, reject) => {
            let sql;
            
            switch(category) {
                case 'coins':
                    sql = `SELECT u.username, u.display_name, gs.coins as score, gs.updated_at
                           FROM users u
                           JOIN game_saves gs ON u.id = gs.user_id
                           ORDER BY gs.coins DESC LIMIT ?`;
                    break;
                case 'level':
                    sql = `SELECT u.username, u.display_name, gs.level as score, gs.updated_at
                           FROM users u
                           JOIN game_saves gs ON u.id = gs.user_id
                           ORDER BY gs.level DESC LIMIT ?`;
                    break;
                case 'sustainability':
                    sql = `SELECT u.username, u.display_name, gs.sustainability_score as score, gs.updated_at
                           FROM users u
                           JOIN game_saves gs ON u.id = gs.user_id
                           ORDER BY gs.sustainability_score DESC LIMIT ?`;
                    break;
                default:
                    reject(new Error('Invalid leaderboard category'));
                    return;
            }
            
            this.db.all(sql, [limit], (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows.map((row, index) => ({
                        rank: index + 1,
                        username: row.display_name || row.username,
                        score: row.score,
                        lastUpdated: row.updated_at
                    })));
                }
            });
        });
    }

    close() {
        return new Promise((resolve) => {
            this.db.close((err) => {
                if (err) {
                    console.error('❌ Error closing database:', err.message);
                } else {
                    console.log('✅ Database connection closed');
                }
                resolve();
            });
        });
    }
}

module.exports = Database;