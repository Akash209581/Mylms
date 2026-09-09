import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { College } from '../entities/college.entity';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

import { ConfigService } from '@nestjs/config';

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
    const user = await this.users.findOne({ where: { id: payload.sub } });
    if (!user?.isActive) throw new UnauthorizedException('Account is unavailable');
    const college = user.collegeId
      ? await this.colleges.findOne({ where: { id: user.collegeId } })
      : user.collegeName ? await this.colleges.findOne({ where: { name: user.collegeName } }) : null;
    if ((user.collegeId || user.collegeName) && !college?.active) {
      throw new UnauthorizedException('College is unavailable');
    }
    return {
      sub: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
      collegeId: college?.id,
      collegeName: college?.name,
    };
  }
}
