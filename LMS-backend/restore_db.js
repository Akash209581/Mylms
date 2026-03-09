const { Client } = require('pg');

async function fix() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const queries = [
            // Fix users table
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE SET NULL",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_number VARCHAR(15)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS course VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS branch VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS pursuing_year INTEGER",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS semester INTEGER",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS registration_number VARCHAR(100)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS college_name VARCHAR(200)",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP NULL",

            // Fix organizations table (if missing active)
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE",

            // Ensure audit_logs table exists
            `CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          actor_id INTEGER NULL REFERENCES users(id) ON DELETE SET NULL,
          actor_name VARCHAR(200) NULL,
          actor_role VARCHAR(50) NULL,
          action VARCHAR(100) NOT NULL,
          target_type VARCHAR(50) NULL,
          target_id INTEGER NULL,
          target_name VARCHAR(255) NULL,
          details TEXT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )`
        ];

        console.log("Running restoration queries...");
        for (const q of queries) {
            try {
                await client.query(q);
                console.log(`✅ Success: ${q.slice(0, 50)}...`);
            } catch (e) {
                console.log(`❌ Failed: ${q.slice(0, 50)}... -> ${e.message}`);
            }
        }

        console.log("Restoration complete!");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

fix();
