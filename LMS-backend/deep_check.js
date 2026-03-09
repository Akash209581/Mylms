const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        // Check all tables named 'users' and their schemas
        const tablesRes = await client.query(`
      SELECT table_schema, table_name 
      FROM information_schema.tables 
      WHERE table_name ILIKE 'users'
    `);
        console.log("Tables found:", tablesRes.rows);

        // Check columns for each 'users' table found
        for (const table of tablesRes.rows) {
            console.log(`Checking columns for ${table.table_schema}.${table.table_name}...`);
            const colsRes = await client.query(`
        SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = $1 AND table_name = $2
      `, [table.table_schema, table.table_name]);
            console.log("Columns:", colsRes.rows.map(c => c.column_name));
        }

        // Attempt a direct SELECT to see if it works
        try {
            const selectRes = await client.query('SELECT is_active, last_login_at FROM users LIMIT 1');
            console.log("Direct SELECT of is_active, last_login_at: SUCCESS");
        } catch (e) {
            console.log("Direct SELECT of is_active, last_login_at: FAILED", e.message);
        }

    } catch (err) {
        console.error("Diagnostic failed", err);
    } finally {
        await client.end();
    }
}

check();
