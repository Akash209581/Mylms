const { Client } = require('pg');

async function check() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('is_active', 'last_login_at')
    `);

        console.log("Found columns:", res.rows.map(r => r.column_name));

        if (res.rows.length < 2) {
            console.log("ERROR: MISSING COLUMNS!");
        } else {
            console.log("Columns are OK");
        }

        const res2 = await client.query("SELECT * FROM information_schema.tables WHERE table_name = 'audit_logs'");
        if (res2.rows.length === 0) {
            console.log("ERROR: MISSING audit_logs table!");
        } else {
            console.log("audit_logs table is OK");
        }

    } catch (err) {
        console.error("Connection error", err);
    } finally {
        await client.end();
    }
}

check();
