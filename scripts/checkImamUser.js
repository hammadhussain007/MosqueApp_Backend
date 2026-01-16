const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const imamUser = await prisma.user.findUnique({
      where: { email: 'imam@mosque.com' }
    });

    console.log('Imam User:');
    console.log(JSON.stringify(imamUser, null, 2));
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
