const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const cutoff = new Date('2026-10-14T00:00:00.000Z');
  console.log('Querying students with O+ created after:', cutoff.toISOString());
  
  const matches = await prisma.student.findMany({
    where: {
      createdAt: { gte: cutoff },
      bloodType: { in: ['O+', 'o+', 'O +', 'o +'] }
    },
    select: { id: true, studentId: true, fullName: true, bloodType: true, createdAt: true }
  });
  console.log(`Found ${matches.length} matching students.`);
  
  const updateResult = await prisma.student.updateMany({
    where: {
      createdAt: { gte: cutoff },
      bloodType: { in: ['O+', 'o+', 'O +', 'o +'] }
    },
    data: { bloodType: 'Unknown' }
  });
  console.log(`Updated ${updateResult.count} students to bloodType "Unknown".`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
