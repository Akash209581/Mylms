import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { College } from './college.entity';
import { Organization } from './organization.entity';


export enum QuestionType {
  MCQ = 'MCQ',
  FIB = 'FIB',
  MQ = 'MQ',
  JC = 'JC',
  PQ = 'PQ',
  OP = 'OP',
}

export enum Difficulty {
  VERY_EASY = 'VERY_EASY',
  EASY = 'EASY',
  MEDIUM = 'MEDIUM',
  HARD = 'HARD',
  VERY_HARD = 'VERY_HARD',
}

@Entity('questions')
export class Question {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  questionNumber: string; // e.g. MCQ0001, FIB0002

  @Column({ type: 'enum', enum: QuestionType })
  type: QuestionType;

  @Column()
  topicNames: string; // Arrays, Strings, etc.

  @Column({ type: 'enum', enum: Difficulty, default: Difficulty.MEDIUM })
  difficulty: Difficulty;

  @Column({ nullable: true })
  companiesAppeared: string; // Accenture, CapGemini...

  @Column({ nullable: true })
  programmingLanguage: string; // Python, C, C++, Java

  @Column({ nullable: true })
  recentYearAppearing: number;

  @Column({ nullable: true })
  bestPracticeFor: string;

  @Column({ type: 'text' })
  questionText: string;

  // MCQ: 4 options + correct answer index
  @Column({ type: 'jsonb', nullable: true })
  options: string[];

  @Column({ nullable: true })
  correctAnswer: string;

  // FIB: blanks array
  @Column({ type: 'jsonb', nullable: true })
  blanks: string[];

  // MQ: left and right pairs
  @Column({ type: 'jsonb', nullable: true })
  matchingPairs: { left: string; right: string }[];

  // MQ: extra right-side options (distractors)
  @Column({ name: 'extra_right_matches', type: 'jsonb', nullable: true })
  extraRightMatches: string[];

  // JC: jumbled statements
  @Column({ type: 'jsonb', nullable: true })
  jumbledStatements: string[];

  // PQ: Programming question fields
  @Column({ type: 'text', nullable: true })
  problemStatement: string;

  @Column({ type: 'text', nullable: true })
  inputFormat: string;

  @Column({ type: 'text', nullable: true })
  outputFormat: string;

  @Column({ type: 'text', nullable: true })
  constraints: string;

  @Column({ name: 'allowed_languages', type: 'jsonb', nullable: true })
  allowedLanguages: string[];

  @Column({ type: 'jsonb', nullable: true })
  testCases: { input: string; output: string; explanation?: string }[];

  // OP: pseudocode/program for output prediction
  @Column({ type: 'text', nullable: true })
  codeSnippet: string;

  @Column({ nullable: true })
  expectedOutput: string;

  @Column({ default: true })
  isActive: boolean;

  // College/University - Multi-tenant support
  @Column({ name: 'college_id' })
  collegeId: number;

  // Organization - Multi-tenant support
  @Column({ name: 'organization_id' })
  organizationId: number;

  @ManyToOne(() => Organization, (organization) => organization.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'organization_id' })
  organization: Organization;

  @ManyToOne(() => College, (college) => college.questions)
  @JoinColumn({ name: 'college_id' })
  college: College;


  @CreateDateColumn()
  createdAt: Date;
}
