import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = process.env.INTEGRATIONS_API_KEY || '';
    const isDev = (process.env.APP_ENV || 'development') === 'development';

    // ponytail: no key in development → allow (non-dev requires INTEGRATIONS_API_KEY at boot)
    if (!expected && isDev) {
      return true;
    }

    const req = context.switchToHttp().getRequest<Request>();
    const fromHeader = req.header('x-api-key');
    const auth = req.header('authorization');
    const fromBearer =
      auth && auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : undefined;
    const provided = fromHeader || fromBearer;

    if (!expected || provided !== expected) {
      throw new UnauthorizedException('invalid api key');
    }
    return true;
  }
}
