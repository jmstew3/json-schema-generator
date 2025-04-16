require('dotenv').config();
const fs = require('fs');
const mysql = require('mysql2/promise');

const config = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
};

async function generateSchemaJsonWithExamples() {
  const connection = await mysql.createConnection(config);

  const [tables] = await connection.execute(
    `SELECT table_name FROM information_schema.tables WHERE table_schema = ?`,
    [config.database]
  );

  if (!tables || tables.length === 0) {
    throw new Error('No tables found in the database.');
  }

  const schema = [];

  for (const table of tables) {
    const tableName = table.table_name;
    const [columns] = await connection.execute(
      `SELECT column_name, data_type, is_nullable, column_key, column_type
       FROM information_schema.columns
       WHERE table_schema = ? AND table_name = ?`,
      [config.database, tableName]
    );

    // Fetch 2-3 example rows for this table
    let examples = [];
    try {
      const [rows] = await connection.execute(
        `SELECT * FROM \`${tableName}\` LIMIT 3`
      );
      examples = rows;
    } catch (err) {
      // If table is a view or inaccessible, skip examples
      examples = [];
    }

    schema.push({
      name: tableName,
      primaryKey: columns.find(c => c.column_key === 'PRI')?.column_name || null,
      columns: columns.map(col => ({
        name: col.column_name,
        type: col.data_type,
        nullable: col.is_nullable === 'YES',
        isPrimaryKey: col.column_key === 'PRI',
        columnType: col.column_type
      })),
      examples
    });
  }

  await connection.end();

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputFileName = `${config.database}_${timestamp}_examples.json`;
  fs.writeFileSync(outputFileName, JSON.stringify({ tables: schema }, null, 2));
  console.log(`✅ Schema with examples saved to ${outputFileName}`);
}

generateSchemaJsonWithExamples().catch(err => {
  console.error('❌ Error generating schema with examples:', err.message);
});
