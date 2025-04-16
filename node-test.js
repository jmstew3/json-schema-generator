const mysql = require('mysql2/promise');

async function testConnection() {
  try {
    const conn = await mysql.createConnection({
      host: 'your-mysql-host',
      user: 'your_user',
      password: 'your_password',
      database: 'your_db',
    });
    await conn.end();
  } catch (err) {
    console.error('❌ Connection failed:', err.message);
  }
}

testConnection();