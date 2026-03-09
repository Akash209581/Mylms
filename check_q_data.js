const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function checkData() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        const res = await client.query('SELECT id, "question_number", "questionNumber", "topic_names", "topicNames", "question_text", "questionText" FROM questions LIMIT 10');
        console.log(JSON.stringify(res.rows, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}

checkData();
