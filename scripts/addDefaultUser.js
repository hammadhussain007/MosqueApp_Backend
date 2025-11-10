const env = require('dotenv');
const bcrypt = require('bcryptjs');
const sequelize = require('../config/database');
const User = require('../app/models/User');

env.config();

/**
 * Script to add default users if the users table is empty
 * This script will:
 * 1. Check if any users exist in the database
 * 2. If no users exist, create default admin and regular users
 */

async function addDefaultUser() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync the User model with the database
    console.log('\nSyncing User model with database...');
    await sequelize.sync();
    console.log('User model synced successfully.');

    // Check if any users exist
    console.log('\nChecking for existing users...');
    const userCount = await User.count();
    console.log(`Found ${userCount} users in database.`);

    if (userCount === 0) {
      console.log('\nNo users found. Creating default users...');
      
      // Hash passwords
      const adminPassword = await bcrypt.hash('admin123', 12);
      const userPassword = await bcrypt.hash('user123', 12);
      
      // Create default admin user
      const adminUser = await User.create({
        fullName: 'Admin',
        email: 'admin@mosque.com',
        password: adminPassword,
        role: 'admin'
      });

      // Create default regular user
      const regularUser = await User.create({
        fullName: 'User',
        email: 'user@mosque.com',
        password: userPassword,
        role: 'user'
      });

      console.log('✓ Successfully created default users:');
      console.log('\n  Admin User:');
      console.log('    Email: admin@mosque.com');
      console.log('    Password: admin123');
      console.log('    Role: admin');
      console.log('\n  Regular User:');
      console.log('    Email: user@mosque.com');
      console.log('    Password: user123');
      console.log('    Role: user');
      console.log('\n⚠ IMPORTANT: Please change the default passwords after first login!');
    } else {
      console.log('\n✓ Users already exist in database. No action needed.');
    }

    // Display user summary
    console.log('\n--- User Summary ---');
    const adminUsers = await User.count({ where: { role: 'admin' } });
    const regularUsers = await User.count({ where: { role: 'user' } });
    console.log(`Admin users: ${adminUsers}`);
    console.log(`Regular users: ${regularUsers}`);
    console.log(`Total users: ${adminUsers + regularUsers}`);

    console.log('\n✓ Script completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error:', error);
    process.exit(1);
  }
}

// Run the script
addDefaultUser();
