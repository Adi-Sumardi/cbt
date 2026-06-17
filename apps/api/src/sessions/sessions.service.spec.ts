import { Test, TestingModule } from '@nestjs/testing';
import { SessionsService } from './sessions.service';
import { PrismaService } from '../prisma/prisma.service';
import { REDIS_CLIENT } from '../redis/redis.module';
import { NotFoundException, BadRequestException } from '@nestjs/common';

const mockExam = {
  id: 'exam-1',
  title: 'Ujian Matematika',
  status: 'ACTIVE',
  duration: 60,
  passingScore: 70,
  shuffleQuestions: false,
  shuffleOptions: false,
  questions: [
    {
      id: 'q-1', content: 'Soal 1', type: 'MULTIPLE_CHOICE', points: 10, order: 1, isNullified: false,
      options: [
        { id: 'opt-a', label: 'A', content: 'Jawaban A', isCorrect: false, order: 1 },
        { id: 'opt-b', label: 'B', content: 'Jawaban B', isCorrect: true, order: 2 },
      ],
    },
    {
      id: 'q-2', content: 'Soal 2', type: 'MULTIPLE_CHOICE', points: 10, order: 2, isNullified: false,
      options: [
        { id: 'opt-c', label: 'A', content: 'Benar', isCorrect: true, order: 1 },
        { id: 'opt-d', label: 'B', content: 'Salah', isCorrect: false, order: 2 },
      ],
    },
  ],
};

const mockSession = {
  id: 'session-1',
  examId: 'exam-1',
  studentId: 'student-1',
  status: 'IN_PROGRESS',
  startedAt: new Date(),
  questionOrder: ['q-1', 'q-2'],
};

const mockPrisma = {
  exam: {
    findUnique: jest.fn(),
  },
  examSession: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
};

const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  hgetall: jest.fn(),
  del: jest.fn(),
};

