import { Controller, Get, Query, Res, NotFoundException, BadRequestException } from '@nestjs/common';
import { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { SebService } from './seb.service';

@ApiTags('SEB')
@Controller('seb')
export class SebController {
  constructor(
    private readonly seb: SebService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Download file .seb untuk sebuah ujian (publik, by access code).
   * Dibuka via navigasi browser → SEB auto-launch.
   */
  @Get('config')
  async getConfig(@Query('code') code: string, @Res() res: Response) {
    if (!code) throw new BadRequestException('Kode ujian wajib diisi');
    const exam = await this.prisma.exam.findUnique({ where: { accessCode: code.toUpperCase() } });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');

    const { plist } = await this.seb.generateForExam(exam.accessCode);
    const filename = `ujian-${exam.accessCode}.seb`;

    res.setHeader('Content-Type', 'application/seb');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(plist);
  }

  /** Info Config Key untuk debugging/verifikasi (publik, by access code). */
  @Get('config-key')
  async getConfigKey(@Query('code') code: string) {
    if (!code) throw new BadRequestException('Kode ujian wajib diisi');
    const exam = await this.prisma.exam.findUnique({ where: { accessCode: code.toUpperCase() } });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');
    const { configKey, startUrl } = await this.seb.generateForExam(exam.accessCode);
    return { configKey, startUrl };
  }
}
