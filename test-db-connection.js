// Quick database connection test
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  console.log('🔍 Testing database connection...');
  console.log('📍 Connection URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':***@'));
  console.log('');
  
  try {
    await prisma.$connect();
    console.log('✅ Database connection successful!');
    
    // Test a simple query
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Query test successful:', result);
    
    // Check if we can read from a table
    const userCount = await prisma.user.count();
    console.log(`✅ Can read from database. User count: ${userCount}`);
    
  } catch (error) {
    console.error('❌ Database connection failed!');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'P1001') {
      console.error('');
      console.error('🔧 Troubleshooting steps:');
      console.error('1. Check if Supabase pooler is accessible');
      console.error('2. Verify DATABASE_URL format in .env file');
      console.error('3. Check if password is correct');
      console.error('4. Verify IP restrictions in Supabase dashboard');
      console.error('5. Try using direct connection (port 5432) if pooler is down');
    }
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();


