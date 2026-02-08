import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { toNodeHandler } from 'better-auth/node';
import { auth } from './better-auth';

@Injectable()
export class BetterAuthMiddleware implements NestMiddleware {
  private handler = toNodeHandler(auth);

  async use(req: Request, res: Response, next: NextFunction) {
    // Handle all sign-in and callback routes with better-auth
    console.log('BetterAuthMiddleware handling:', req.path);
    return this.handler(req, res);
  }
}
