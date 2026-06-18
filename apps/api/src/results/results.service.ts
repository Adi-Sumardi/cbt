import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';

@Injectable()
export class ResultsService {
  constructor(private readonly prisma: PrismaService) {}

  async getExamResults(examId: string) {
    const sessions = await this.prisma.examSession.findMany({
      where: { examId, status: 'SUBMITTED' },
      include: {
        student: { select: { id: true, name: true, email: true, nis: true, jenjang: true, kelas: true } },
        answers: { include: { question: { include: { options: true } } } },
      },
      orderBy: { score: 'desc' },
    });

    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });

    return {
      exam,
      totalStudents: sessions.length,
      avgScore: sessions.reduce((acc, s) => acc + (s.score || 0), 0) / sessions.length || 0,
      passCount: sessions.filter((s) => (s.score || 0) >= (exam?.passingScore || 60)).length,
      sessions,
    };
  }

  async getStudentResult(sessionId: string, userId?: string, role?: string) {
    const session = await this.prisma.examSession.findUnique({
      where: { id: sessionId },
      include: {
        exam: { select: { id: true, title: true, passingScore: true, duration: true } },
      },
    });
    if (!session) throw new NotFoundException('Hasil tidak ditemukan');

    // Hanya pemilik sesi (siswa) atau guru/admin yang boleh melihat
    const isPrivileged = role === 'TEACHER' || role === 'ADMIN';
    if (!isPrivileged && userId && session.studentId !== userId) {
      throw new NotFoundException('Hasil tidak ditemukan');
    }

    // Siswa HANYA menerima nilai — tidak ada jawaban/kunci (anti-bocor & anti-screenshot)
    return {
      id: session.id,
      score: session.score,
      status: session.status,
      submittedAt: session.submittedAt,
      violationCount: session.violationCount,
      penaltyScore: (session as any).penaltyScore ?? 0,
      exam: session.exam,
    };
  }

  async exportToExcel(examId: string): Promise<Buffer> {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    const sessions = await this.prisma.examSession.findMany({
      where: { examId, status: 'SUBMITTED' },
      include: {
        student: { select: { id: true, name: true, email: true, nis: true, jenjang: true, kelas: true } },
        answers: { include: { question: true } },
      },
      orderBy: { score: 'desc' },
    });

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Rekap Nilai ──────────────────────────────────────────
    const rekapRows = sessions.map((s, i) => ({
      'No': i + 1,
      'NIS': s.student.nis ?? '-',
      'Nama Siswa': s.student.name,
      'Email': s.student.email,
      'Jenjang': (s.student as any).jenjang ?? '-',
      'Kelas': (s.student as any).kelas ?? '-',
      'Nilai': s.score !== null ? Number(s.score.toFixed(2)) : 0,
      'Penalti Pelanggaran': (s as any).penaltyScore ?? 0,
      'Jumlah Pelanggaran': (s as any).violationCount ?? 0,
      'Status': (s.score ?? 0) >= (exam?.passingScore ?? 70) ? 'LULUS' : 'TIDAK LULUS',
      'Waktu Mulai': s.startedAt ? new Date(s.startedAt).toLocaleString('id-ID') : '-',
      'Waktu Submit': s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '-',
    }));

    const wsRekap = XLSX.utils.json_to_sheet(rekapRows);

    // Lebar kolom
    wsRekap['!cols'] = [
      { wch: 5 }, { wch: 12 }, { wch: 25 }, { wch: 28 },
      { wch: 8 }, { wch: 8 }, { wch: 8 }, { wch: 18 },
      { wch: 18 }, { wch: 12 }, { wch: 20 }, { wch: 20 },
    ];

    XLSX.utils.book_append_sheet(wb, wsRekap, 'Rekap Nilai');

    // ── Sheet 2: Statistik ────────────────────────────────────────────
    const scores = sessions.map((s) => s.score ?? 0);
    const avg = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
    const max = scores.length > 0 ? Math.max(...scores) : 0;
    const min = scores.length > 0 ? Math.min(...scores) : 0;
    const passCount = scores.filter((s) => s >= (exam?.passingScore ?? 70)).length;

    const statRows = [
      { 'Statistik': 'Nama Ujian', 'Nilai': exam?.title ?? '-' },
      { 'Statistik': 'KKM / Nilai Lulus', 'Nilai': exam?.passingScore ?? 70 },
      { 'Statistik': 'Total Peserta', 'Nilai': sessions.length },
      { 'Statistik': 'Lulus', 'Nilai': passCount },
      { 'Statistik': 'Tidak Lulus', 'Nilai': sessions.length - passCount },
      { 'Statistik': 'Tingkat Kelulusan (%)', 'Nilai': sessions.length > 0 ? Number(((passCount / sessions.length) * 100).toFixed(1)) : 0 },
      { 'Statistik': 'Nilai Rata-rata', 'Nilai': Number(avg.toFixed(2)) },
      { 'Statistik': 'Nilai Tertinggi', 'Nilai': Number(max.toFixed(2)) },
      { 'Statistik': 'Nilai Terendah', 'Nilai': Number(min.toFixed(2)) },
    ];

    const wsStat = XLSX.utils.json_to_sheet(statRows);
    wsStat['!cols'] = [{ wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, wsStat, 'Statistik');

    // ── Sheet 3: Distribusi Nilai ────────────────────────────────────
    const buckets = [
      { label: '0 – 29', min: 0, max: 30 },
      { label: '30 – 49', min: 30, max: 50 },
      { label: '50 – 59', min: 50, max: 60 },
      { label: '60 – 69', min: 60, max: 70 },
      { label: '70 – 79', min: 70, max: 80 },
      { label: '80 – 89', min: 80, max: 90 },
      { label: '90 – 100', min: 90, max: 101 },
    ];
    const distRows = buckets.map((b) => ({
      'Rentang Nilai': b.label,
      'Jumlah Siswa': scores.filter((s) => s >= b.min && s < b.max).length,
    }));
    const wsDist = XLSX.utils.json_to_sheet(distRows);
    wsDist['!cols'] = [{ wch: 15 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsDist, 'Distribusi Nilai');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return Buffer.from(buf);
  }

  async getQuestionAnalysis(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: {
        questions: {
          include: {
            options: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });
    if (!exam) throw new NotFoundException('Ujian tidak ditemukan');

    const sessions = await this.prisma.examSession.findMany({
      where: { examId, status: 'SUBMITTED' },
      include: {
        answers: true,
      },
    });

    const totalStudents = sessions.length;

    // Sort sessions by score descending for discrimination index
    const sortedSessions = [...sessions].sort((a, b) => (b.score || 0) - (a.score || 0));

    // Calculate group size for upper and lower 27% (standard classical test theory)
    const groupSize = Math.max(1, Math.round(totalStudents * 0.27));
    const upperGroup = sortedSessions.slice(0, groupSize);
    const lowerGroup = totalStudents >= 2 ? sortedSessions.slice(-groupSize) : [];

    const questionAnalysis = exam.questions.map((question) => {
      // Find all answers for this question
      const questionAnswers = sessions
        .map((s) => s.answers.find((a) => a.questionId === question.id))
        .filter(Boolean);

      let totalRatio = 0;
      let correctCount = 0;
      let incorrectCount = 0;
      let partialCount = 0;

      const optionCounts: Record<string, number> = {};
      question.options.forEach((o) => {
        optionCounts[o.id] = 0;
      });

      let emptyAnswerCount = totalStudents - questionAnswers.length;

      sessions.forEach((s) => {
        const studentAns = s.answers.find((a) => a.questionId === question.id);
        if (!studentAns || !studentAns.answer) {
          return;
        }

        const ratio = evaluateAnswerRatio(question, studentAns.answer);
        totalRatio += ratio;
        if (ratio === 1) correctCount++;
        else if (ratio === 0) incorrectCount++;
        else partialCount++;

        // Count option choices
        if (question.type === 'MULTIPLE_CHOICE' || question.type === 'TRUE_FALSE') {
          if (optionCounts[studentAns.answer] !== undefined) {
            optionCounts[studentAns.answer]++;
          }
        } else if (question.type === 'MULTIPLE_ANSWER') {
          const selectedIds = studentAns.answer.split(',').filter(Boolean);
          selectedIds.forEach((id) => {
            if (optionCounts[id] !== undefined) {
              optionCounts[id]++;
            }
          });
        }
      });

      const difficultyIndex = totalStudents > 0 ? totalRatio / totalStudents : 0;
      let difficultyCategory = 'Sedang';
      if (difficultyIndex > 0.7) difficultyCategory = 'Mudah';
      else if (difficultyIndex < 0.3) difficultyCategory = 'Sukar';

      // Discrimination Index (D)
      let discriminationIndex = 0;
      if (totalStudents >= 2 && groupSize > 0) {
        let upperRatioSum = 0;
        upperGroup.forEach((s) => {
          const studentAns = s.answers.find((a) => a.questionId === question.id);
          upperRatioSum += studentAns ? evaluateAnswerRatio(question, studentAns.answer) : 0;
        });

        let lowerRatioSum = 0;
        lowerGroup.forEach((s) => {
          const studentAns = s.answers.find((a) => a.questionId === question.id);
          lowerRatioSum += studentAns ? evaluateAnswerRatio(question, studentAns.answer) : 0;
        });

        discriminationIndex = (upperRatioSum - lowerRatioSum) / groupSize;
      }

      let discriminationCategory = 'Cukup';
      if (discriminationIndex >= 0.4) discriminationCategory = 'Sangat Baik';
      else if (discriminationIndex >= 0.3) discriminationCategory = 'Baik';
      else if (discriminationIndex >= 0.2) discriminationCategory = 'Cukup';
      else discriminationCategory = 'Buruk / Perlu Perbaikan';

      // Distractor Effectiveness
      const optionsAnalysis = question.options.map((o) => {
        const count = optionCounts[o.id] || 0;
        const percentage = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
        const isDistractor = !o.isCorrect;
        const isEffective = !isDistractor || percentage >= 5;

        return {
          id: o.id,
          label: o.label,
          content: o.content,
          isCorrect: o.isCorrect,
          count,
          percentage,
          isEffective,
        };
      });

      return {
        id: question.id,
        content: question.content,
        type: question.type,
        points: question.points,
        isNullified: question.isNullified,
        order: question.order,
        difficultyIndex,
        difficultyCategory,
        discriminationIndex,
        discriminationCategory,
        correctCount,
        incorrectCount,
        partialCount,
        emptyAnswerCount,
        optionsAnalysis,
      };
    });

    return {
      exam,
      totalStudents,
      questionAnalysis,
    };
  }
}

function evaluateAnswerRatio(question: any, answer: string | null): number {
  if (!answer) return 0;
  switch (question.type) {
    case 'MULTIPLE_CHOICE':
    case 'TRUE_FALSE': {
      const correctOption = question.options.find((o: any) => o.isCorrect);
      return correctOption && answer === correctOption.id ? 1 : 0;
    }
    case 'MULTIPLE_ANSWER': {
      const correctIds = question.options.filter((o: any) => o.isCorrect).map((o: any) => o.id);
      const studentIds = answer.split(',').filter(Boolean);
      const matched = studentIds.filter((id) => correctIds.includes(id)).length;
      const wrong = studentIds.filter((id) => !correctIds.includes(id)).length;
      return Math.max(0, (matched - wrong) / Math.max(1, correctIds.length));
    }
    case 'SHORT_ANSWER': {
      const correctText = question.options[0]?.content ?? '';
      return answer.trim().toLowerCase() === correctText.trim().toLowerCase() ? 1 : 0;
    }
    case 'FILL_BLANK': {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(answer); } catch { return 0; }
      const blanks = question.options.filter((o: any) => o.isCorrect);
      if (blanks.length === 0) return 0;
      let correctBlanks = 0;
      for (const blank of blanks) {
        const studentVal = (parsed[blank.label] ?? '').trim().toLowerCase();
        if (studentVal === blank.content.trim().toLowerCase()) correctBlanks++;
      }
      return correctBlanks / blanks.length;
    }
    case 'MATCHING': {
      let parsed: Record<string, string> = {};
      try { parsed = JSON.parse(answer); } catch { return 0; }
      const pairs = question.options;
      if (pairs.length === 0) return 0;
      let correctPairs = 0;
      for (const pair of pairs) {
        const rightText = pair.content.split('|||')[1] ?? '';
        const studentRight = (parsed[pair.id] ?? '').trim().toLowerCase();
        if (studentRight === rightText.trim().toLowerCase()) correctPairs++;
      }
      return correctPairs / pairs.length;
    }
    case 'ESSAY':
    default:
      return 0;
  }
}
