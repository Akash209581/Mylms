
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function testInsert() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        // Try to update the problematic record (ID 8) with allowed_languages
        const res = await client.query(`
      UPDATE questions 
      SET allowed_languages = '["Python"]'::jsonb 
      WHERE id = 8;
    `);
        console.log('Update successful:', res.rowCount);
    } catch (err: any) {
        console.error('Update failed in test script:', err.message);
    } finally {
        await client.end();
    }
}

testInsert();
