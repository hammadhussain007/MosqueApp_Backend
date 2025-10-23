import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env file
config({ path: resolve(__dirname, '.env') });

// Verify the DATABASE_URL is correct
const dbUrl = process.env.DATABASE_URL;
if (!dbUrl || !dbUrl.startsWith('mysql://')) {
  throw new Error('DATABASE_URL must be a valid MySQL connection string');
}
