import { Module } from '@nestjs/common';
import { SessionsController } from './sessions.controller';
import { SessionsService } from './sessions.service';
import { WebsocketModule } from '../websocket/websocket.module';
import { SebModule } from '../seb/seb.module';

@Module({
  imports: [WebsocketModule, SebModule],
  controllers: [SessionsController],
  providers: [SessionsService],
  exports: [SessionsService],
})
export class SessionsModule {}
