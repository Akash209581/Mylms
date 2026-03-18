const { Client } = require('pg');

const run = async () => {
    const client = new Client({ 
        connectionString: 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require'
    });
    
    try {
        await client.connect();
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS course_assignments (
                course_id INT REFERENCES courses(id) ON DELETE CASCADE,
                college_id INT REFERENCES colleges(id) ON DELETE CASCADE,
                PRIMARY KEY (course_id, college_id)
            );
        `);
        
        console.log('✅ Created course_assignments table successfully!');
    } catch (e) {
        console.error('❌ Migration failed:', e);
    } finally {
        await client.end();
    }
};

run();
