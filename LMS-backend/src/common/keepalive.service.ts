import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class KeepAliveService implements OnModuleInit, OnModuleDestroy {
  private intervalId?: NodeJS.Timeout;
  private readonly logger = new Logger(KeepAliveService.name);

  constructor(@InjectDataSource() private dataSource: DataSource) {}

  onModuleInit() {
    // Ping every 4 minutes to prevent Neon cold starts
    this.intervalId = setInterval(
      async () => {
        try {
          await this.dataSource.query('SELECT 1');
        } catch (error: any) {
          this.logger.error('KeepAlive database ping failed', error?.stack || error?.message || error);
        }
      },
      4 * 60 * 1000,
    );
  }

  onModuleDestroy() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.logger.log('KeepAlive database ping interval cleared.');
    }
  }
}
