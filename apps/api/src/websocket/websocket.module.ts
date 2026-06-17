import { Module } from '@nestjs/common';
import { ExamGateway } from './exam.gateway';

@Module({
  providers: [ExamGateway],
  exports: [ExamGateway],
})
export class WebsocketModule {}
