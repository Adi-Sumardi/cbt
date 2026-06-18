import { Injectable, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { SebService } from '../seb/seb.service';
import Redis from 'ioredis';

export interface SebContext {
  userAgent?: string;
  configKeyHash?: string;
  fullUrl: string;
}

function seededShuffle<T>(array: T[], seed: string): T[] {
  const copy = [...array];
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    const j = Math.abs(h) % (i + 1);
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }
  return copy;
}

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    private readonly seb: SebService,
  ) {}

  async start(accessCode: string, studentId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { accessCode },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
    if (!exam) throw new NotFoundException('Kode ujian tidak valid');
    if (exam.status !== 'ACTIVE') throw new BadRequestException('Ujian belum aktif');

    const examId = exam.id;

    let session = await this.prisma.examSession.findUnique({
      where: { examId_studentId: { examId, studentId } },
    });

    if (session && session.status === 'SUBMITTED') {
      throw new BadRequestException('Ujian sudah dikerjakan');
    }

    if (!session) {
      let questionOrder = exam.questions.map((q) => q.id);
      if (exam.shuffleQuestions) {
        questionOrder = questionOrder.sort(() => Math.random() - 0.5);
      }

      session = await this.prisma.examSession.create({
        data: {
          examId,
          studentId,
          status: 'IN_PROGRESS',
          startedAt: new Date(),
          questionOrder,
        },
      });
    } else if (session.status === 'NOT_STARTED') {
      session = await this.prisma.examSession.update({
        where: { id: session.id },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      });
    }

    // Simpan timer di Redis
    const timerKey = `session:${session.id}:timer`;
    const existing = await this.redis.get(timerKey);
    if (!existing) {
      const endTime = Date.now() + exam.duration * 60 * 1000;
      await this.redis.set(timerKey, endTime.toString(), 'EX', exam.duration * 60 + 60);
    }

    // Ambil jawaban sementara dari Redis
    const savedAnswers = await this.redis.hgetall(`session:${session.id}:answers`);

    return {
      session,
      exam: {
        ...exam,
        questions: exam.questions.map((q) => ({
          ...q,
          options: exam.shuffleOptions ? seededShuffle(q.options, `${session.id}-${q.id}`) : q.options,
          isCorrect: undefined,
        })),
      },
      savedAnswers,
    };
  }

  async submit(sessionId: string, studentId: string) {
    // Sinkronisasi jawaban sementara siswa dari Redis ke PostgreSQL
    const savedAnswers = await this.redis.hgetall(`session:${sessionId}:answers`);

    if (savedAnswers && Object.keys(savedAnswers).length > 0) {
      const upserts = Object.entries(savedAnswers).map(([questionId, answerStr]) => {
        try {
          const parsed = JSON.parse(answerStr);
          return this.prisma.studentAnswer.upsert({
            where: {
              sessionId_questionId: {
                sessionId,
                questionId,
              },
            },
            create: {
              sessionId,
              questionId,
              answer: parsed.answer,
              isDoubtful: parsed.isDoubtful || false,
              savedAt: new Date(parsed.savedAt || Date.now()),
            },
            update: {
              answer: parsed.answer,
              isDoubtful: parsed.isDoubtful || false,
              savedAt: new Date(parsed.savedAt || Date.now()),
            },
          });
        } catch (err) {
          console.error(`Failed to parse cached answer for question ${questionId}:`, err);
          return null;
        }
      }).filter(Boolean);

      if (upserts.length > 0) {
        await this.prisma.$transaction(upserts as any);
      }
    }

    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: { include: { questions: { include: { options: true } } } },
        answers: true,
      },
    });

    if (!session || session.studentId !== studentId) throw new NotFoundException();
    if (session.status === 'SUBMITTED') throw new BadRequestException('Sudah disubmit');

    // Hitung skor
    let totalPoints = 0;
    let earnedPoints = 0;

    for (const question of session.exam.questions) {
      if (question.isNullified) {
        earnedPoints += question.points; // soal dianulir = semua dapat poin
        totalPoints += question.points;
        continue;
      }
      totalPoints += question.points;
      const studentAnswer = session.answers.find((a) => a.questionId === question.id);
      if (!studentAnswer || !studentAnswer.answer) continue;

      const answer = studentAnswer.answer;

      switch (question.type) {
        case 'MULTIPLE_CHOICE':
        case 'TRUE_FALSE': {
          const correctOption = question.options.find((o) => o.isCorrect);
          if (correctOption && answer === correctOption.id) {
            earnedPoints += question.points;
          }
          break;
        }

        case 'MULTIPLE_ANSWER': {
          const correctIds = question.options.filter((o) => o.isCorrect).map((o) => o.id);
          const studentIds = answer.split(',').filter(Boolean);
          const matched = studentIds.filter((id) => correctIds.includes(id)).length;
          const wrong = studentIds.filter((id) => !correctIds.includes(id)).length;
          const partial = Math.max(0, (matched - wrong) / Math.max(1, correctIds.length));
          earnedPoints += partial * question.points;
          break;
        }

        case 'SHORT_ANSWER': {
          const correctText = question.options[0]?.content ?? '';
          if (answer.trim().toLowerCase() === correctText.trim().toLowerCase()) {
            earnedPoints += question.points;
          }
          break;
        }

        case 'FILL_BLANK': {
          let parsed: Record<string, string> = {};
          try { parsed = JSON.parse(answer); } catch { break; }
          const blanks = question.options.filter((o) => o.isCorrect);
          if (blanks.length === 0) break;
          let correctBlanks = 0;
          for (const blank of blanks) {
            const studentVal = (parsed[blank.label] ?? '').trim().toLowerCase();
            if (studentVal === blank.content.trim().toLowerCase()) correctBlanks++;
          }
          earnedPoints += (correctBlanks / blanks.length) * question.points;
          break;
        }

        case 'MATCHING': {
          let parsed: Record<string, string> = {};
          try { parsed = JSON.parse(answer); } catch { break; }
          const pairs = question.options;
          if (pairs.length === 0) break;
          let correctPairs = 0;
          for (const pair of pairs) {
            const rightText = pair.content.split('|||')[1] ?? '';
            const studentRight = (parsed[pair.id] ?? '').trim().toLowerCase();
            if (studentRight === rightText.trim().toLowerCase()) correctPairs++;
          }
          earnedPoints += (correctPairs / pairs.length) * question.points;
          break;
        }

        case 'ESSAY':
          // Tidak dinilai otomatis
          break;
      }
    }

    const rawScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;
    const penaltyScore = (session as any).penaltyScore ?? 0;
    const score = Math.max(0, rawScore - penaltyScore);

    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: { status: 'SUBMITTED', submittedAt: new Date(), score },
    });

    // Hapus data sementara dari Redis
    await this.redis.del(`session:${sessionId}:answers`);
    await this.redis.del(`session:${sessionId}:timer`);

    return { session: updated, score, passed: score >= session.exam.passingScore };
  }

  async resume(sessionId: string, studentId: string, sebCtx?: SebContext) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: {
          include: {
            questions: { include: { options: { orderBy: { order: 'asc' } } } },
          },
        },
      },
    });

    if (!session || session.studentId !== studentId) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status === 'SUBMITTED') throw new BadRequestException('Ujian sudah dikumpulkan');

    // Verifikasi Safe Exam Browser (jika ujian mewajibkan SEB)
    if (session.exam.requireSeb && sebCtx) {
      const { configKey } = await this.seb.generateForExam(session.exam.accessCode);
      const verdict = await this.seb.verifyRequest({
        userAgent: sebCtx.userAgent,
        configKeyHash: sebCtx.configKeyHash,
        fullUrl: sebCtx.fullUrl,
        configKey,
      });
      if (!verdict.ok) {
        // Jangan beri data ujian — kembalikan instruksi pakai SEB
        return { sebRequired: true, accessCode: session.exam.accessCode, reason: verdict.reason };
      }
    }

    // Restore question order
    const questionOrder = session.questionOrder as string[];
    const orderedQuestions = questionOrder.length > 0
      ? questionOrder
          .map((id) => session.exam.questions.find((q) => q.id === id))
          .filter(Boolean)
      : session.exam.questions;

    const savedAnswers = await this.redis.hgetall(`session:${sessionId}:answers`);

    return {
      session,
      exam: {
        ...session.exam,
        questions: orderedQuestions.map((q: any) => ({
          ...q,
          options: session.exam.shuffleOptions ? seededShuffle(q.options, `${session.id}-${q.id}`) : q.options,
          isCorrect: undefined,
        })),
      },
      savedAnswers,
    };
  }

  async getRemainingTime(sessionId: string): Promise<number> {
    const timerKey = `session:${sessionId}:timer`;
    const endTime = await this.redis.get(timerKey);
    if (!endTime) return 0;
    const remaining = Math.max(0, parseInt(endTime) - Date.now());
    return Math.floor(remaining / 1000);
  }

  async recordViolation(sessionId: string, studentId: string, type: string, detail?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });

    if (!session || session.studentId !== studentId) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status === 'SUBMITTED') throw new BadRequestException('Ujian sudah dikumpulkan');

    const currentCount = (session as any).violationCount ?? 0;
    const currentViolations: any[] = (session as any).violations ?? [];
    const newCount = currentCount + 1;

    const newViolation = {
      type,
      detail: detail ?? '',
      timestamp: new Date().toISOString(),
      count: newCount,
    };

    const updatedViolations = [...currentViolations, newViolation];

    // Escalating penalty: 5, 10, 20, 40, 80, ...
    const additionalPenalty = 5 * Math.pow(2, currentCount);
    const currentPenalty = (session as any).penaltyScore ?? 0;
    const newPenalty = currentPenalty + additionalPenalty;
    const updated = await this.prisma.examSession.update({
      where: { id: sessionId },
      data: {
        violationCount: newCount,
        violations: updatedViolations,
        penaltyScore: newPenalty,
      } as any,
    });

    const autoSubmit = newCount >= 5;

    return {
      violationCount: newCount,
      totalPenalty: newPenalty,
      autoSubmit,
    };
  }

  async pardonViolation(sessionId: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) throw new NotFoundException('Sesi tidak ditemukan');
    if (session.status === 'SUBMITTED') throw new BadRequestException('Ujian sudah dikumpulkan');

    await this.prisma.examSession.update({
      where: { id: sessionId },
      data: {
        violationCount: 0,
        violations: [],
        penaltyScore: 0,
      },
    });

    return {
      violationCount: 0,
      totalPenalty: 0,
    };
  }
}
