const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function checkCols() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const res = await client.query(`
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_name = 'questions'
        `);
        console.log(res.rows.map(r => r.column_name).join(', '));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkCols();
