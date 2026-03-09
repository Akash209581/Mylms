const { Client } = require('pg');

const connectionString = "postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require";

async function migrateData() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log('Starting migration...');
        const updates = [
            'question_number = COALESCE(question_number, "questionNumber")',
            'topic_names = COALESCE(topic_names, "topicNames")',
            'companies_appeared = COALESCE(companies_appeared, "companiesAppeared")',
            'programming_language = COALESCE(programming_language, "programmingLanguage")',
            'recent_year_appearing = COALESCE(recent_year_appearing, "recentYearAppearing")',
            'best_practice_for = COALESCE(best_practice_for, "bestPracticeFor")',
            'question_text = COALESCE(question_text, "questionText")',
            'correct_answer = COALESCE(correct_answer, "correctAnswer")',
            'matching_pairs = COALESCE(matching_pairs, "matchingPairs")',
            'jumbled_statements = COALESCE(jumbled_statements, "jumbledStatements")',
            'problem_statement = COALESCE(problem_statement, "problemStatement")',
            'input_format = COALESCE(input_format, "inputFormat")',
            'output_format = COALESCE(output_format, "outputFormat")',
            'test_cases = COALESCE(test_cases, "testCases")',
            'code_snippet = COALESCE(code_snippet, "codeSnippet")',
            'expected_output = COALESCE(expected_output, "expectedOutput")',
            'organization_id = COALESCE(organization_id, "organizationId")'
        ];

        const query = `UPDATE questions SET ${updates.join(', ')}`;
        const res = await client.query(query);
        console.log(`Successfully updated ${res.rowCount} rows.`);
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

migrateData();
