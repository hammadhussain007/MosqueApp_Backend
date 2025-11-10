const env = require('dotenv');
const sequelize = require('../config/database');
const User = require('../app/models/User');

env.config();

/**
 * Script to add 'role' column to users table and set admin role for admin@mosque.com
 * This script will:
 * 1. Add the 'role' column if it doesn't exist (via sequelize.sync with alter)
 * 2. Set all existing users to 'user' role by default
 * 3. Set admin@mosque.com to 'admin' role
 */

async function updateUserRoles() {
  try {
    console.log('Connecting to database...');
    await sequelize.authenticate();
    console.log('Database connection established successfully.');

    // Sync the User model with the database (this will add the 'role' column)
    console.log('\nSyncing User model with database...');
    await sequelize.sync({ alter: true });
    console.log('User model synced successfully.');

    // Update all existing users to have 'user' role if role is null
    console.log('\nUpdating existing users with default "user" role...');
    const [updatedCount] = await User.update(
      { role: 'user' },
      { where: { role: null } }
    );
    console.log(`Updated ${updatedCount} users with default "user" role.`);

    // Set admin@mosque.com to admin role
    console.log('\nSetting admin@mosque.com as admin...');
    const adminUser = await User.findOne({ where: { email: 'admin@mosque.com' } });
    
    if (adminUser) {
      adminUser.role = 'admin';
      await adminUser.save();
      console.log('✓ Successfully set admin@mosque.com as admin.');
    } else {
      console.log('⚠ Warning: admin@mosque.com user not found in database.');
      console.log('  The admin user will need to be created manually or will get admin role when created.');
    }

    // Display final user roles summary
    console.log('\n--- User Roles Summary ---');
    const adminUsers = await User.count({ where: { role: 'admin' } });
    const regularUsers = await User.count({ where: { role: 'user' } });
    console.log(`Admin users: ${adminUsers}`);
    console.log(`Regular users: ${regularUsers}`);
    console.log(`Total users: ${adminUsers + regularUsers}`);

    console.log('\n✓ Database update completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error updating database:', error);
    process.exit(1);
  }
}

// Run the update
updateUserRoles();
