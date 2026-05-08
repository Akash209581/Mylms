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
  {
    name: 'Aptitude',
    topics: [
      'Number System',
      'Simplification & Approximation',
      'Ratio & Proportion',
      'Percentage',
      'Profit, Loss & Discount',
      'Average',
      'Simple Interest',
      'Compound Interest',
      'Time, Speed & Distance',
      'Time & Work',
      'Pipes & Cisterns',
      'Mixture & Alligation',
      'Partnership',
      'Linear Equations',
      'Quadratic Equations',
      'Polynomials',
      'Inequalities',
      'Geometry',
      'Coordinate Geometry',
      'Mensuration (2D)',
      'Mensuration (3D)',
      'Data Interpretation (Tables, Bar, Pie, Line Graphs)',
      'Data Sufficiency',
      'Probability',
      'Permutation & Combination',
      'Statistics (Mean, Median, Mode, SD)',
      'Set Theory (Venn Diagrams)',
      'Logarithms',
      'Trigonometry',
    ],
  },
  {
    name: 'Reasoning',
    topics: [
      'Series',
      'Coding-Decoding',
      'Blood Relations',
      'Direction Sense Test',
      'Order & Ranking',
      'Seating Arrangement (Linear & Circular)',
      'Puzzle (Floor, Box, Scheduling, etc.)',
      'Syllogism',
      'Inequality',
      'Statement & Conclusion',
      'Statement & Assumption',
      'Statement & Argument',
      'Cause & Effect',
      'Assertion & Reason',
      'Decision Making',
      'Input-Output',
      'Data Sufficiency',
      'Analogy (Figure-based)',
      'Classification (Odd One Out)',
      'Series (Figure Series)',
      'Mirror Images',
      'Water Images',
      'Paper Folding & Cutting',
      'Embedded Figures',
      'Figure Completion',
      'Figure Counting',
      'Cube & Dice',
      'Venn Diagrams',
      'Pattern Recognition',
      'Logical Sequence of Words',
      'Mathematical Operations',
      'Alphabet Test',
      'Missing Characters',
      'Logical Venn Diagram',
    ],
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
