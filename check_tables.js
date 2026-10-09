const { Client } = require('pg');

async function checkTables() {
  const client = new Client({
    connectionString: "postgresql://postgres.hiwhmpuhhakguckckuqv:1998nehase10@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  await client.connect();
  const res = await client.query(`
    SELECT table_schema, table_name 
    FROM information_schema.tables 
    WHERE table_schema NOT IN ('information_schema', 'pg_catalog')
    ORDER BY table_schema, table_name;
  `);
  console.log('Tables found:');
  res.rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}`));
  await client.end();
}

checkTables().catch(console.error);
