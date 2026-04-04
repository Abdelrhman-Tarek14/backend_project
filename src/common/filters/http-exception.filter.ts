import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse: any =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as Error).message, statusCode: HttpStatus.INTERNAL_SERVER_ERROR };

    const message = typeof errorResponse === 'object' ? errorResponse.message : errorResponse;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : undefined,
    });
  }
}
