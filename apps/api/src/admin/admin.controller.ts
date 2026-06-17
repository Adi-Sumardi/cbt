import { Controller, Get, Patch, Body, Query, Res, UseGuards, BadRequestException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminService } from './admin.service';

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  @Get('exams')
  getExamList() {
    return this.adminService.getExamList();
  }

  @Get('reports/by-student')
  getReportByStudent(@Query('examId') examId?: string) {
    return this.adminService.getReportByStudent(examId);
  }

  @Get('reports/by-class')
  getReportByClass(@Query('examId') examId?: string) {
    return this.adminService.getReportByClass(examId);
  }

  @Get('reports/question-stats')
  getQuestionStats(@Query('examId') examId: string) {
    if (!examId) throw new BadRequestException('examId wajib diisi');
    return this.adminService.getReportQuestionStats(examId);
  }

  @Get('reports/attendance')
  getAttendance(@Query('examId') examId: string) {
    if (!examId) throw new BadRequestException('examId wajib diisi');
    return this.adminService.getReportAttendance(examId);
  }

  @Get('reports/export')
  async exportReport(
    @Query('type') type: string,
    @Query('examId') examId: string,
    @Res() res: Response,
  ) {
    if (!['student', 'class', 'attendance'].includes(type)) {
      throw new BadRequestException('type tidak valid');
    }
    const { buffer, filename } = await this.adminService.exportReport(type as any, examId);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.send(buffer);
  }

  @Get('settings')
  getAppSettings() {
    return this.adminService.getAppSettings();
  }

  @Patch('settings')
  updateAppSettings(@Body() body: Record<string, string>) {
    return this.adminService.updateAppSettings(body);
  }

  @Get('backup')
  downloadBackup(@Res() res: Response) {
    try {
      const buffer = this.adminService.getDatabaseBackup();
      const date = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Disposition', `attachment; filename="backup_cbt_${date}.sql"`);
      res.setHeader('Content-Type', 'application/sql');
      res.send(buffer);
    } catch (e: any) {
      throw new BadRequestException('Backup gagal: ' + e.message);
    }
  }
}
