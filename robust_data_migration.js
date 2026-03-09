const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function migrateData() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log('Fetching columns...');
        const colRes = await client.query(`SELECT column_name FROM information_schema.columns WHERE table_name = 'questions'`);
        const existingCols = colRes.rows.map(r => r.column_name);

        const possibleMappings = [
            ['question_number', 'questionNumber'],
            ['topic_names', 'topicNames'],
            ['companies_appeared', 'companiesAppeared'],
            ['programming_language', 'programmingLanguage'],
            ['recent_year_appearing', 'recentYearAppearing'],
            ['best_practice_for', 'bestPracticeFor'],
            ['question_text', 'questionText'],
            ['correct_answer', 'correctAnswer'],
            ['matching_pairs', 'matchingPairs'],
            ['jumbled_statements', 'jumbledStatements'],
            ['problem_statement', 'problemStatement'],
            ['input_format', 'inputFormat'],
            ['output_format', 'outputFormat'],
            ['test_cases', 'testCases'],
            ['code_snippet', 'codeSnippet'],
            ['expected_output', 'expectedOutput'],
            ['is_active', 'isActive'],
            ['created_at', 'createdAt']
        ];

        const updates = [];
        for (const [target, source] of possibleMappings) {
            if (existingCols.includes(target) && existingCols.includes(source)) {
                updates.push(`${target} = COALESCE(${target}, "${source}")`);
            }
        }

        if (updates.length > 0) {
            const query = `UPDATE questions SET ${updates.join(', ')}`;
            const res = await client.query(query);
            console.log(`Successfully updated ${res.rowCount} rows.`);
        } else {
            console.log('No columns to migrate.');
        }

        // Special case for ID 14 where it seems organization_id is already set but others are not
        // Actually, the check showed ID 14 is fine. It's 5, 6, 7, 8 that were empty in snake_case.

    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

migrateData();
