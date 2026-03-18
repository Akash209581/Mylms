// Test database connection with alternative configurations
require('dotenv').config();
const { Client } = require('pg');

async function testConnections() {
  // Test 1: Original pooler connection
  console.log('Test 1: Pooler connection');
  const poolerUrl = process.env.DATABASE_URL;
  console.log('URL:', poolerUrl.replace(/:[^:]*@/, ':****@'));
  
  try {
    const client1 = new Client({
      connectionString: poolerUrl,
      ssl: { rejectUnauthorized: false }
    });
    await client1.connect();
    console.log('✅ Pooler connection successful\n');
    await client1.end();
  } catch (err) {
    console.log('❌ Pooler connection failed:', err.message, '\n');
  }

  // Test 2: Direct connection (without pooler)
  console.log('Test 2: Direct endpoint connection');
  const directUrl = poolerUrl.replace('-pooler.c-4', '.c-4');
  console.log('URL:', directUrl.replace(/:[^:]*@/, ':****@'));
  
  try {
    const client2 = new Client({
      connectionString: directUrl,
      ssl: { rejectUnauthorized: false }
    });
    await client2.connect();
    console.log('✅ Direct connection successful\n');
    await client2.end();
  } catch (err) {
    console.log('❌ Direct connection failed:', err.message, '\n');
  }

  // Test 3: Without channel_binding
  console.log('Test 3: Without channel_binding');
  const noChannelUrl = poolerUrl.replace('&channel_binding=require', '');
  console.log('URL:', noChannelUrl.replace(/:[^:]*@/, ':****@'));
  
  try {
    const client3 = new Client({
      connectionString: noChannelUrl,
      ssl: { rejectUnauthorized: false }
    });
    await client3.connect();
    console.log('✅ Connection without channel_binding successful\n');
    await client3.end();
  } catch (err) {
    console.log('❌ Connection without channel_binding failed:', err.message, '\n');
  }
}

testConnections().catch(console.error);
