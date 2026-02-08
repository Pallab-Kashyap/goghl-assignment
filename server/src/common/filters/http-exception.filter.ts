import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('ExceptionFilter');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status: number;
    let message: string | object;
    let errorName: string;
    let stack: string | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === 'object'
          ? exceptionResponse
          : { message: exceptionResponse };
      errorName = exception.name;
      stack = exception.stack;
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: 'Internal server error' };
      errorName = exception.name;
      stack = exception.stack;
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = { message: 'Unknown error occurred' };
      errorName = 'UnknownError';
    }

    const errorDetails = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      statusCode: status,
      errorName,
      message,
      body: request.body,
      query: request.query,
      params: request.params,
      headers: {
        'user-agent': request.headers['user-agent'],
        'content-type': request.headers['content-type'],
        authorization: request.headers['authorization']
          ? '[REDACTED]'
          : undefined,
      },
      user: (request as any).user?.id || 'anonymous',
    };

    // Log error with full details
    this.logger.error(
      `\n========== ERROR ==========\n` +
        `Timestamp: ${errorDetails.timestamp}\n` +
        `Method: ${errorDetails.method}\n` +
        `Path: ${errorDetails.path}\n` +
        `Status: ${errorDetails.statusCode}\n` +
        `Error: ${errorDetails.errorName}\n` +
        `Message: ${JSON.stringify(errorDetails.message, null, 2)}\n` +
        `User: ${errorDetails.user}\n` +
        `Query: ${JSON.stringify(errorDetails.query)}\n` +
        `Params: ${JSON.stringify(errorDetails.params)}\n` +
        `Body: ${JSON.stringify(errorDetails.body, null, 2)}\n` +
        `Headers: ${JSON.stringify(errorDetails.headers, null, 2)}\n` +
        `Stack: ${stack || 'N/A'}\n` +
        `===========================\n`,
    );

    response.status(status).json({
      statusCode: status,
      timestamp: errorDetails.timestamp,
      path: request.url,
      ...(typeof message === 'object' ? message : { message }),
    });
  }
}
