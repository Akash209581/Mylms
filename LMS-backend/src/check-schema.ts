
import { Client } from 'pg';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.join(__dirname, '../.env') });

const connectionString = process.env.DATABASE_URL;

async function checkSchema() {
    const client = new Client({
        connectionString,
        ssl: {
            rejectUnauthorized: false,
        },
    });

    try {
        await client.connect();
        const res = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'questions';
    `);
        console.log('Columns in questions table:');
        res.rows.forEach(row => console.log(`- ${row.column_name}: ${row.data_type}`));
    } catch (err) {
        console.error('Error checking schema:', err);
    } finally {
        await client.end();
    }
}

checkSchema();
