import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, ILike } from 'typeorm';
import { ForumPost, ForumCategory } from '../entities/forum-post.entity';
import { ForumReply } from '../entities/forum-reply.entity';

@Injectable()
export class ForumService {
  constructor(
    @InjectRepository(ForumPost)
    private postRepo: Repository<ForumPost>,
    @InjectRepository(ForumReply)
    private replyRepo: Repository<ForumReply>,
  ) {}

  async getCategories() {
    const categories = Object.values(ForumCategory);
    const result = await Promise.all(
      categories.map(async (cat) => {
        const postsCount = await this.postRepo.count({ where: { category: cat } });
        const lastPost = await this.postRepo.findOne({
          where: { category: cat },
          order: { updatedAt: 'DESC' },
        });
        return {
          name: cat,
          postsCount,
          lastActivity: lastPost?.updatedAt || null,
        };
      }),
    );
    return result;
  }

  async getPosts(category?: string, search?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const query = this.postRepo.createQueryBuilder('post')
      .leftJoinAndSelect('post.author', 'author')
      .loadRelationCountAndMap('post.replyCount', 'post.replies')
      .orderBy('post.isPinned', 'DESC')
      .addOrderBy('post.createdAt', 'DESC')
      .skip(skip)
      .take(limit);

    if (category) {
      query.andWhere('post.category = :category', { category });
    }
    if (search) {
      query.andWhere('(post.title ILIKE :search OR post.content ILIKE :search)', {
        search: `%${search}%`,
      });
    }

    const [posts, total] = await query.getManyAndCount();
    return { posts, total, page, limit };
  }

  async getRecentPosts(limit = 10) {
    return this.postRepo.find({
      relations: ['author'],
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  async getPost(id: number) {
    // Increment view count
    await this.postRepo.increment({ id }, 'viewsCount', 1);

    const post = await this.postRepo.findOne({
      where: { id },
      relations: ['author'],
    });
    if (!post) throw new NotFoundException('Post not found');

    const replies = await this.replyRepo.find({
      where: { postId: id },
      relations: ['author'],
      order: { createdAt: 'ASC' },
    });

    return { ...post, replies };
  }

  async createPost(
    authorId: number,
    data: { title: string; content: string; category: ForumCategory; tags?: string[] },
  ) {
    const post = this.postRepo.create({ ...data, authorId });
    return this.postRepo.save(post);
  }

  async createReply(postId: number, authorId: number, content: string) {
    const post = await this.postRepo.findOne({ where: { id: postId } });
    if (!post) throw new NotFoundException('Post not found');

    // Bump post updatedAt on new reply
    await this.postRepo.update(postId, { updatedAt: new Date() });

    const reply = this.replyRepo.create({ postId, authorId, content });
    return this.replyRepo.save(reply);
  }

  async likePost(id: number) {
    await this.postRepo.increment({ id }, 'likesCount', 1);
    return this.postRepo.findOne({ where: { id } });
  }

  async likeReply(id: number) {
    await this.replyRepo.increment({ id }, 'likesCount', 1);
    return this.replyRepo.findOne({ where: { id } });
  }

  async acceptReply(replyId: number, userId: number) {
    const reply = await this.replyRepo.findOne({
      where: { id: replyId },
      relations: ['post'],
    });
    if (!reply) throw new NotFoundException('Reply not found');
    if (reply.post.authorId !== userId) throw new NotFoundException('Not authorized');

    // Unmark any previous accepted reply
    await this.replyRepo.update({ postId: reply.postId }, { isAccepted: false });
    await this.replyRepo.update(replyId, { isAccepted: true });
    return { success: true };
  }
}
