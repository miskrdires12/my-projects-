const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, username: true, role: true, boundDeviceId: true }
  });
  console.log('Existing users in DB:', users);

  // Clear all device bindings
  const deletedBindings = await prisma.deviceBinding.deleteMany();
  console.log('Deleted device bindings:', deletedBindings);

  // Clear boundDeviceId on all users so all devices are immediately unlocked
  const updatedUsers = await prisma.user.updateMany({
    data: {
      boundDeviceId: null,
      boundDeviceInfo: null,
    }
  });
  console.log('Reset boundDeviceId on users:', updatedUsers);

  // Ensure miskrdires11@gmail.com is SUPER_ADMIN
  const bcrypt = require('bcryptjs');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('sukuna24th', salt);

  const superAdmin = await prisma.user.upsert({
    where: { email: 'miskrdires11@gmail.com' },
    update: {
      passwordHash: hash,
      role: 'SUPER_ADMIN',
      boundDeviceId: null,
      boundDeviceInfo: null,
    },
    create: {
      id: 'super-admin-miskrdires11',
      email: 'miskrdires11@gmail.com',
      username: 'miskrdires11',
      passwordHash: hash,
      role: 'SUPER_ADMIN',
    }
  });
  console.log('Super Admin synced:', superAdmin.email, superAdmin.role);

  // Ensure miskrdires1@gmail.com is ADMIN
  const admin = await prisma.user.upsert({
    where: { email: 'miskrdires1@gmail.com' },
    update: {
      passwordHash: hash,
      role: 'ADMIN',
      boundDeviceId: null,
      boundDeviceInfo: null,
    },
    create: {
      id: 'admin-miskrdires1',
      email: 'miskrdires1@gmail.com',
      username: 'miskrdires1',
      passwordHash: hash,
      role: 'ADMIN',
    }
  });
  console.log('Admin synced:', admin.email, admin.role);

  // Ensure miskrdires12@gmail.com is SENDER
  const sender = await prisma.user.upsert({
    where: { email: 'miskrdires12@gmail.com' },
    update: {
      passwordHash: hash,
      role: 'SENDER',
      boundDeviceId: null,
      boundDeviceInfo: null,
    },
    create: {
      id: 'sender-miskrdires12',
      email: 'miskrdires12@gmail.com',
      username: 'miskrdires12',
      passwordHash: hash,
      role: 'SENDER',
    }
  });
  console.log('Sender synced:', sender.email, sender.role);
}

main().catch(console.error).finally(() => prisma.$disconnect());
