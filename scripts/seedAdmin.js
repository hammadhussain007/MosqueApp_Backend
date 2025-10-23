const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');

async function seedAdmin() {
  try {
    // Check if admin exists
    const existingAdmin = await prisma.user.findUnique({
      where: { email: 'admin@mosque.com' }
    });

    if (existingAdmin) {
      console.log('Admin user already exists');
      return;
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash('admin1234', 12);
    const admin = await prisma.user.create({
      data: {
        email: 'admin@mosque.com',
        password: hashedPassword,
        fullName: 'Administrator',
        role: 'admin'
      }
    });

    console.log('Admin user created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
