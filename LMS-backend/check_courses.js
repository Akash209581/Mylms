const { Client } = require('pg');
const client = new Client({ connectionString: 'postgresql://neon_db_owner:1LwUPEf4JtQc@ep-patient-hill-a5x83fve.us-east-2.aws.neon.tech/neon_db?sslmode=require' });
client.connect().then(() => client.query('SELECT c.id, c.title, u.name, u.role, c.instructor_id FROM course c LEFT JOIN "user" u ON c.instructor_id = u.id ORDER BY c.id DESC LIMIT 5').then(res => console.log(res.rows))).finally(() => client.end());
