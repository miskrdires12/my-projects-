const { Client } = require('pg');
const fs = require('fs');

async function dumpWithPgChunks() {
  const client = new Client({
    connectionString: "postgresql://postgres.hiwhmpuhhakguckckuqv:1998nehase10@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting via node-postgres...');
  await client.connect();

  const countRes = await client.query('SELECT count(*) FROM cloudflare.students;');
  const total = parseInt(countRes.rows[0].count, 10);
  console.log('Total students in cloudflare.students:', total);

  const chunkSize = 250;
  let allStudents = [];
  for (let offset = 0; offset < total; offset += chunkSize) {
    console.log(`Querying chunk offset ${offset}...`);
    const res = await client.query(`SELECT * FROM cloudflare.students ORDER BY "createdAt" DESC LIMIT ${chunkSize} OFFSET ${offset};`);
    allStudents = allStudents.concat(res.rows);
    console.log(`Progress: ${allStudents.length} / ${total}`);
  }

  fs.writeFileSync('../students-3723-data.json', JSON.stringify(allStudents));
  console.log('WROTE ALL', allStudents.length, 'STUDENTS TO students-3723-data.json successfully!');

  const usersRes = await client.query('SELECT * FROM cloudflare.users;');
  fs.writeFileSync('../users-data.json', JSON.stringify(usersRes.rows));
  console.log('Wrote users-data.json successfully!');

  await client.end();
  process.exit(0);
}

dumpWithPgChunks().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
