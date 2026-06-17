import { Controller, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { QuestionsService } from './questions.service';
import { ExamGateway } from '../websocket/exam.gateway';

@ApiTags('Questions')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('exams/:examId/questions')
export class QuestionsController {
  constructor(
    private readonly questions: QuestionsService,
    private readonly gateway: ExamGateway,
  ) {}

  @Post()
  create(@Param('examId') examId: string, @Body() dto: any) {
    return this.questions.create(examId, dto);
  }

  @Post('bulk')
  importBulk(@Param('examId') examId: string, @Body() body: { questions: any[] }) {
    return this.questions.importBulk(examId, body.questions);
  }

  @Patch(':questionId')
  async update(
    @Param('examId') examId: string,
    @Param('questionId') questionId: string,
    @Body() dto: any,
  ) {
    const updated = await this.questions.update(questionId, dto);
    // Broadcast ke semua siswa yang sedang ujian
    this.gateway.broadcastQuestionUpdate(examId, updated);
    return updated;
  }

  @Patch(':questionId/nullify')
  async nullify(@Param('examId') examId: string, @Param('questionId') questionId: string) {
    const result = await this.questions.nullify(questionId);
    this.gateway.broadcastQuestionNullified(examId, questionId);
    return result;
  }

  @Patch('reorder')
  reorder(@Param('examId') examId: string, @Body() body: { orderedIds: string[] }) {
    return this.questions.reorder(examId, body.orderedIds);
  }

  @Delete(':questionId')
  delete(@Param('questionId') questionId: string) {
    return this.questions.delete(questionId);
  }
}
