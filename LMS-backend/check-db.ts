
import { DataSource } from 'typeorm';
import { User } from './src/entities/user.entity';
import { College } from './src/entities/college.entity';
import { Organization } from './src/entities/organization.entity';
import { Course } from './src/entities/course.entity';

async function check() {
  const ds = new DataSource({
    type: 'postgres',
    url: 'postgresql://neondb_owner:npg_1wnFCiGM0DzV@ep-gentle-moon-aiq823ba-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    entities: [User, College, Organization, Course],
    ssl: true,
  });

  try {
    await ds.initialize();
    console.log('Connected to DB');
    
    const users = await ds.getRepository(User).count();
    const colleges = await ds.getRepository(College).count();
    const orgs = await ds.getRepository(Organization).count();
    const courses = await ds.getRepository(Course).count();
    
    console.log('STATS:', { users, colleges, orgs, courses });
    
    if (users > 0) {
        const admin = await ds.getRepository(User).findOne({ where: { role: 'SUPERADMIN' as any } });
        console.log('SUPERADMIN_EXISTS:', !!admin);
    }
  } catch (e) {
    console.error('ERROR:', e.message);
  } finally {
    await ds.destroy();
  }
}

check();
