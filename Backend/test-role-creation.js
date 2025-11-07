'use strict';

// Set test environment
process.env.NODE_ENV = 'test';

const { initialize: initializeModels } = require('./src/models');

async function testRoleCreation() {
  try {
    console.log('Testing AdminRole creation...');
    
    // Initialize models first
    await initializeModels();
    console.log('Models initialized');
    
    // Import models after initialization
    const { AdminRole } = require('./src/models');
    
    const role = await AdminRole.create({
      name: 'analyst',
      display_name: 'Test Admin',
      permissions: ['*'],
      level: 10,
    });
    
    console.log('Role created successfully:', role.id);
    
    await role.destroy();
    console.log('Role destroyed successfully');
    
    process.exit(0);
  } catch (error) {
    console.error('Error creating role:', error);
    process.exit(1);
  }
}

testRoleCreation();