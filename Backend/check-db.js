const { sequelize, SubscriptionRequest } = require('./src/models');

async function checkDatabase() {
  try {
    console.log('Checking database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connected');

    console.log('Checking if SubscriptionRequest table exists...');
    const tableExists = await sequelize.getQueryInterface().tableExists('subscription_requests');
    console.log(`Table exists: ${tableExists}`);

    if (!tableExists) {
      console.log('Creating table manually...');
      await SubscriptionRequest.sync({ force: true });
      console.log('✅ Table created');
    } else {
      console.log('✅ Table already exists');
    }

    console.log('Testing SubscriptionRequest model...');
    const count = await SubscriptionRequest.count();
    console.log(`SubscriptionRequest count: ${count}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

checkDatabase();