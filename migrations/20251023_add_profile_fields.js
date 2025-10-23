const { DataTypes } = require('sequelize');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    try {
      // Add new columns one by one to handle cases where some might already exist
      const columns = ['phone', 'address', 'avatar'];
      
      for (const column of columns) {
        try {
          await queryInterface.addColumn('users', column, {
            type: column === 'address' ? DataTypes.TEXT : DataTypes.STRING,
            allowNull: true
          });
        } catch (error) {
          // If column already exists, continue with next one
          console.log(`Column ${column} might already exist:`, error.message);
        }
      }
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    try {
      // Remove columns in reverse order
      const columns = ['avatar', 'address', 'phone'];
      
      for (const column of columns) {
        try {
          await queryInterface.removeColumn('users', column);
        } catch (error) {
          console.log(`Error removing column ${column}:`, error.message);
        }
      }
    } catch (error) {
      console.error('Migration rollback failed:', error);
      throw error;
    }
  }
};