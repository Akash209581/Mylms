import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class KeepAliveService implements OnModuleInit {
  constructor(@InjectDataSource() private dataSource: DataSource) {}

  onModuleInit() {
    // Ping every 4 minutes to prevent Neon cold starts
    setInterval(
      async () => {
        try {
          await this.dataSource.query('SELECT 1');
        } catch {}
      },
      4 * 60 * 1000,
    );
  }
}