describe('SessionsService', () => {
  let service: SessionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SessionsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: REDIS_CLIENT, useValue: mockRedis },
      ],
    }).compile();

    service = module.get<SessionsService>(SessionsService);
    jest.clearAllMocks();
  });

  describe('start', () => {
    it('should create a new session for an active exam', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      mockPrisma.examSession.create.mockResolvedValue(mockSession);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.start('exam-1', 'student-1');

      expect(mockPrisma.examSession.create).toHaveBeenCalled();
      expect(result.session).toBeDefined();
      expect(result.exam).toBeDefined();
    });

    it('should throw BadRequestException if exam is not ACTIVE', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue({ ...mockExam, status: 'DRAFT' });

      await expect(service.start('exam-1', 'student-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if session already SUBMITTED', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      mockPrisma.examSession.findUnique.mockResolvedValue({ ...mockSession, status: 'SUBMITTED' });

      await expect(service.start('exam-1', 'student-1')).rejects.toThrow(BadRequestException);
    });

    it('should return existing session if already IN_PROGRESS', async () => {
      mockPrisma.exam.findUnique.mockResolvedValue(mockExam);
      mockPrisma.examSession.findUnique.mockResolvedValue(mockSession);
      mockRedis.get.mockResolvedValue('999999999999');
      mockRedis.hgetall.mockResolvedValue({});

      const result = await service.start('exam-1', 'student-1');

      expect(mockPrisma.examSession.create).not.toHaveBeenCalled();
      expect(result.session).toBeDefined();
    });
  });

  describe('submit', () => {
    const mockSessionWithAnswers = {
      ...mockSession,
      status: 'IN_PROGRESS',
      studentId: 'student-1',
      exam: {
        ...mockExam,
        questions: mockExam.questions,
        passingScore: 70,
      },
      answers: [
        { id: 'ans-1', questionId: 'q-1', answer: 'opt-b', sessionId: 'session-1' },
        { id: 'ans-2', questionId: 'q-2', answer: 'opt-c', sessionId: 'session-1' },
      ],
    };

    it('should calculate score correctly and mark as SUBMITTED', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue(mockSessionWithAnswers);
      mockPrisma.examSession.update.mockResolvedValue({ ...mockSession, status: 'SUBMITTED', score: 100 });
      mockRedis.del.mockResolvedValue(1);

      const result = await service.submit('session-1', 'student-1');

      expect(mockPrisma.examSession.update).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ status: 'SUBMITTED' }) }),
      );
      expect(result.score).toBe(100);
    });

    it('should give full points for nullified questions', async () => {
      const sessionWithNullified = {
        ...mockSessionWithAnswers,
        exam: {
          ...mockExam,
          questions: [
            { ...mockExam.questions[0], isNullified: true },
            { ...mockExam.questions[1], isNullified: false },
          ],
        },
        answers: [
          // Only answer q-2 correctly; q-1 is nullified so gets full points regardless
          { id: 'ans-2', questionId: 'q-2', answer: 'opt-c', sessionId: 'session-1' },
        ],
      };
      mockPrisma.examSession.findUnique.mockResolvedValue(sessionWithNullified);
      mockPrisma.examSession.update.mockResolvedValue({ ...mockSession, status: 'SUBMITTED', score: 100 });
      mockRedis.del.mockResolvedValue(1);

      const result = await service.submit('session-1', 'student-1');

      // q-1 (nullified) = 10 pts earned, q-2 (correct) = 10 pts earned, total = 20/20 = 100%
      expect(result.score).toBe(100);
    });

    it('should throw NotFoundException if session does not belong to student', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({ ...mockSessionWithAnswers, studentId: 'other-student' });

      await expect(service.submit('session-1', 'student-1')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if already submitted', async () => {
      mockPrisma.examSession.findUnique.mockResolvedValue({ ...mockSessionWithAnswers, status: 'SUBMITTED' });

      await expect(service.submit('session-1', 'student-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getRemainingTime', () => {
    it('should return remaining time in seconds from Redis', async () => {
      const endTime = Date.now() + 60000; // 60 seconds from now
      mockRedis.get.mockResolvedValue(endTime.toString());

      const result = await service.getRemainingTime('session-1');

      expect(result).toBeGreaterThan(55);
      expect(result).toBeLessThanOrEqual(60);
    });

    it('should return 0 if timer key not found in Redis', async () => {
      mockRedis.get.mockResolvedValue(null);

      const result = await service.getRemainingTime('session-1');

      expect(result).toBe(0);
    });

    it('should return 0 if timer has expired', async () => {
      const pastTime = Date.now() - 5000; // 5 seconds ago
      mockRedis.get.mockResolvedValue(pastTime.toString());

      const result = await service.getRemainingTime('session-1');

      expect(result).toBe(0);
    });
  });

  describe('option shuffling', () => {
    it('should deterministically shuffle options when shuffleOptions is true', async () => {
      const examWithShuffle = {
        ...mockExam,
        shuffleOptions: true,
      };

      mockPrisma.exam.findUnique.mockResolvedValue(examWithShuffle);
      mockPrisma.examSession.findUnique.mockResolvedValue(null);
      mockPrisma.examSession.create.mockResolvedValue(mockSession);
      mockRedis.get.mockResolvedValue(null);
      mockRedis.set.mockResolvedValue('OK');
      mockRedis.hgetall.mockResolvedValue({});

      const result1 = await service.start('exam-1', 'student-1');

      // Now resume the session
      mockPrisma.examSession.findUnique.mockResolvedValue({
        ...mockSession,
        exam: examWithShuffle,
      });

      const result2 = await service.resume('session-1', 'student-1');

      // Check that the shuffled option order in both start and resume is identical
      const q1OptionsStart = result1.exam.questions[0].options;
      const q1OptionsResume = result2.exam.questions[0].options;

      expect(q1OptionsStart.map((o: any) => o.id)).toEqual(q1OptionsResume.map((o: any) => o.id));
    });
  });
});
