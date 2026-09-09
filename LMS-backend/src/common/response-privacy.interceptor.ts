import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { map } from 'rxjs/operators';

const publicRelations = new Set(['author', 'instructor', 'approver']);
const secretKeys = new Set(['password', 'passwordHash', 'password_hash']);

/** Public identity is deliberately smaller than an account-management profile. */
export function privateResponse(value: any, relation?: string): any {
  if (!value || typeof value !== 'object' || value instanceof Date || Buffer.isBuffer(value)) return value;
  if (Array.isArray(value)) return value.map(item => privateResponse(item, relation));
  if (relation && publicRelations.has(relation)) {
    const { id, name, role, profilePicture } = value;
    return { id, name, role, profilePicture };
  }
  return Object.fromEntries(Object.entries(value)
    .filter(([key]) => !secretKeys.has(key))
    .map(([key, entry]) => [key, privateResponse(entry, key)]));
}

@Injectable()
export class ResponsePrivacyInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler) {
    return next.handle().pipe(map(value => privateResponse(value)));
  }
}
