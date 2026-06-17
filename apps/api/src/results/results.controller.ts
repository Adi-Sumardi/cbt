import { Controller, Get, Param, Res, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { ResultsService } from './results.service';

@ApiTags('Results')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('results')
export class ResultsController {
  constructor(private readonly results: ResultsService) {}

  @Get('exam/:examId')
  getExamResults(@Param('examId') examId: string) {
    return this.results.getExamResults(examId);
  }

  @Get('session/:sessionId')
  getStudentResult(@Param('sessionId') sessionId: string) {
    return this.results.getStudentResult(sessionId);
  }

  @Get('exam/:examId/analysis')
  getQuestionAnalysis(@Param('examId') examId: string) {
    return this.results.getQuestionAnalysis(examId);
  }

  @Get('exam/:examId/export')
  async exportExamResults(@Param('examId') examId: string, @Res() res: Response) {
    const buffer = await this.results.exportToExcel(examId);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="hasil-ujian-${examId}.xlsx"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }
}
