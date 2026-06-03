import { Request } from 'express';
import { UserRole } from '../entities/user.entity';

export interface AuthenticatedUser {
  sub: number;
  email: string;
  role: UserRole;
  name: string;
  collegeId?: number;
  collegeName?: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
