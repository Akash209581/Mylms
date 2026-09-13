import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DockerSandboxService } from './docker-sandbox.service';
import { GradingService } from './grading.service';
import { CompilerGateway } from './compiler.gateway';
import { CompilerQueueService } from './compiler-queue.service';
import { CompilerWorker } from './compiler.worker';
import { ExamCodingSubmission } from '../entities/exam-coding-submission.entity';
import { ExamAttempt } from '../entities/exam-attempt.entity';

import { CompilerController } from './compiler.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ExamCodingSubmission, ExamAttempt]),
  ],
  controllers: [CompilerController],
  providers: [
    DockerSandboxService,
    GradingService,
    CompilerGateway,
    CompilerQueueService,
    CompilerWorker,
  ],
  exports: [
    DockerSandboxService,
    GradingService,
    CompilerGateway,
    CompilerQueueService,
  ],
})
export class CompilerModule {}
