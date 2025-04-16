require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function generateSchemaJson() {
  const connection = await mysql.createConnection(config);

  // Debug log for SQL query and parameters
  console.log('Executing query:', {
    query: `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    params: [config.database],
  });

  const [tables] = await connection.execute(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [config.database]
  );

  // Debug log for SQL query results
  console.log('Tables query result:', tables);

  if (!tables || tables.length === 0) {
    throw new Error('No tables found in the database.');
  }

  // Correctly reference table_name in lowercase
  const schema = [];

  // Update the schema generation logic to include all column details
  for (const table of tables) {
    const tableName = table.table_name; // Use lowercase table_name

    console.log('Processing table:', tableName);

    const [columns] = await connection.execute(
      `SELECT column_name, data_type, is_nullable, column_key, column_type
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?`,
      [config.database, tableName]
    );

    console.log('Fetched columns:', columns);

    schema.push({
      name: tableName,
      primaryKey: columns.find(c => c.column_key === 'PRI')?.column_name || null,
      columns: columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        isPrimaryKey: col.column_key === 'PRI',
        columnType: col.column_type
      }))
    });
  }

  await connection.end();

  // Add timestamp to the output filename
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFileName = `${config.database}_${timestamp}.json`;
  fs.writeFileSync(outputFileName, JSON.stringify({ tables: schema }, null, 2));
  console.log(`✅ Schema saved to ${outputFileName}`);
}

generateSchemaJson().catch(err => {
  console.error('❌ Error generating schema:', err.message);
});