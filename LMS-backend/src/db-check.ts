import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Domain } from './entities/domain.entity';
import { Topic } from './entities/topic.entity';
import { Repository } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domainRepo = app.get<Repository<Domain>>(getRepositoryToken(Domain));
  const topicRepo = app.get<Repository<Topic>>(getRepositoryToken(Topic));

  const domains = await domainRepo.find();
  const topics = await topicRepo.find();

  console.log('--- DATABASE CHECK ---');
  console.log('Total Domains:', domains.length);
  domains.forEach(d => console.log(`- ${d.name} (ID: ${d.id})`));
  console.log('Total Topics:', topics.length);
  console.log('----------------------');

  await app.close();
}

bootstrap();
