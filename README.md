# 🌾 ZONORG Farming Game - Database Implementation

A comprehensive database solution for the ZONORG sustainable farming game, featuring user authentication, game saves, achievements, and leaderboards.

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn package manager

### Installation

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Initialize Database**
   ```bash
   npm run init-db
   ```

3. **Start Server**
   ```bash
   npm start
   ```

4. **Access Game**
   - Open browser to: `http://localhost:3000`
   - Game will be available with full database functionality

### Development Mode
```bash
npm run dev  # Uses nodemon for auto-restart
```

## 📊 Database Features

### 🔐 Authentication System
- **User Registration** with email validation
- **Secure Login** with JWT tokens
- **Password Hashing** using bcrypt
- **Session Management** with token expiration
- **Profile Management** with stats tracking

### 💾 Game Data Management
- **Auto-Save** game state to database
- **Multi-slot Saves** (configurable)
- **Game State Persistence** across sessions
- **Plot Data Storage** with full farm layout
- **Camera Position** saving for expanded farms

### 🏆 Achievement System
- **Achievement Tracking** by category
- **Points System** for accomplishments
- **Sustainability Achievements** for eco-farming
- **Progress Badges** and milestones

### 📈 Leaderboards
- **Multiple Categories**: Coins, Farm Level, Sustainability
- **Real-time Rankings** with automatic updates
- **Detailed Sustainability Board** with eco-badges
- **User Position Tracking** across all boards

## 🗄️ Database Schema

### Tables
- **users** - User accounts and profiles
- **game_saves** - Game state and progress data
- **achievements** - User accomplishments
- **leaderboard** - Competitive rankings
- **farm_stats** - Detailed farming analytics
- **user_sessions** - JWT session management

### Views
- **user_profile** - Complete user overview
- **sustainability_leaderboard** - Eco-farming rankings

## 🔧 API Endpoints

### Authentication
```
POST /api/auth/register    # Create new account
POST /api/auth/login       # User authentication
POST /api/auth/logout      # Session termination
GET  /api/auth/profile     # User profile data
GET  /api/auth/verify      # Token validation
```

### Game Data
```
POST /api/game/save        # Save game state
GET  /api/game/load        # Load game state
POST /api/game/achievement # Add achievement
GET  /api/game/achievements # Get user achievements
GET  /api/game/stats       # User statistics
```

### Leaderboards
```
GET /api/leaderboard/:category     # Category leaderboard
GET /api/leaderboard               # All leaderboards
GET /api/leaderboard/sustainability/detailed # Eco leaderboard
```

## 🔄 Migration from localStorage

### Export Existing Data
1. Open browser console on existing game
2. Run the export script:
   ```bash
   npm run migrate export-script
   ```
3. Copy the script output and run in browser console
4. Download the generated JSON file

### Import to Database
1. Place downloaded file as `scripts/migration-data.json`
2. Run migration:
   ```bash
   npm run migrate
   ```

## 🛡️ Security Features

- **Rate Limiting** on API endpoints
- **Input Validation** with express-validator
- **SQL Injection Protection** via parameterized queries
- **Password Hashing** with bcrypt (12 rounds)
- **JWT Token Security** with session tracking
- **CORS Protection** for cross-origin requests
- **Helmet.js** for security headers

## 🌍 Environment Configuration

### Required Environment Variables
```env
# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-secret-key-here
BCRYPT_ROUNDS=12

# Database
DB_PATH=./database/zonorg.db

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
AUTH_RATE_LIMIT_MAX=5
```

## 📁 Project Structure

```
┣━━ 📂 database/
┃   ┣━━ schema.sql      # Database schema
┃   ┣━━ database.js     # Database operations
┃   └━━ zonorg.db       # SQLite database file
┣━━ 📂 routes/
┃   ┣━━ auth.js         # Authentication routes
┃   ┣━━ game.js         # Game data routes
┃   └━━ leaderboard.js  # Leaderboard routes
┣━━ 📂 scripts/
┃   ┣━━ init-database.js # Database initialization
┃   └━━ migrate-data.js  # localStorage migration
┣━━ 📂 js/
┃   └━━ api-client.js    # Frontend API client
┣━━ server.js            # Main application server
┣━━ home.html            # Updated home page
┣━━ farm-game-2d.html    # Game file (to be updated)
└━━ package.json         # Dependencies and scripts
```

## 🧪 Testing

### Health Check
```bash
curl http://localhost:3000/api/health
```

### Test Registration
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"farmer1","email":"farmer1@test.com","password":"password123","confirmPassword":"password123"}'
```

### Test Login
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"farmer1","password":"password123"}'
```

## 🔮 Future Enhancements

### Planned Features
- **Real-time Multiplayer** with Socket.io
- **Cloud Saves** with backup system
- **Advanced Analytics** dashboard
- **Social Features** (friends, sharing)
- **Seasonal Events** with database tracking
- **Mobile App API** compatibility
- **Admin Panel** for user management

### Performance Optimizations
- **Database Indexing** for faster queries
- **Caching Layer** with Redis
- **Connection Pooling** for scalability
- **Background Jobs** for data processing

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Error**
   ```bash
   npm run init-db  # Reinitialize database
   ```

2. **Port Already in Use**
   ```bash
   lsof -ti:3000 | xargs kill  # Kill existing process
   ```

3. **Migration Fails**
   - Check migration-data.json format
   - Ensure no duplicate usernames/emails
   - Verify file permissions

4. **JWT Token Issues**
   - Clear browser localStorage
   - Check JWT_SECRET in .env
   - Verify token expiration settings

### Debug Mode
```bash
DEBUG=true npm run dev
```

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review API documentation
3. Check database logs
4. Verify environment configuration

## 🎮 Game Integration

The database seamlessly integrates with the existing ZONORG farming game:

- **Automatic Sync** - Game state saves automatically
- **Cross-Session** - Continue where you left off
- **Achievement Unlocks** - Real-time achievement tracking
- **Leaderboard Updates** - Competitive features
- **Profile Growth** - Watch your farming empire grow

Start farming sustainably with persistent progress! 🌱🚜