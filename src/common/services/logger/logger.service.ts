import { Injectable, LoggerService } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

import { Config } from '../../../config';

@Injectable()
export class CustomLoggerService implements LoggerService {
  private logger: winston.Logger;
  private isDevelopment: boolean;

  constructor(private configService: ConfigService<Config>) {
    this.isDevelopment = this.configService.get('NODE_ENV') === 'dev';
    this.createLogger();
  }

  private createLogger(): void {
    const logPath = this.configService.get('LOG_PATH');

    const transports: winston.transport[] = [
      new DailyRotateFile({
        filename: `${logPath}/error-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'error',
        format: winston.format.combine(winston.format.timestamp(), winston.format.errors({ stack: true }), winston.format.json()),
        maxSize: '20m',
        maxFiles: '14d',
      }),

      new DailyRotateFile({
        filename: `${logPath}/warn-%DATE%.log`,
        datePattern: 'YYYY-MM-DD',
        level: 'warn',
        format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
        maxSize: '20m',
        maxFiles: '14d',
      }),
    ];

    if (this.isDevelopment) {
      transports.push(
        new DailyRotateFile({
          filename: `${logPath}/info-%DATE%.log`,
          datePattern: 'YYYY-MM-DD',
          level: 'info',
          format: winston.format.combine(winston.format.timestamp(), winston.format.json()),
          maxSize: '20m',
          maxFiles: '14d',
        }),
      );
    }

    const consoleLevel = this.isDevelopment ? 'debug' : 'warn';
    transports.push(
      new winston.transports.Console({
        level: consoleLevel,
        format: winston.format.combine(
          winston.format.colorize(),
          winston.format.timestamp({ format: 'HH:mm:ss' }),
          winston.format.printf((info: winston.Logform.TransformableInfo) => {
            const { timestamp, level, message, context, ...meta } = info;

            const contextStr = typeof context === 'string' ? `[${context}] ` : '';
            const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
            return `${timestamp as string} ${level}: ${contextStr}${String(message)}${metaStr}`;
          }),
        ),
      }),
    );

    this.logger = winston.createLogger({
      level: this.isDevelopment ? 'debug' : 'info',
      transports,
      exitOnError: false,
    });
  }

  public log(message: string, context?: string): void {
    this.logger.info(message, { context });
  }

  public error(message: string, trace?: string, context?: string): void {
    this.logger.error(message, { trace, context });
  }

  public warn(message: string, context?: string): void {
    this.logger.warn(message, { context });
  }

  public debug(message: string, context?: string): void {
    this.logger.debug(message, { context });
  }

  public verbose(message: string, context?: string): void {
    this.logger.verbose(message, { context });
  }

  public logApiRequest(method: string, url: string, statusCode: number, responseTime: number): void {
    this.logger.info('API Request', {
      method,
      url,
      statusCode,
      responseTime,
      context: 'HTTP',
    });
  }

  public logDataChange(operation: string, entityType: string, entityId: string, nodeId: string): void {
    this.logger.info('Data Change', {
      operation,
      entityType,
      entityId,
      nodeId,
      context: 'DATA',
    });
  }

  public logDistributedEvent(event: string, nodeId: string, details?: any): void {
    this.logger.info('Distributed Event', {
      event,
      nodeId,
      details,
      context: 'DISTRIBUTED',
    });
  }

  public logStatistics(coasterId: string, stats: any): void {
    this.logger.debug('Statistics Update', {
      coasterId,
      stats,
      context: 'STATS',
    });
  }
}
