const fs = require('fs');
const path = require('path');
const database = require('../database/database');
const bcrypt = require('bcrypt');

async function migrateLocalStorageData() {
    console.log('🔄 Starting localStorage to database migration...');
    
    try {
        await database.init();
        
        // Read migration data file (would be created by exporting localStorage)
        const migrationFilePath = path.join(__dirname, '../migration-data.json');
        
        if (!fs.existsSync(migrationFilePath)) {
            console.log('📄 Creating sample migration data file...');
            
            // Create sample data structure
            const sampleData = {
                users: {
                    "farmer1": {
                        username: "farmer1",
                        email: "farmer1@example.com",
                        password: "password123",
                        farmLevel: 3,
                        totalCoins: 500
                    }
                },
                currentUser: {
                    username: "farmer1",
                    email: "farmer1@example.com"
                },
                gameSave: {
                    gameState: {
                        level: 3,
                        coins: 500,
                        xp: 250,
                        sustainabilityRating: "Learning"
                    },
                    plots: [],
                    camera: { x: 0, y: 0 }
                }
            };
            
            fs.writeFileSync(migrationFilePath, JSON.stringify(sampleData, null, 2));
            console.log('📄 Sample migration file created at:', migrationFilePath);
            console.log('📋 To migrate real data:');
            console.log('   1. Export localStorage data from browser');
            console.log('   2. Replace the sample data in migration-data.json');
            console.log('   3. Run this script again');
            return;
        }
        
        const migrationData = JSON.parse(fs.readFileSync(migrationFilePath, 'utf8'));
        let migratedUsers = 0;
        let migratedSaves = 0;
        
        // Migrate users
        if (migrationData.users) {
            console.log('👥 Migrating users...');
            
            for (const [username, userData] of Object.entries(migrationData.users)) {
                try {
                    // Check if user already exists
                    const existingUser = await database.getUserByUsername(username);
                    if (existingUser) {
                        console.log(`⚠️  User ${username} already exists, skipping...`);
                        continue;
                    }
                    
                    // Hash password
                    const passwordHash = await bcrypt.hash(userData.password || 'defaultpassword', 12);
                    
                    // Create user
                    const newUser = await database.createUser({
                        username: userData.username,
                        email: userData.email,
                        passwordHash,
                        displayName: userData.username
                    });
                    
                    // Update user stats if available
                    if (userData.farmLevel || userData.totalCoins) {
                        await database.updateUserStats(newUser.id, {
                            farmLevel: userData.farmLevel || 1,
                            totalCoins: userData.totalCoins || 100,
                            totalXp: userData.totalXp || 0,
                            sustainabilityRating: userData.sustainabilityRating || 'Beginner',
                            organicCertified: userData.organicCertified || false
                        });
                    }
                    
                    console.log(`✅ Migrated user: ${username}`);
                    migratedUsers++;
                    
                } catch (error) {
                    console.error(`❌ Failed to migrate user ${username}:`, error.message);
                }
            }
        }
        
        // Migrate game save data
        if (migrationData.gameSave && migrationData.currentUser) {
            console.log('💾 Migrating game save data...');
            
            try {
                // Find the user in database
                const user = await database.getUserByUsername(migrationData.currentUser.username);
                if (user) {
                    await database.saveGameState(user.id, {
                        gameState: migrationData.gameSave.gameState || {},
                        plots: migrationData.gameSave.plots || [],
                        camera: migrationData.gameSave.camera || { x: 0, y: 0 }
                    });
                    
                    console.log(`✅ Migrated game save for: ${user.username}`);
                    migratedSaves++;
                } else {
                    console.log('⚠️  Current user not found for game save migration');
                }
            } catch (error) {
                console.error('❌ Failed to migrate game save:', error.message);
            }
        }
        
        console.log('\n🎉 Migration completed!');
        console.log(`👥 Users migrated: ${migratedUsers}`);
        console.log(`💾 Game saves migrated: ${migratedSaves}`);
        
        if (migratedUsers > 0 || migratedSaves > 0) {
            console.log('\n💡 Consider backing up and removing the migration file:');
            console.log(`   mv ${migrationFilePath} ${migrationFilePath}.backup`);
        }
        
    } catch (error) {
        console.error('❌ Migration failed:', error);
    } finally {
        database.close();
    }
}

// Instructions for manual localStorage export
function generateExportScript() {
    const script = `
// Run this script in browser console to export localStorage data
(function() {
    const data = {
        users: JSON.parse(localStorage.getItem('zonorgUsers') || '{}'),
        currentUser: JSON.parse(localStorage.getItem('zonorgUser') || 'null'),
        gameSave: JSON.parse(localStorage.getItem('farmGameSave') || 'null')
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'zonorg-migration-data.json';
    a.click();
    URL.revokeObjectURL(url);
    
    console.log('Migration data exported!');
    console.log('Place the downloaded file as migration-data.json in the scripts folder');
})();
    `;
    
    console.log('\n📋 Browser Export Script:');
    console.log(script);
}

// Run if called directly
if (require.main === module) {
    const command = process.argv[2];
    
    if (command === 'export-script') {
        generateExportScript();
    } else {
        migrateLocalStorageData();
    }
}

module.exports = { migrateLocalStorageData, generateExportScript };