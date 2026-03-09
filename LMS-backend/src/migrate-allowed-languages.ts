
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function migrate() {
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false, // For Neon/Render usually required
        },
    });

    try {
        await client.connect();
        console.log('Connected to database');

        // Add allowed_languages column if not exists
        await client.query(`
      ALTER TABLE questions 
      ADD COLUMN IF NOT EXISTS allowed_languages JSONB;
    `);

        console.log('Migration successful: added allowed_languages to questions table');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

migrate();
