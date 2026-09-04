const fs = require('fs');
const path = require('path');

const dbUrl = process.env.DATABASE_URL || '';
const rootDir = path.join(__dirname, '..');
const schemaPath = path.join(rootDir, 'prisma', 'schema.prisma');
const postgresSchemaPath = path.join(rootDir, 'prisma', 'schema.postgres.prisma');

// If DATABASE_URL is PostgreSQL, swap in the PostgreSQL schema
if (dbUrl.startsWith('postgres://') || dbUrl.startsWith('postgresql://')) {
  console.log('[Prisma Init] Detected PostgreSQL connection string. Using schema.postgres.prisma...');
  if (fs.existsSync(postgresSchemaPath)) {
    fs.copyFileSync(postgresSchemaPath, schemaPath);
  }
} else {
  // If not set, ensure default environment variable for sqlite
  if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = "file:./dev.db";
  }
}
console.log('[Prisma Init] Schema prepared successfully.');
