const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createImamUser() {
  try {
    console.log('Creating imam user...');

    const email = 'imam@mosque.com';
    const password = 'Unlockit007';
    const fullName = 'Sheikh Abdullah';

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      // Update existing user to imam role
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          role: 'imam',
          fullName: fullName
        }
      });

      console.log('✅ Updated existing user to imam role');
      console.log(`   Email: ${updatedUser.email}`);
      console.log(`   Name: ${updatedUser.fullName}`);
      console.log(`   Role: ${updatedUser.role}`);
      console.log(`   Password: ${password}`);
      
    } else {
      // Create new imam user
      const hashedPassword = await bcrypt.hash(password, 10);

      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          fullName,
          role: 'imam'
        }
      });

      console.log('✅ Successfully created imam user');
      console.log(`   Email: ${newUser.email}`);
      console.log(`   Name: ${newUser.fullName}`);
      console.log(`   Role: ${newUser.role}`);
      console.log(`   Password: ${password}`);
    }

  } catch (error) {
    console.error('❌ Error creating imam user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createImamUser();
