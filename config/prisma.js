const { PrismaClient } = require('@prisma/client');
const { config } = require('dotenv');
const { resolve } = require('path');

// Load environment variables from project root .env
// Fallback to default CWD if resolve fails
try {
	config({ path: resolve(process.cwd(), '.env') });
} catch (e) {
	config();
}

const prisma = new PrismaClient();

module.exports = prisma;