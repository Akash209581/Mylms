import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor() {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    return req?.cookies?.access_token || null;
                },
                ExtractJwt.fromAuthHeaderAsBearerToken(),
            ]),
            ignoreExpiration: false,
            secretOrKey: process.env.JWT_SECRET || 'lms_jwt_secret_key_2024',
        });
    }

    async validate(payload: any) {
        return { sub: payload.sub, email: payload.email, role: payload.role, name: payload.name };
    }
}
