import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DataSource } from 'typeorm';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService, private readonly dataSource: DataSource) {}

  // Lightweight warm-up target: wakes the server and the database connection.
  @Get('health')
  async health() {
    await this.dataSource.query('SELECT 1');
    return { ok: true };
  }

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }
}
