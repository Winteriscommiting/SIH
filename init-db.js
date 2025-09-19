const Database = require('./database/database.js');

async function initializeDatabase() {
    console.log('🚀 Starting database initialization...');
    
    try {
        const db = new Database();
        
        // Wait a moment for database to initialize
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        console.log('🎉 Database initialization completed successfully!');
        console.log('');
        console.log('📋 Next steps:');
        console.log('1. Run: npm start');
        console.log('2. Open: http://localhost:3000');
        console.log('3. Register a new account or login');
        console.log('');
        
        await db.close();
        process.exit(0);
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error.message);
        process.exit(1);
    }
}

// Run initialization
initializeDatabase();