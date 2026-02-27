import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';

const AppDataSource = new DataSource({
    type: 'postgres',
    url: process.env.DATABASE_URL || require('dotenv').config({ path: '.env' }) && process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    entities: [__dirname + '/entities/*.entity.{ts,js}'],
    synchronize: true,
});

async function seed() {
    await AppDataSource.initialize();
    console.log('✅ Connected to Neon DB');

    const userRepo = AppDataSource.getRepository('users');

    const accounts = [
        { name: 'Super Admin', email: 'superadmin@eduverse.com', password: 'SuperAdmin@123', role: 'SUPERADMIN' },
        { name: 'Admin', email: 'admin@eduverse.com', password: 'Admin@123', role: 'ADMIN' },
        { name: 'Instructor', email: 'instructor@eduverse.com', password: 'Instructor@123', role: 'INSTRUCTOR' },
    ];

    for (const acc of accounts) {
        const existing = await userRepo.findOneBy({ email: acc.email });
        if (existing) {
            console.log(`⚠️  ${acc.role} already exists: ${acc.email}`);
            continue;
        }
        const passwordHash = await bcrypt.hash(acc.password, 10);
        const user = userRepo.create({ name: acc.name, email: acc.email, passwordHash, role: acc.role });
        await userRepo.save(user);
        console.log(`✅ Created ${acc.role}: ${acc.email} / ${acc.password}`);
    }

    await AppDataSource.destroy();
    console.log('\n🎉 Seeding complete! Use the credentials above to log in.');
}

seed().catch(err => { console.error('❌ Seed failed:', err.message); process.exit(1); });
