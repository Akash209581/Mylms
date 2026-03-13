import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../entities/question.entity';
import { QuestionBankController } from './question-bank.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Question])],
  controllers: [QuestionBankController],
})
export class QuestionBankModule {}
