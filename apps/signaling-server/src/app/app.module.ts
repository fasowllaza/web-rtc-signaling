import { Module } from '@nestjs/common';
import { SignalingModule } from '../signaling/signaling.module';

@Module({
  imports: [SignalingModule],
})
export class AppModule {}
