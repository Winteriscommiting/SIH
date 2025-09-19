// ZONORG Game API Client
// Handles all communication with the backend database

class GameAPI {
    constructor() {
        this.baseURL = window.location.origin + '/api';
        this.token = localStorage.getItem('zonorg_token');
    }

    // Helper method to make API calls
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        // Add auth token if available
        if (this.token) {
            config.headers['Authorization'] = `Bearer ${this.token}`;
        }

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `HTTP ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        const response = await this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });

        if (response.token) {
            this.token = response.token;
            localStorage.setItem('zonorg_token', this.token);
        }

        return response;
    }

    async login(credentials) {
        const response = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify(credentials)
        });

        if (response.token) {
            this.token = response.token;
            localStorage.setItem('zonorg_token', this.token);
        }

        return response;
    }

    async logout() {
        try {
            await this.request('/auth/logout', { method: 'POST' });
        } catch (error) {
            console.warn('Logout request failed:', error);
        } finally {
            this.token = null;
            localStorage.removeItem('zonorg_token');
        }
    }

    async getProfile() {
        return await this.request('/auth/profile');
    }

    async verifyToken() {
        try {
            return await this.request('/auth/verify');
        } catch (error) {
            // Token is invalid, remove it
            this.token = null;
            localStorage.removeItem('zonorg_token');
            throw error;
        }
    }

    // Game data methods
    async saveGame(gameData) {
        return await this.request('/game/save', {
            method: 'POST',
            body: JSON.stringify(gameData)
        });
    }

    async loadGame() {
        return await this.request('/game/load');
    }

    async addAchievement(achievementData) {
        return await this.request('/game/achievement', {
            method: 'POST',
            body: JSON.stringify(achievementData)
        });
    }

    async getAchievements() {
        return await this.request('/game/achievements');
    }

    async getStats() {
        return await this.request('/game/stats');
    }

    // Leaderboard methods
    async getLeaderboard(category, limit = 10) {
        return await this.request(`/leaderboard/${category}?limit=${limit}`);
    }

    async getAllLeaderboards() {
        return await this.request('/leaderboard');
    }

    async getSustainabilityLeaderboard() {
        return await this.request('/leaderboard/sustainability/detailed');
    }

    // Utility methods
    isLoggedIn() {
        return !!this.token;
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    // Migration helper - convert localStorage data to database
    async migrateLocalStorageData() {
        try {
            // Check for existing localStorage data
            const localUsers = localStorage.getItem('zonorgUsers');
            const localUser = localStorage.getItem('zonorgUser');
            const farmGameSave = localStorage.getItem('farmGameSave');

            if (!localUsers && !localUser && !farmGameSave) {
                return { migrated: false, reason: 'No local data found' };
            }

            const migrationData = {
                hasUsers: !!localUsers,
                hasCurrentUser: !!localUser,
                hasGameSave: !!farmGameSave,
                users: localUsers ? JSON.parse(localUsers) : null,
                currentUser: localUser ? JSON.parse(localUser) : null,
                gameSave: farmGameSave ? JSON.parse(farmGameSave) : null
            };

            // This would be handled by a migration endpoint
            // For now, we'll just return the data for manual processing
            return { migrated: false, migrationData };

        } catch (error) {
            console.error('Migration check failed:', error);
            return { migrated: false, error: error.message };
        }
    }
}

// Global API instance
window.gameAPI = new GameAPI();

// Export for use in Node.js if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GameAPI;
}