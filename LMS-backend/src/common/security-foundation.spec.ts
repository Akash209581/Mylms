import { ConfigService } from '@nestjs/config';
import { JwtStrategy, clearAuthCache } from './jwt.strategy';
import { CourseContentService, coursePreview } from './course-content.service';
import { privateResponse } from './response-privacy.interceptor';
import { isOriginTrusted, protectMutationOrigin, trustedOrigins } from './request-origin';
import { UserRole } from '../entities/user.entity';
import { Course, CourseStatus } from '../entities/course.entity';
import { AuthService } from '../auth/auth.service';

jest.mock('bcrypt', () => ({ compare: jest.fn().mockResolvedValue(true) }));

describe('Current account authorization', () => {
  const user = { id: 2, name: 'Learner', role: UserRole.STUDENT, collegeId: 7, isActive: true };
  function strategy(current: any = user, college: any = { id: 7, name: 'College', active: true }) {
    return new JwtStrategy(new ConfigService({ JWT_SECRET: 'test-secret-only' }),
      { findOne: jest.fn().mockResolvedValue(current) } as any,
      { findOne: jest.fn().mockResolvedValue(college) } as any);
  }

  // The principal cache is module scoped, so it outlives each strategy instance.
  // Without this the first test's entry for sub:2 satisfies every later one and
  // the denial cases below silently assert nothing.
  beforeEach(() => clearAuthCache());

  it('uses the current role and college instead of stale administrator claims', async () => {
    expect(await strategy().validate({ sub: 2, role: 'SUPERADMIN', collegeId: 99 }))
      .toMatchObject({ sub: 2, role: 'STUDENT', collegeId: 7 });
  });
  it.each([null, { ...user, isActive: false }])('denies deleted or suspended accounts', async current => {
    await expect(strategy(current).validate({ sub: 2 })).rejects.toThrow('Account is unavailable');
  });
  it('denies an inactive college', async () => {
    await expect(strategy(user, { id: 7, active: false }).validate({ sub: 2 })).rejects.toThrow('College is unavailable');
  });
  it('rejects suspended accounts at login, before signing a token', async () => {
    const sign = jest.fn();
    const service = new AuthService({ findOne: jest.fn().mockResolvedValue({ ...user, isActive: false, passwordHash: 'hash' }) } as any, {} as any, { sign } as any);
    await expect(service.login({ email: 'student@example.com', password: 'test' })).rejects.toThrow('Invalid credentials');
    expect(sign).not.toHaveBeenCalled();
  });

  it('serves a cached principal without re-reading the database', async () => {
    const users = { findOne: jest.fn().mockResolvedValue(user) };
    const colleges = { findOne: jest.fn().mockResolvedValue({ id: 7, name: 'College', active: true }) };
    const strat = new JwtStrategy(
      new ConfigService({ JWT_SECRET: 'test-secret-only' }), users as any, colleges as any);

    await strat.validate({ sub: 2 });
    await strat.validate({ sub: 2 });

    expect(users.findOne).toHaveBeenCalledTimes(1);
  });

  it('stops honouring a revoked account once the cache is cleared', async () => {
    const current = { ...user };
    const users = { findOne: jest.fn().mockImplementation(async () => current) };
    const colleges = { findOne: jest.fn().mockResolvedValue({ id: 7, name: 'College', active: true }) };
    const strat = new JwtStrategy(
      new ConfigService({ JWT_SECRET: 'test-secret-only' }), users as any, colleges as any);

    await expect(strat.validate({ sub: 2 })).resolves.toMatchObject({ sub: 2 });

    // Suspension is a mutating request, which clears the cache in main.ts.
    current.isActive = false;
    clearAuthCache();

    await expect(strat.validate({ sub: 2 })).rejects.toThrow('Account is unavailable');
  });

  it.each([0, -1, 1.5, '2', null, undefined])('rejects a malformed subject claim: %p', async sub => {
    await expect(strategy().validate({ sub })).rejects.toThrow();
  });
});

