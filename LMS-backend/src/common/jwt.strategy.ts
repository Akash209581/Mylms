import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { College } from '../entities/college.entity';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';

// Every authenticated request used to run two DB round trips (user + college)
// before its handler started. Principals are cached briefly; any mutating
// request clears the cache (see main.ts) so role/active changes apply at once.
const PRINCIPAL_TTL_MS = 15_000;
const principalCache = new Map<number, { value: any; expires: number }>();
export function clearAuthCache() {
  principalCache.clear();
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService,
    @InjectRepository(User) private users: Repository<User>,
    @InjectRepository(College) private colleges: Repository<College>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is required');
    }
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => {
          return req?.cookies?.access_token || null;
        },
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  async validate(payload: any) {
    if (!Number.isInteger(payload.sub) || payload.sub <= 0) throw new UnauthorizedException();
    const hit = principalCache.get(payload.sub);
    if (hit && hit.expires > Date.now()) return hit.value;
    const principal = await this.loadPrincipal(payload.sub);
    if (principalCache.size > 5000) principalCache.clear();
    principalCache.set(payload.sub, { value: principal, expires: Date.now() + PRINCIPAL_TTL_MS });
    return principal;
  }

  private async loadPrincipal(userId: number) {
    const user = await this.users.findOne({ where: { id: userId } });
    if (!user?.isActive) throw new UnauthorizedException('Account is unavailable');
    const college = user.collegeId
      ? await this.colleges.findOne({ where: { id: user.collegeId } })
      : user.collegeName ? await this.colleges.findOne({ where: { name: user.collegeName } }) : null;
    if ((user.collegeId || user.collegeName) && !college?.active) {
      throw new UnauthorizedException('College is unavailable');
    }
    const rawRoles: any = user.roles || (user.role ? [user.role] : []);
    const userRoles: string[] = (
      Array.isArray(rawRoles)
        ? rawRoles
        : typeof rawRoles === 'string'
        ? rawRoles.split(',')
        : []
    ).map((r) => String(r).trim()).filter(Boolean);
    if (userRoles.length === 0 && user.role) userRoles.push(user.role);

    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      roles: userRoles,
      name: user.name,
      collegeId: college?.id,
      collegeName: college?.name,
    };
  }
}
