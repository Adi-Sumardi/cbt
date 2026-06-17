import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ExamStatus } from '@prisma/client';

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(teacherId: string, data: any) {
    const accessCode = generateAccessCode();
    return this.prisma.exam.create({
      data: { ...data, teacherId, accessCode },
      include: { questions: { include: { options: true } } },
    });
  }

  async findAll(teacherId: string) {
    return this.prisma.exam.findMany({
      where: { teacherId },
      include: { _count: { select: { questions: true, sessions: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id },
      include: {
        questions: {
          orderBy: { order: 'asc' },
          include: { options: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');
    return exam;
  }

  async update(id: string, teacherId: string, data: any) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');
    if (exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.update({ where: { id }, data });
  }

  async setStatus(id: string, teacherId: string, status: ExamStatus) {
    const exam = await this.prisma.exam.findUnique({ where: { id } });
    if (!exam) throw new NotFoundException();
    if (exam.teacherId !== teacherId) throw new ForbiddenException();
    return this.prisma.exam.update({ where: { id }, data: { status } });
  }

  async getLiveMonitor(examId: string) {
    return this.prisma.examSession.findMany({
      where: { examId },
      include: {
        student: { select: { id: true, name: true, nis: true } },
        _count: { select: { answers: true } },
      },
    });
  }
}
