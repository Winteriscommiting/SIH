require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Check if database directory exists, create if needed
const dbDir = path.join(__dirname, 'database');
if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
}

const routesDir = path.join(__dirname, 'database', 'routes');
if (!fs.existsSync(routesDir)) {
    fs.mkdirSync(routesDir, { recursive: true });
}

// Initialize database
let db;
try {
    const Database = require('./database/database');
    db = new Database();
} catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    console.log('📋 Please run: npm run init-db');
    process.exit(1);
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"]
        }
    }
}));

app.use(cors({
    origin: process.env.FRONTEND_URL || `http://localhost:${PORT}`,
    credentials: true
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Make database available to routes
app.use((req, res, next) => {
    req.db = db;
    next();
});

// Static files
app.use(express.static(__dirname));
app.use(express.static(path.join(__dirname, 'public')));

// Load API routes (with error handling)
try {
    const authRoutes = require('./database/routes/auth');
    const gameRoutes = require('./database/routes/game');
    const userRoutes = require('./database/routes/users');
    
    app.use('/api/auth', authRoutes);
    app.use('/api/game', gameRoutes);
    app.use('/api/users', userRoutes);
    
    console.log('✅ API routes loaded successfully');
} catch (error) {
    console.error('❌ Failed to load API routes:', error.message);
    console.log('📋 Some routes may not be available');
}

// Serve the home page
app.get('/', (req, res) => {
    const homePath = path.join(__dirname, 'home.html');
    if (fs.existsSync(homePath)) {
        res.sendFile(homePath);
    } else {
        res.send(`
            <h1>ZONORG Farming Game</h1>
            <p>Welcome to the sustainable farming game!</p>
            <p>Home page not found. Please create home.html file.</p>
            <a href="/game">Play Game</a>
        `);
    }
});

// Serve the game page
app.get('/game', (req, res) => {
    const gamePath = path.join(__dirname, 'farm-game-2d-simple.html');
    if (fs.existsSync(gamePath)) {
        res.sendFile(gamePath);
    } else {
        res.send(`
            <h1>Game Not Found</h1>
            <p>Please create farm-game-2d-simple.html file.</p>
            <a href="/">Back to Home</a>
        `);
    }
});

// Serve the farm game directly as well
app.get('/farm-game-2d-simple.html', (req, res) => {
    const gamePath = path.join(__dirname, 'farm-game-2d-simple.html');
    if (fs.existsSync(gamePath)) {
        res.sendFile(gamePath);
    } else {
        res.send(`
            <h1>Game Not Found</h1>
            <p>Please create farm-game-2d-simple.html file.</p>
            <a href="/">Back to Home</a>
        `);
    }
});

// Keep backward compatibility for old route
app.get('/farm-game-2d.html', (req, res) => {
    res.redirect('/game');
});

// Serve the home page directly as well
app.get('/home.html', (req, res) => {
    const homePath = path.join(__dirname, 'home.html');
    if (fs.existsSync(homePath)) {
        res.sendFile(homePath);
    } else {
        res.status(404).send('Home file not found');
    }
});

// Test endpoint
app.get('/api/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'ZONORG API is working!',
        timestamp: new Date().toISOString()
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err.stack);
    res.status(500).json({ error: 'Internal server error' });
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down server...');
    if (db && db.close) {
        await db.close();
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down server...');
    if (db && db.close) {
        await db.close();
    }
    process.exit(0);
});

app.listen(PORT, () => {
    console.log('🌾 ZONORG Farming Game Server Started');
    console.log(`🚀 Server running at: http://localhost:${PORT}`);
    console.log(`📱 API endpoints available at: http://localhost:${PORT}/api/`);
    console.log('');
    console.log('📋 Available endpoints:');
    console.log(`   🏠 Home: http://localhost:${PORT}`);
    console.log(`   🎮 Game: http://localhost:${PORT}/game`);
    console.log(`   🔐 Auth API: http://localhost:${PORT}/api/auth/*`);
    console.log(`   💾 Game API: http://localhost:${PORT}/api/game/*`);
    console.log(`   👤 User API: http://localhost:${PORT}/api/users/*`);
    console.log(`   🧪 Test API: http://localhost:${PORT}/api/test`);
    console.log('');
});