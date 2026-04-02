import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ForumController } from './forum.controller';
import { ForumService } from './forum.service';
import { ForumPost } from '../entities/forum-post.entity';
import { ForumReply } from '../entities/forum-reply.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ForumPost, ForumReply])],
  controllers: [ForumController],
  providers: [ForumService],
  exports: [ForumService],
})
export class ForumModule {}
