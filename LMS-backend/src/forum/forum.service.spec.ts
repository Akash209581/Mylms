import { BadRequestException } from '@nestjs/common';
import { ForumService } from './forum.service';
import { ForumCategory } from '../entities/forum-post.entity';

describe('ForumService', () => {
  const query: any = {};
  for (const method of ['select', 'addSelect', 'groupBy', 'leftJoinAndSelect',
    'loadRelationCountAndMap', 'orderBy', 'addOrderBy', 'skip', 'take']) {
    query[method] = jest.fn().mockReturnValue(query);
  }
  query.getRawMany = jest.fn();
  query.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);
  const repo = { createQueryBuilder: jest.fn().mockReturnValue(query) };
  const service = new ForumService(repo as any, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it('loads category counts and activity in one query, including empty categories', async () => {
    query.getRawMany.mockResolvedValue([
      { category: ForumCategory.GENERAL, postsCount: '4', lastActivity: '2026-01-01' },
    ]);
    const result = await service.getCategories();
    expect(repo.createQueryBuilder).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(Object.values(ForumCategory).length);
    expect(result[0]).toEqual({ name: ForumCategory.GENERAL, postsCount: 4, lastActivity: '2026-01-01' });
    expect(result[1]).toEqual({ name: ForumCategory.DSA, postsCount: 0, lastActivity: null });
  });

  it.each([0, -1, NaN, Infinity, 1.5, Number.MAX_SAFE_INTEGER])('rejects invalid page %s before querying', async page => {
    await expect(service.getPosts(undefined, undefined, page)).rejects.toThrow(BadRequestException);
    expect(repo.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('uses the correct offset for valid pages', async () => {
    await expect(service.getPosts(undefined, undefined, 2)).resolves.toEqual({ posts: [], total: 0, page: 2, limit: 20 });
    expect(query.skip).toHaveBeenCalledWith(20);
  });
});
