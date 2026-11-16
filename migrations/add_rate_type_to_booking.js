import { sequelize } from "../models/db.js";

const migration = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Bookings');
    
    if (!tableDescription.rateType) {
      await queryInterface.addColumn('Bookings', 'rateType', {
        type: 'ENUM("day", "night", "full")',
        allowNull: true,
        comment: 'For cottages: day, night, or full day+night rate'
      });
      console.log('✓ Added rateType column to Bookings');
    } else {
      console.log('✓ rateType column already exists');
    }
    
    console.log('✓ Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migration();
