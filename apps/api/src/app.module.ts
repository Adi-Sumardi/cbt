import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import * as path from 'path';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ExamsModule } from './exams/exams.module';
import { QuestionsModule } from './questions/questions.module';
import { SessionsModule } from './sessions/sessions.module';
import { ResultsModule } from './results/results.module';
import { ImportModule } from './import/import.module';
import { UploadModule } from './upload/upload.module';
import { WebsocketModule } from './websocket/websocket.module';
import { AdminModule } from './admin/admin.module';
import { SebModule } from './seb/seb.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ServeStaticModule.forRoot({
      rootPath: path.join(process.cwd(), 'uploads'),
      serveRoot: '/uploads',
    }),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    ExamsModule,
    QuestionsModule,
    SessionsModule,
    ResultsModule,
    ImportModule,
    UploadModule,
    WebsocketModule,
    AdminModule,
    SebModule,
  ],
  providers: [],
})
export class AppModule {}
