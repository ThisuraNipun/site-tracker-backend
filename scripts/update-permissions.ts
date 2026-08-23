import prisma from '../src/utils/prisma';

async function main() {
  const permissionUpdates = {
    'manage_users': 'users:manage',
    'manage_roles': 'roles:manage',
    'manage_permissions': 'permissions:manage'
  };

  for (const [oldName, newName] of Object.entries(permissionUpdates)) {
    await prisma.permission.updateMany({
      where: { name: oldName },
      data: { name: newName }
    });
    console.log(`Updated ${oldName} to ${newName}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
