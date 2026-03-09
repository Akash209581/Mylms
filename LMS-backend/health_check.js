const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();

        const tables = ['users', 'organizations', 'courses', 'enrollments', 'audit_logs'];

        for (const table of tables) {
            const res = await client.query(`
        SELECT table_name, table_schema 
        FROM information_schema.tables 
        WHERE table_name = $1
      `, [table]);

            if (res.rows.length === 0) {
                console.log(`❌ Table MISSING: ${table}`);
            } else {
                console.log(`✅ Table OK: ${table}`);
                const cols = await client.query(`
          SELECT column_name 
          FROM information_schema.columns 
          WHERE table_name = $1
        `, [table]);
                console.log(`   Columns: ${cols.rows.map(c => c.column_name).join(', ')}`);
            }
        }

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

check();
