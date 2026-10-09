const { Client } = require('pg');
const fs = require('fs');

async function run() {
  const client = new Client({
    connectionString: "postgresql://postgres.hiwhmpuhhakguckckuqv:1998nehase10@aws-1-eu-west-1.pooler.supabase.com:5432/postgres",
    ssl: { rejectUnauthorized: false }
  });

  console.log('Connecting to PostgreSQL...');
  await client.connect();

  console.log('Querying all students without heavy thumbnailPath...');
  console.time('students_query');
  const cols = [
    'id', 'studentId', 'fullName', 'phone', 'sex', 'grade',
    'dateOfBirth', 'emailAddress', 'address', 'school', 'department',
    'academicYear', 'guardianFullName', 'emergencyContactName',
    'emergencyContactPhone', 'contactName', 'cityRegion', 'bloodType',
    'rollNumber', 'nationality', 'nationalId', 'photoPath',
    'previewPath', 'originalPhotoPath', 'qrCodeData', 'senderId',
    'senderName', 'photoIntegrityStatus', 'storageKey', 'storageSyncAt',
    'status', 'receiverHidden', 'hiddenAt', 'batchId', 'organizationId',
    'createdAt', 'updatedAt', 'receiverNote', 'hasMistake'
  ].map(c => `"${c}"`).join(', ');

  const res = await client.query(`SELECT ${cols} FROM cloudflare.students ORDER BY "createdAt" DESC;`);
  console.timeEnd('students_query');
  console.log('Total students fetched:', res.rows.length);

  // Set thumbnailPath to previewPath or photoPath if missing
  const processed = res.rows.map(row => {
    return {
      ...row,
      thumbnailPath: row.previewPath || row.photoPath
    };
  });

  fs.writeFileSync('../students-3723-data.json', JSON.stringify(processed));
  console.log('Successfully saved to ../students-3723-data.json ! Size in bytes:', fs.statSync('../students-3723-data.json').size);

  console.log('Fetching users...');
  const usersRes = await client.query('SELECT * FROM cloudflare.users;');
  fs.writeFileSync('../users-data.json', JSON.stringify(usersRes.rows));
  console.log('Successfully saved ../users-data.json ! Count:', usersRes.rows.length);

  await client.end();
}

run().catch(e => {
  console.error('Fast dump error:', e);
  process.exit(1);
});
