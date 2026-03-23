
const { Client } = require('pg');
const connectionString = 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';

async function heal() {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    console.log('Starting data reorganization (Healing)...');
    
    // 1. For each module that doesn't have chapters
    const modules = await client.query('SELECT id, title FROM modules');
    
    for (const module of modules.rows) {
        // Check if there are lessons in this module (old column)
        const lessonsCount = await client.query('SELECT count(*) FROM lessons WHERE module_id = $1', [module.id]);
        
        if (lessonsCount.rows[0].count > '0') {
            console.log(`Module "${module.title}" has ${lessonsCount.rows[0].count} orphaned topics. Creating a default chapter...`);
            
            // Create a chapter
            const chapterResult = await client.query('INSERT INTO chapters (title, module_id, "order") VALUES ($1, $2, 0) RETURNING id', ['Default Chapter', module.id]);
            const chapterId = chapterResult.rows[0].id;
            
            // Move lessons
            await client.query('UPDATE lessons SET chapter_id = $1 WHERE module_id = $2', [chapterId, module.id]);
            console.log(`  Moved topics to new chapter ID ${chapterId}`);
        }
    }
    
    console.log('SUCCESS: Data reorganized into the new hierarchy');
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await client.end();
  }
}
heal();
