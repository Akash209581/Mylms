import { Module } from '@nestjs/common';
import { MadmeetGateway } from './madmeet.gateway';

@Module({
  providers: [MadmeetGateway],
  exports: [MadmeetGateway],
})
export class MadmeetModule {}
