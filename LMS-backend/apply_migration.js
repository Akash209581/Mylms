const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        // Read the SQL file
        const sql = fs.readFileSync('c:/Users/banda/Desktop/LMS/migrate-superadmin-enterprise.sql', 'utf8');

        console.log("Executing migration...");
        await client.query(sql);
        console.log("Migration completed successfully!");

    } catch (err) {
        console.error("Migration failed", err);
    } finally {
        await client.end();
    }
}

migrate();
