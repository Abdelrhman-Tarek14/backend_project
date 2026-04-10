import { Injectable } from '@nestjs/common';
import { version } from '../package.json'
@Injectable()
export class AppService {
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      version,
    };
  }
}
