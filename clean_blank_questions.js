const { Client } = require('pg');

async function checkBlankQuestions() {
    const client = new Client({
        connectionString: "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require"
    });

    try {
        await client.connect();

        // Find questions where key fields are null or empty
        const res = await client.query(`
            SELECT id, "questionNumber", type, "questionText", "topicNames" 
            FROM questions 
            WHERE "questionText" IS NULL OR "questionText" = '' OR "questionNumber" IS NULL
        `);

        console.log('--- Blank/Corrupt Questions Found ---');
        console.table(res.rows);

        if (res.rows.length > 0) {
            console.log(`\nFound ${res.rows.length} blank questions. Deleting them...`);
            const ids = res.rows.map(r => r.id);
            await client.query('DELETE FROM questions WHERE id = ANY($1)', [ids]);
            console.log('Successfully deleted blank questions.');
        } else {
            console.log('\nNo blank questions found in database.');
        }

    } catch (err) {
        console.error('Error:', err.message);
    } finally {
        await client.end();
    }
}

checkBlankQuestions();
