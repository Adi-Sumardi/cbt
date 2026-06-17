import { Controller, Post, Get, Param, UseGuards, Request, Body } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { SessionsService } from './sessions.service';
import { ExamGateway } from '../websocket/exam.gateway';

@ApiTags('Sessions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('sessions')
export class SessionsController {
  constructor(
    private readonly sessions: SessionsService,
    private readonly gateway: ExamGateway,
  ) {}

  @Post('exam/:examId/start')
  start(@Param('examId') examId: string, @Request() req: any) {
    return this.sessions.start(examId, req.user.id);
  }

  @Post(':sessionId/submit')
  submit(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessions.submit(sessionId, req.user.id);
  }

  @Post('exam-session/:sessionId/resume')
  resume(@Param('sessionId') sessionId: string, @Request() req: any) {
    return this.sessions.resume(sessionId, req.user.id);
  }

  @Get(':sessionId/timer')
  getTimer(@Param('sessionId') sessionId: string) {
    return this.sessions.getRemainingTime(sessionId);
  }

  @Post(':sessionId/violation')
  recordViolation(
    @Param('sessionId') sessionId: string,
    @Request() req: any,
    @Body() body: { type: string; detail?: string },
  ) {
    return this.sessions.recordViolation(sessionId, req.user.id, body.type, body.detail);
  }

  @Post(':sessionId/pardon')
  async pardonViolation(@Param('sessionId') sessionId: string) {
    const res = await this.sessions.pardonViolation(sessionId);
    this.gateway.broadcastViolationPardoned(sessionId);
    return res;
  }
}
