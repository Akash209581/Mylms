
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

async function fix() {
    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('Connected');

        // Check if column exists
        const check = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'questions' AND column_name = 'allowed_languages';
    `);

        if (check.rows.length === 0) {
            console.log('Column allowed_languages does not exist. Adding it...');
            await client.query('ALTER TABLE questions ADD COLUMN allowed_languages JSONB;');
            console.log('Column added.');
        } else {
            console.log('Column allowed_languages already exists.');
        }

        // Also check for other potential missing columns from recent updates
        const columns = ['extra_right_matches', 'code_snippet', 'expected_output'];
        for (const col of columns) {
            const c = await client.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'questions' AND column_name = $1;
      `, [col]);
            if (c.rows.length === 0) {
                console.log(`Column ${col} missing. Adding it...`);
                const type = col === 'extra_right_matches' ? 'JSONB' : 'TEXT';
                await client.query(`ALTER TABLE questions ADD COLUMN ${col} ${type};`);
            }
        }

        console.log('Migration check complete.');
    } finally {
        await client.end();
    }
}

fix();
