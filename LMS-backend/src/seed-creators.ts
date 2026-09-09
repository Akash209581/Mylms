import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { College } from './entities/college.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

async function seed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const userRepo = app.get<Repository<User>>(getRepositoryToken(User));
  const collegeRepo = app.get<Repository<College>>(getRepositoryToken(College));

  // Find or create default college
  let college = await collegeRepo.findOne({ where: { active: true } });
  if (!college) {
    college = collegeRepo.create({ name: 'EduVerse Central Institute', active: true });
    await collegeRepo.save(college);
  }

  const defaultPassword = await bcrypt.hash('Creator@123456', 10);

  // 1. Question Bank Creator
  let qCreator = await userRepo.findOne({ where: { email: 'question_creator@eduverse.com' } });
  if (!qCreator) {
    qCreator = userRepo.create({
      name: 'Question Bank Specialist',
      email: 'question_creator@eduverse.com',
      passwordHash: defaultPassword,
      role: UserRole.QUESTION_CREATOR,
      collegeId: college.id,
      collegeName: college.name,
      isActive: true,
    });
    await userRepo.save(qCreator);
    console.log('✅ Created Question Bank Creator: question_creator@eduverse.com / Creator@123456');
  } else {
    qCreator.role = UserRole.QUESTION_CREATOR;
    qCreator.passwordHash = defaultPassword;
    await userRepo.save(qCreator);
    console.log('🔄 Updated Question Bank Creator: question_creator@eduverse.com / Creator@123456');
  }

  // 2. Content Creator
  let cCreator = await userRepo.findOne({ where: { email: 'content_creator@eduverse.com' } });
  if (!cCreator) {
    cCreator = userRepo.create({
      name: 'Curriculum & Content Lead',
      email: 'content_creator@eduverse.com',
      passwordHash: defaultPassword,
      role: UserRole.CONTENT_CREATOR,
      collegeId: college.id,
      collegeName: college.name,
      isActive: true,
    });
    await userRepo.save(cCreator);
    console.log('✅ Created Content Creator: content_creator@eduverse.com / Creator@123456');
  } else {
    cCreator.role = UserRole.CONTENT_CREATOR;
    cCreator.passwordHash = defaultPassword;
    await userRepo.save(cCreator);
    console.log('🔄 Updated Content Creator: content_creator@eduverse.com / Creator@123456');
  }

  await app.close();
}

seed().catch((err) => {
  console.error('Failed to seed creators:', err);
  process.exit(1);
});
