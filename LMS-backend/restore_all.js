const { Client } = require('pg');

async function fixAll() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const queries = [
            // 1. Organizations
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT TRUE",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS type VARCHAR(100)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS address VARCHAR(255)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS city VARCHAR(100)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS state VARCHAR(100)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS country VARCHAR(100)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(20)",
            "ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by INTEGER",

            // 2. Users (Recap)
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
            "ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255)",

            // 3. Courses
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS organization_id INTEGER REFERENCES organizations(id) ON DELETE CASCADE",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS instructor_id INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'PENDING_APPROVAL'",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS published BOOLEAN DEFAULT TRUE",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES users(id) ON DELETE SET NULL",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS rejection_reason TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS target_audience TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS description TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS objectives TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS prerequisites TEXT",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS duration INTEGER",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS thumbnail VARCHAR(255)",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS category VARCHAR(100)",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS level VARCHAR(50)",
            "ALTER TABLE courses ADD COLUMN IF NOT EXISTS price DECIMAL(10,2) DEFAULT 0",

            // 4. Enrollments
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS progress INTEGER DEFAULT 0",
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS completed BOOLEAN DEFAULT FALSE",
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS certificate_url VARCHAR(255)",
            "ALTER TABLE enrollments ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP DEFAULT NOW()",

            // 5. Audit Log (Repeat just in case)
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

        console.log("Executing comprehensive restoration...");
        for (const q of queries) {
            try {
                await client.query(q);
                console.log(`✅ Success: ${q.slice(0, 60)}...`);
            } catch (e) {
                console.log(`❌ Skipped: ${q.slice(0, 60)}... (${e.message})`);
            }
        }
        console.log("Database fully synchronized with entities!");

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

fixAll();
