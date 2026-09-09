import { AuthService } from './auth.service';
jest.mock('bcrypt', () => ({ compare: jest.fn().mockResolvedValue(true) }));

describe('Login college claims', () => {
  it('puts the resolved legacy college ID in both the JWT and login response', async () => {
    const service = Object.create(AuthService.prototype) as AuthService;
    const sign = jest.fn().mockReturnValue('test-token');
    Object.assign(service, {
      userRepository: { findOne: jest.fn().mockResolvedValue({ id: 1, email: 'admin@example.com', role: 'ADMIN', collegeName: 'University', passwordHash: 'hash', isActive: true }) },
      collegeRepository: { findOne: jest.fn().mockResolvedValue({ id: 7, name: 'University', active: true }) },
      jwtService: { sign },
    });
    const result = await service.login({ email: 'admin@example.com', password: 'test' });
    expect(result.user.collegeId).toBe(7);
    expect(sign).toHaveBeenCalledWith(expect.objectContaining({ collegeId: 7, role: 'ADMIN' }));
  });
});
