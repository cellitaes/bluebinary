import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class LoggerMiddleware implements NestMiddleware {
  private logger = new Logger('Request');

  public use(req: Request, _: Response, next: NextFunction): void {
    this.logger.log(`${req.method} ${req.originalUrl}`);
    next();
  }
}
