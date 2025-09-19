const database = require('../database/database');

async function initializeDatabase() {
    try {
        console.log('🔄 Initializing ZONORG database...');
        
        await database.init();
        
        console.log('✅ Database initialized successfully!');
        console.log('📊 Database schema created');
        console.log('🔧 Indexes created for optimal performance');
        console.log('👁️  Views created for complex queries');
        
        // Create some sample data for testing (optional)
        console.log('\n🌱 Database is ready for farming adventures!');
        
        database.close();
        
    } catch (error) {
        console.error('❌ Database initialization failed:', error);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    initializeDatabase();
}

module.exports = initializeDatabase;