import { sequelize } from "../models/db.js";

const migration = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if columns already exist
    const tableDescription = await queryInterface.describeTable('RoomTypes');
    
    if (!tableDescription.isAvailable) {
      await queryInterface.addColumn('RoomTypes', 'isAvailable', {
        type: 'BOOLEAN',
        defaultValue: true,
        allowNull: false
      });
      console.log('✓ Added isAvailable column to RoomTypes');
    }
    
    if (!tableDescription.unavailableReason) {
      await queryInterface.addColumn('RoomTypes', 'unavailableReason', {
        type: 'VARCHAR(255)',
        allowNull: true
      });
      console.log('✓ Added unavailableReason column to RoomTypes');
    }
    
    console.log('✓ Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migration();
