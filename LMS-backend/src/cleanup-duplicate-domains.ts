import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Domain } from './entities/domain.entity';
import { Topic } from './entities/topic.entity';
import { Question } from './entities/question.entity';
import { Repository } from 'typeorm';

type DomainMergePair = {
  from: string;
  to: string;
};

const MERGE_PAIRS: DomainMergePair[] = [
  { from: 'Quantitative Aptitude', to: 'Aptitude' },
  { from: 'Logical Reasoning', to: 'Reasoning' },
];

async function mergeDomainPair(
  domainRepo: Repository<Domain>,
  topicRepo: Repository<Topic>,
  questionRepo: Repository<Question>,
  pair: DomainMergePair,
) {
  const fromDomain = await domainRepo.findOne({ where: { name: pair.from } });
  const toDomain = await domainRepo.findOne({ where: { name: pair.to } });

  if (!fromDomain) {
    console.log(`Skip: source domain '${pair.from}' not found.`);
    return;
  }

  if (!toDomain) {
    console.log(`Target domain '${pair.to}' not found. Creating it.`);
    const created = await domainRepo.save(domainRepo.create({ name: pair.to }));
    await mergeDomainPair(domainRepo, topicRepo, questionRepo, { from: pair.from, to: created.name });
    return;
  }

  const oldTopics = await topicRepo.find({ where: { domainId: fromDomain.id } });
  let movedTopics = 0;
  let removedDuplicateTopics = 0;

  for (const oldTopic of oldTopics) {
    const existingInTarget = await topicRepo.findOne({
      where: { name: oldTopic.name, domainId: toDomain.id },
    });

    if (existingInTarget) {
      await topicRepo.remove(oldTopic);
      removedDuplicateTopics += 1;
      continue;
    }

    oldTopic.domainId = toDomain.id;
    await topicRepo.save(oldTopic);
    movedTopics += 1;
  }

  const questionUpdate = await questionRepo
    .createQueryBuilder()
    .update(Question)
    .set({ domain: toDomain.name })
    .where('domain = :oldDomain', { oldDomain: fromDomain.name })
    .execute();

  await domainRepo.remove(fromDomain);

  console.log(`Merged '${pair.from}' -> '${pair.to}'`);
  console.log(`  Topics moved: ${movedTopics}`);
  console.log(`  Topics removed as duplicates: ${removedDuplicateTopics}`);
  console.log(`  Questions updated: ${questionUpdate.affected ?? 0}`);
  console.log(`  Removed domain: ${pair.from}`);
}

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domainRepo = app.get<Repository<Domain>>(getRepositoryToken(Domain));
  const topicRepo = app.get<Repository<Topic>>(getRepositoryToken(Topic));
  const questionRepo = app.get<Repository<Question>>(getRepositoryToken(Question));

  console.log('Starting duplicate-domain cleanup...');

  for (const pair of MERGE_PAIRS) {
    await mergeDomainPair(domainRepo, topicRepo, questionRepo, pair);
  }

  const domains = await domainRepo.find();
  console.log('Remaining domains:');
  for (const d of domains) {
    console.log(`- ${d.name}`);
  }

  console.log('Duplicate-domain cleanup complete.');
  await app.close();
}

bootstrap();
