import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Question } from '../entities/question.entity';
import { QuestionBankController } from './question-bank.controller';
import { BulkImportService } from './bulk-import.service';
import { QuestionValidatorService } from './question-validator.service';
import { FileParserService } from './file-parser.service';
import { CollegeFilterService } from '../common/college-filter.service';

@Module({
  imports: [TypeOrmModule.forFeature([Question])],
  controllers: [QuestionBankController],
  providers: [
    BulkImportService,
    QuestionValidatorService,
    FileParserService,
    CollegeFilterService,
  ],
})
export class QuestionBankModule {}

