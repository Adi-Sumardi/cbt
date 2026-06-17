import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class QuestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(examId: string, data: any) {
    const count = await this.prisma.question.count({ where: { examId } });
    return this.prisma.question.create({
      data: {
        ...data,
        examId,
        order: count + 1,
        options: data.options
          ? { create: data.options.map((opt: any, i: number) => ({ ...opt, order: i + 1 })) }
          : undefined,
      },
      include: { options: true },
    });
  }

  async update(questionId: string, data: any) {
    const { options, ...questionData } = data;

    await this.prisma.question.update({ where: { id: questionId }, data: questionData });

    if (options) {
      await this.prisma.questionOption.deleteMany({ where: { questionId } });
      await this.prisma.questionOption.createMany({
        data: options.map((opt: any, i: number) => ({ ...opt, questionId, order: i + 1 })),
      });
    }

    return this.prisma.question.findUnique({
      where: { id: questionId },
      include: { options: { orderBy: { order: 'asc' } } },
    });
  }

  async nullify(questionId: string) {
    return this.prisma.question.update({
      where: { id: questionId },
      data: { isNullified: true },
    });
  }

  async reorder(examId: string, orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.prisma.question.update({ where: { id }, data: { order: index + 1 } }),
      ),
    );
  }

  async delete(questionId: string) {
    return this.prisma.question.delete({ where: { id: questionId } });
  }

  async importBulk(examId: string, questions: any[]) {
    const count = await this.prisma.question.count({ where: { examId } });
    const created = [];
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      const created_q = await this.prisma.question.create({
        data: {
          content: q.content,
          type: q.type || 'MULTIPLE_CHOICE',
          points: q.points || 1,
          order: count + i + 1,
          examId,
          options: q.options
            ? { create: q.options.map((opt: any, j: number) => ({ ...opt, order: j + 1 })) }
            : undefined,
        },
        include: { options: true },
      });
      created.push(created_q);
    }
    return created;
  }
}
