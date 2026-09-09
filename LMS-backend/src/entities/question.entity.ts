import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { College } from './college.entity';
import { User } from './user.entity';


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

export enum QuestionStatus {
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
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

  @Column({ default: 'Programming Domain' })
  domain: string;

  @Column({ nullable: true })
  companiesAppeared: string; // Accenture, CapGemini...

  @Column({ name: 'target_companies', nullable: true })
  targetCompanies: string; // TCS, Infosys, Wipro, Accenture, Amazon...

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

  @Column({ type: 'text', nullable: true })
  codeSnippet: string;

  @Column({ nullable: true })
  expectedOutput: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  @Column({ type: 'text', nullable: true })
  correctCode: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  isActive: boolean;

  @Column({
    type: 'varchar',
    default: QuestionStatus.APPROVED,
  })
  status: QuestionStatus;

  @Column({ name: 'created_by', nullable: true })
  createdBy?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  creator?: User;

  @Column({ name: 'approved_by', nullable: true })
  approvedBy?: number;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'approved_by' })
  approver?: User;

  @Column({ name: 'rejection_reason', type: 'text', nullable: true })
  rejectionReason?: string;

  // College/University - Multi-tenant support
  @Column({ name: 'college_id', nullable: true })
  collegeId: number;

  @ManyToOne(() => College, (college) => college.questions)
  @JoinColumn({ name: 'college_id' })
  college: College;

  @CreateDateColumn()
  createdAt: Date;
}
