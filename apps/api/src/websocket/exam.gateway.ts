import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject } from '@nestjs/common';
import { REDIS_CLIENT } from '../redis/redis.module';
import Redis from 'ioredis';

@WebSocketGateway({ cors: { origin: '*' }, namespace: '/exam' })
export class ExamGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async handleConnection(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string;
    const role = client.handshake.query.role as string;

    if (sessionId) {
      client.join(`session:${sessionId}`);
    }
    if (role === 'teacher') {
      const examId = client.handshake.query.examId as string;
      if (examId) client.join(`exam:${examId}:teacher`);
    }
    if (role === 'student') {
      const examId = client.handshake.query.examId as string;
      if (examId) client.join(`exam:${examId}:students`);
    }
  }

  async handleDisconnect(client: Socket) {
    const sessionId = client.handshake.query.sessionId as string;
    if (sessionId) {
      await this.redis.hset(`session:${sessionId}:status`, 'connected', '0');
      this.server.to(`exam:${client.handshake.query.examId}:teacher`).emit('student:disconnect', {
        sessionId,
        at: new Date().toISOString(),
      });
    }
  }

  // Guru: edit soal saat ujian berlangsung
  broadcastQuestionUpdate(examId: string, question: any) {
    this.server.to(`exam:${examId}:students`).emit('question:updated', question);
  }

  // Guru: anulir soal
  broadcastQuestionNullified(examId: string, questionId: string) {
    this.server.to(`exam:${examId}:students`).emit('question:nullified', { questionId });
  }

  // Siswa: autosave jawaban
  @SubscribeMessage('answer:save')
  async handleAnswerSave(
    @MessageBody() data: { sessionId: string; questionId: string; answer: string; isDoubtful: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    await this.redis.hset(
      `session:${data.sessionId}:answers`,
      data.questionId,
      JSON.stringify({ answer: data.answer, isDoubtful: data.isDoubtful, savedAt: Date.now() }),
    );
    client.emit('answer:saved', { questionId: data.questionId, savedAt: Date.now() });
  }

  // Siswa: log event (blur/focus tab)
  @SubscribeMessage('activity:log')
  async handleActivityLog(
    @MessageBody() data: { sessionId: string; examId: string; event: string; studentName?: string; metadata?: any },
    @ConnectedSocket() _client: Socket,
  ) {
    const logKey = `session:${data.sessionId}:logs`;
    await this.redis.rpush(logKey, JSON.stringify({ ...data, at: Date.now() }));

    this.server.to(`exam:${data.examId}:teacher`).emit('student:activity', data);
  }

  // Guru: pengampunan / reset pelanggaran
  broadcastViolationPardoned(sessionId: string) {
    this.server.to(`session:${sessionId}`).emit('violation:pardoned', { sessionId });
  }

  // Guru: broadcast pengumuman ujian
  @SubscribeMessage('announcement:broadcast')
  async handleAnnouncementBroadcast(
    @MessageBody() data: { examId: string; message: string },
  ) {
    this.server.to(`exam:${data.examId}:students`).emit('announcement:received', { message: data.message });
  }

  // Broadcast timer warning ke semua siswa ujian
  broadcastTimerWarning(examId: string, remainingSeconds: number) {
    this.server.to(`exam:${examId}`).emit('timer:warning', { remainingSeconds });
  }
}
