import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response, Request } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: exception.message || 'Internal server error' };

    const isProduction = process.env.NODE_ENV === 'production';

    // Log the error without stack traces in production (unless internal error)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        `${request.method} ${request.url} failed: ${exception.stack || exception.message || exception}`,
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} failed with status ${status}: ${JSON.stringify(message)}`,
      );
    }

    const responseBody = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === 'object' ? (message as object) : { message }),
    };

    // Hide internal details in production
    if (status === HttpStatus.INTERNAL_SERVER_ERROR && isProduction) {
      responseBody['message'] = 'Internal server error';
    }

    response.status(status).json(responseBody);
  }
}
