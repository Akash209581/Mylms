import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Domain } from './entities/domain.entity';
import { Topic } from './entities/topic.entity';
import { Repository } from 'typeorm';

const SEED_DATA = [
  {
    name: 'Programming Domain',
    topics: ['Arrays', 'Strings', 'Linked List', 'Trees', 'Graphs', 'Dynamic Programming', 'Sorting', 'Searching', 'Recursion', 'OOP', 'DBMS', 'OS', 'CN'],
  },
  {
    name: 'Data Science',
    topics: ['NumPy', 'SciPy', 'SciKitLearn', 'Keras', 'MatplotLib'],
  },
  {
    name: 'Machine Learning',
    topics: ['Classification', 'Regression', 'Clustering', 'Linear Regression', 'Support Vector Machines'],
  },
  {
    name: 'Deep Learning',
    topics: ['Multi Layer Perceptron', 'Artificial Neural Networks', 'Convolution Neural Networks', 'Recurrent Neural Networks', 'Generative Adversarial Networks'],
  },
  {
    name: 'Agentic AI',
    topics: ['LangChain', 'LangGraph', 'LangSmith', 'Retrieval Augmented Generation', 'Single Agent System', 'Multi Agent System', 'Human In The Loop', 'Hallucination', 'Agent With Tools'],
  },
];

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const domainRepo = app.get<Repository<Domain>>(getRepositoryToken(Domain));
  const topicRepo = app.get<Repository<Topic>>(getRepositoryToken(Topic));

  console.log('Seeding domains and topics...');

  for (const dData of SEED_DATA) {
    let domain = await domainRepo.findOne({ where: { name: dData.name } });
    if (!domain) {
      domain = domainRepo.create({ name: dData.name });
      domain = await domainRepo.save(domain);
      console.log(`Created domain: ${dData.name}`);
    }

    for (const tName of dData.topics) {
      const topic = await topicRepo.findOne({ where: { name: tName, domainId: domain.id } });
      if (!topic) {
        await topicRepo.save(topicRepo.create({ name: tName, domainId: domain.id }));
        console.log(`  Added topic: ${tName}`);
      }
    }
  }

  console.log('Seeding complete!');
  await app.close();
}

bootstrap();
