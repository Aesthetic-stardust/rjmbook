import { sequelize } from "../models/db.js";

const migration = async () => {
  try {
    const queryInterface = sequelize.getQueryInterface();
    
    // Check if column already exists
    const tableDescription = await queryInterface.describeTable('Bookings');
    
    if (!tableDescription.earlyCheckoutDate) {
      await queryInterface.addColumn('Bookings', 'earlyCheckoutDate', {
        type: 'DATE',
        allowNull: true
      });
      console.log('✓ Added earlyCheckoutDate column to Bookings');
    } else {
      console.log('✓ earlyCheckoutDate column already exists');
    }
    
    console.log('✓ Migration completed successfully');
  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    process.exit(0);
  }
};

migration();
