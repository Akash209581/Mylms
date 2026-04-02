import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ForumService } from './forum.service';
import { JwtAuthGuard } from '../common/jwt.guard';
import { ForumCategory } from '../entities/forum-post.entity';

@Controller('forum')
export class ForumController {
  constructor(private readonly forumService: ForumService) {}

  @Get('categories')
  async getCategories() {
    return this.forumService.getCategories();
  }

  @Get('posts')
  async getPosts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('page') page?: number,
  ) {
    return this.forumService.getPosts(category, search, page ? Number(page) : 1);
  }

  @Get('posts/recent')
  async getRecentPosts() {
    return this.forumService.getRecentPosts();
  }

  @Get('posts/:id')
  async getPost(@Param('id', ParseIntPipe) id: number) {
    return this.forumService.getPost(id);
  }

  @Post('posts')
  @UseGuards(JwtAuthGuard)
  async createPost(
    @Request() req: any,
    @Body() body: { title: string; content: string; category: ForumCategory; tags?: string[] },
  ) {
    return this.forumService.createPost(req.user.sub, body);
  }

  @Post('posts/:id/reply')
  @UseGuards(JwtAuthGuard)
  async createReply(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
    @Body() body: { content: string },
  ) {
    return this.forumService.createReply(id, req.user.sub, body.content);
  }

  @Post('posts/:id/like')
  @UseGuards(JwtAuthGuard)
  async likePost(@Param('id', ParseIntPipe) id: number) {
    return this.forumService.likePost(id);
  }

  @Post('replies/:id/like')
  @UseGuards(JwtAuthGuard)
  async likeReply(@Param('id', ParseIntPipe) id: number) {
    return this.forumService.likeReply(id);
  }

  @Post('replies/:id/accept')
  @UseGuards(JwtAuthGuard)
  async acceptReply(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    return this.forumService.acceptReply(id, req.user.sub);
  }
}