describe('Course content boundaries', () => {
  const course = { id: 10, collegeId: 7, instructorId: 4, published: true, status: CourseStatus.APPROVED, assignedColleges: [{ id: 8 }] } as Course;
  const enrolled = { findOne: jest.fn() };
  const access = new CourseContentService({ findOne: jest.fn().mockResolvedValue(course) } as any, enrolled as any);
  beforeEach(() => enrolled.findOne.mockResolvedValue(null));
  it('lets visitors scan published curriculum without reading content', async () => {
    expect(access.canPreview(undefined, course)).toBe(true);
    expect(await access.canRead(undefined, course)).toBe(false);
  });
  it('requires enrollment for same-college students', async () => {
    const user = { sub: 2, role: UserRole.STUDENT, collegeId: 7 };
    expect(await access.canRead(user, course)).toBe(false);
    enrolled.findOne.mockResolvedValue({ id: 1 });
    expect(await access.canRead(user, course)).toBe(true);
  });
  it('allows enrolled students in an assigned college', async () => {
    enrolled.findOne.mockResolvedValue({ id: 1 });
    expect(await access.canRead({ sub: 2, role: UserRole.STUDENT, collegeId: 8 }, course)).toBe(true);
  });
  it('does not let a historical enrollment bypass a changed college assignment', async () => {
    enrolled.findOne.mockResolvedValue({ id: 1 });
    await expect(access.requireRead({ sub: 2, role: UserRole.STUDENT, collegeId: 99 }, 10)).rejects.toThrow();
  });
  it('allows the owner to edit drafts and denies students even if enrolled', async () => {
    enrolled.findOne.mockResolvedValue({ id: 1 });
    const draft = { ...course, published: false };
    expect(await access.canRead({ sub: 4, role: UserRole.INSTRUCTOR, collegeId: 7 }, draft)).toBe(true);
    expect(await access.canRead({ sub: 2, role: UserRole.STUDENT, collegeId: 7 }, draft)).toBe(false);
  });
  it('strips rich content, URLs, resources and draft lessons from public curriculum', () => {
    const result = coursePreview({ ...course, modules: [{ id: 1, chapters: [{ id: 2, lessons: [
      { id: 1, published: true, title: 'Welcome', content: { secret: 'answer' }, videoUrl: 'private', resources: ['private'] },
      { id: 2, published: false, title: 'Draft' },
    ] }] }] });
    expect(result.modules[0].chapters[0].lessons).toHaveLength(1);
    expect(JSON.stringify(result)).not.toMatch(/answer|private|Draft/);
  });
});

describe('Response privacy', () => {
  it('omits passwords everywhere and allowlists public relation identities', () => {
    const person = { id: 1, name: 'Instructor', role: 'INSTRUCTOR', email: 'private@example.com', mobileNumber: 'private', passwordHash: 'secret' };
    const result = privateResponse({ user: person, courses: [{ instructor: person, approver: person }], replies: [{ author: person }] });
    expect(JSON.stringify(result)).not.toContain('secret');
    expect(result.courses[0].instructor).toEqual({ id: 1, name: 'Instructor', role: 'INSTRUCTOR', profilePicture: undefined });
    expect(result.replies[0].author.email).toBeUndefined();
    expect(result.user.email).toBe('private@example.com');
  });
});

describe('Browser mutation protection', () => {
  const origins = trustedOrigins({ NODE_ENV: 'test', FRONTEND_URL: 'https://college.example' });
  it('does not allow arbitrary hosted subdomains or local ports', () => {
    expect(origins.has('https://attacker.onrender.com')).toBe(false);
    expect(origins.has('http://localhost:9999')).toBe(false);
  });
  it.each([
    ['POST', 'https://college.example', true, true],
    ['POST', 'https://attacker.onrender.com', true, false],
    ['POST', undefined, true, false],
    ['POST', undefined, false, true],
    ['GET', undefined, true, true],
  ])('%s origin %s cookie %s permitted %s', (method, origin, cookie, permitted) => {
    const next = jest.fn();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    protectMutationOrigin(origins)({ method, cookies: cookie ? { access_token: 'token' } : {}, get: (key: string) => key === 'origin' ? origin : undefined } as any, response as any, next);
    expect(next).toHaveBeenCalledTimes(permitted ? 1 : 0);
    if (!permitted) expect(response.status).toHaveBeenCalledWith(403);
  });

  // Regression: a `.onrender.com` suffix rule once made every attacker-controlled
  // Render deployment a trusted first-party origin.
  it.each([
    'https://attacker.onrender.com',
    'https://lms-0-id5t.onrender.com.evil.com',
    'https://evil-lms-0-id5t.onrender.com',
  ])('does not trust look-alike host %s', host => {
    expect(isOriginTrusted(host, origins)).toBe(false);
  });

  it('still trusts the configured deployment origin exactly', () => {
    expect(isOriginTrusted('https://lms-0-id5t.onrender.com', trustedOrigins({ NODE_ENV: 'production' }))).toBe(true);
  });

  it('rejects a cookie mutation whose Referer is an untrusted origin', () => {
    const next = jest.fn();
    const response = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    protectMutationOrigin(origins)({
      method: 'POST',
      cookies: { access_token: 'token' },
      get: (key: string) => (key === 'referer' ? 'https://attacker.onrender.com/pay' : undefined),
    } as any, response as any, next);
    expect(next).not.toHaveBeenCalled();
    expect(response.status).toHaveBeenCalledWith(403);
  });
});
