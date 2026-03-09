const { Client } = require('pg');

async function test() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require",
    });

    try {
        await client.connect();
        console.log("Connected to DB");

        const query = `SELECT "User"."id" AS "User_id", "User"."name" AS "User_name", "User"."email" AS "User_email", "User"."password_hash" AS "User_password_hash", "User"."role" AS "User_role", "User"."is_active" AS "User_is_active", "User"."last_login_at" AS "User_last_login_at", "User"."organization_id" AS "User_organization_id", "User"."mobile_number" AS "User_mobile_number", "User"."country" AS "User_country", "User"."state" AS "User_state", "User"."course" AS "User_course", "User"."branch" AS "User_branch", "User"."pursuing_year" AS "User_pursuing_year", "User"."semester" AS "User_semester", "User"."registration_number" AS "User_registration_number", "User"."college_name" AS "User_college_name", "User"."created_at" AS "User_created_at" FROM "users" "User" WHERE (("User"."email" = $1)) LIMIT 1`;
        const params = ['superadmin@eduverse.com'];

        console.log("Executing exact query from error log...");
        const res = await client.query(query, params);
        console.log("Query SUCCESS!");
        console.log("Result:", res.rows[0]);

    } catch (err) {
        console.error("Query FAILED", err.message);
        if (err.message.includes('is_active')) {
            console.log("Checking if column exists with case sensitivity...");
            const res2 = await client.query("SELECT * FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active'");
            console.log("is_active in info_schema count:", res2.rows.length);
        }
    } finally {
        await client.end();
    }
}

test();
