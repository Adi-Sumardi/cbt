import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SebService } from './seb.service';
import { SebController } from './seb.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SebController],
  providers: [SebService],
  exports: [SebService],
})
export class SebModule {}
