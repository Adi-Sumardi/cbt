import { Test, TestingModule } from '@nestjs/testing';
import { QuestionsService } from './questions.service';
import { PrismaService } from '../prisma/prisma.service';

const mockQuestion = {
  id: 'q-1',
  examId: 'exam-1',
  content: 'Soal ujian',
  type: 'MULTIPLE_CHOICE',
  points: 10,
  order: 1,
  isNullified: false,
  options: [
    { id: 'opt-a', label: 'A', content: 'Jawaban A', isCorrect: false, order: 1 },
    { id: 'opt-b', label: 'B', content: 'Jawaban B', isCorrect: true, order: 2 },
  ],
};

const mockPrisma = {
  question: {
    count: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findUnique: jest.fn(),
    delete: jest.fn(),
  },
  questionOption: {
    deleteMany: jest.fn(),
    createMany: jest.fn(),
  },
};

describe('QuestionsService', () => {
  let service: QuestionsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuestionsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<QuestionsService>(QuestionsService);
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a question with options and correct order', async () => {
      mockPrisma.question.count.mockResolvedValue(0);
      mockPrisma.question.create.mockResolvedValue(mockQuestion);

      const result = await service.create('exam-1', {
        content: 'Soal ujian',
        type: 'MULTIPLE_CHOICE',
        points: 10,
        options: [
          { label: 'A', content: 'Jawaban A', isCorrect: false },
          { label: 'B', content: 'Jawaban B', isCorrect: true },
        ],
      });

      expect(mockPrisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            examId: 'exam-1',
            order: 1, // count(0) + 1
          }),
        }),
      );
      expect(result).toEqual(mockQuestion);
    });

    it('should set order based on existing question count', async () => {
      mockPrisma.question.count.mockResolvedValue(5);
      mockPrisma.question.create.mockResolvedValue({ ...mockQuestion, order: 6 });

      await service.create('exam-1', { content: 'New', type: 'ESSAY', points: 5, options: [] });

      expect(mockPrisma.question.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 6 }),
        }),
      );
    });
  });

  describe('update', () => {
    it('should update question and replace options', async () => {
      mockPrisma.question.update.mockResolvedValue(mockQuestion);
      mockPrisma.questionOption.deleteMany.mockResolvedValue({ count: 2 });
      mockPrisma.questionOption.createMany.mockResolvedValue({ count: 2 });
      mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);

      const result = await service.update('q-1', {
        content: 'Updated content',
        options: [
          { label: 'A', content: 'New A', isCorrect: true },
          { label: 'B', content: 'New B', isCorrect: false },
        ],
      });

      expect(mockPrisma.questionOption.deleteMany).toHaveBeenCalledWith({ where: { questionId: 'q-1' } });
      expect(mockPrisma.questionOption.createMany).toHaveBeenCalled();
      expect(result).toBeDefined();
    });

    it('should update question without changing options if no options provided', async () => {
      mockPrisma.question.update.mockResolvedValue(mockQuestion);
      mockPrisma.question.findUnique.mockResolvedValue(mockQuestion);

      await service.update('q-1', { content: 'Updated content only' });

      expect(mockPrisma.questionOption.deleteMany).not.toHaveBeenCalled();
    });
  });

  describe('nullify', () => {
    it('should set isNullified to true', async () => {
      mockPrisma.question.update.mockResolvedValue({ ...mockQuestion, isNullified: true });

      const result = await service.nullify('q-1');

      expect(mockPrisma.question.update).toHaveBeenCalledWith({
        where: { id: 'q-1' },
        data: { isNullified: true },
      });
      expect(result.isNullified).toBe(true);
    });
  });

  describe('importBulk', () => {
    it('should create multiple questions with sequential order', async () => {
      mockPrisma.question.count.mockResolvedValue(2);
      mockPrisma.question.create
        .mockResolvedValueOnce({ ...mockQuestion, id: 'q-3', order: 3 })
        .mockResolvedValueOnce({ ...mockQuestion, id: 'q-4', order: 4 });

      const questions = [
        { content: 'Soal 3', type: 'MULTIPLE_CHOICE', points: 5, options: [] },
        { content: 'Soal 4', type: 'ESSAY', points: 10, options: [] },
      ];

      const result = await service.importBulk('exam-1', questions);

      expect(mockPrisma.question.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should handle empty questions array', async () => {
      mockPrisma.question.count.mockResolvedValue(0);

      const result = await service.importBulk('exam-1', []);

      expect(mockPrisma.question.create).not.toHaveBeenCalled();
      expect(result).toHaveLength(0);
    });
  });
});
