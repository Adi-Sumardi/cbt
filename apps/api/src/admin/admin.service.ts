import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as XLSX from 'xlsx';
import { execSync } from 'child_process';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Stats untuk dashboard ──────────────────────────────────────────────
  async getStats() {
    const [totalUsers, totalExams, totalSessions, avgScoreResult] = await Promise.all([
      this.prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      this.prisma.exam.groupBy({ by: ['status'], _count: { id: true } }),
      this.prisma.examSession.count({ where: { status: 'SUBMITTED' } }),
      this.prisma.examSession.aggregate({ where: { status: 'SUBMITTED' }, _avg: { score: true } }),
    ]);

    const byRole = Object.fromEntries(totalUsers.map((r) => [r.role, r._count.id]));
    const byStatus = Object.fromEntries(totalExams.map((r) => [r.status, r._count.id]));

    return {
      teachers: byRole['TEACHER'] ?? 0,
      students: byRole['STUDENT'] ?? 0,
      admins: byRole['ADMIN'] ?? 0,
      totalExams: Object.values(byStatus).reduce((a, b) => a + b, 0),
      activeExams: byStatus['ACTIVE'] ?? 0,
      finishedExams: byStatus['FINISHED'] ?? 0,
      draftExams: byStatus['DRAFT'] ?? 0,
      totalSubmissions: totalSessions,
      avgScore: Math.round((avgScoreResult._avg.score ?? 0) * 10) / 10,
    };
  }

  // ── Laporan: hasil per siswa ───────────────────────────────────────────
  async getReportByStudent(examId?: string) {
    const where: any = { status: 'SUBMITTED' };
    if (examId) where.examId = examId;

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { select: { id: true, name: true, email: true, nis: true, jenjang: true, kelas: true, rombel: true } },
        exam: { select: { id: true, title: true, passingScore: true } },
      },
      orderBy: [{ exam: { title: 'asc' } }, { score: 'desc' }],
    });

    return sessions.map((s) => ({
      sessionId: s.id,
      examId: s.examId,
      examTitle: s.exam.title,
      passingScore: s.exam.passingScore,
      student: s.student,
      score: s.score,
      passed: (s.score ?? 0) >= (s.exam.passingScore ?? 60),
      startedAt: s.startedAt,
      submittedAt: s.submittedAt,
      duration: s.startedAt && s.submittedAt
        ? Math.round((new Date(s.submittedAt).getTime() - new Date(s.startedAt).getTime()) / 60000)
        : null,
    }));
  }

  // ── Laporan: rekap per kelas/rombel ───────────────────────────────────
  async getReportByClass(examId?: string) {
    const where: any = { status: 'SUBMITTED' };
    if (examId) where.examId = examId;

    const sessions = await this.prisma.examSession.findMany({
      where,
      include: {
        student: { select: { jenjang: true, kelas: true, rombel: true } },
        exam: { select: { id: true, title: true, passingScore: true } },
      },
    });

    const groups: Record<string, { jenjang: string; kelas: string; rombel: string; examTitle: string; scores: number[]; passingScore: number }> = {};

    for (const s of sessions) {
      const key = `${s.student.jenjang}|${s.student.kelas}|${s.student.rombel ?? '-'}|${s.examId}`;
      if (!groups[key]) {
        groups[key] = {
          jenjang: s.student.jenjang ?? '-',
          kelas: s.student.kelas ?? '-',
          rombel: s.student.rombel ?? '-',
          examTitle: s.exam.title,
          scores: [],
          passingScore: s.exam.passingScore ?? 60,
        };
      }
      groups[key].scores.push(s.score ?? 0);
    }

    return Object.values(groups).map((g) => ({
      ...g,
      total: g.scores.length,
      avg: Math.round(g.scores.reduce((a, b) => a + b, 0) / g.scores.length * 10) / 10,
      passed: g.scores.filter((sc) => sc >= g.passingScore).length,
      highest: Math.max(...g.scores),
      lowest: Math.min(...g.scores),
    })).sort((a, b) => a.jenjang.localeCompare(b.jenjang) || a.kelas.localeCompare(b.kelas) || a.rombel.localeCompare(b.rombel));
  }

  // ── Laporan: statistik soal (tingkat kesulitan) ────────────────────────
  async getReportQuestionStats(examId: string) {
    const exam = await this.prisma.exam.findUnique({
      where: { id: examId },
      include: { questions: { include: { options: true }, orderBy: { order: 'asc' } } },
    });
    if (!exam) return null;

    const answers = await this.prisma.studentAnswer.findMany({
      where: { question: { examId } },
    });

    // Map tiap question ke set option yang benar
    const correctMap: Record<string, Set<string>> = {};
    for (const q of exam.questions) {
      correctMap[q.id] = new Set(q.options.filter((o) => o.isCorrect).map((o) => o.id));
    }

    const stats: Record<string, { questionId: string; content: string; order: number; type: string; total: number; correct: number }> = {};
    for (const q of exam.questions) {
      stats[q.id] = { questionId: q.id, content: q.content, order: q.order, type: q.type, total: 0, correct: 0 };
    }

    for (const a of answers) {
      if (!stats[a.questionId]) continue;
      stats[a.questionId].total++;
      const correctIds = correctMap[a.questionId];
      if (correctIds && a.answer && correctIds.has(a.answer)) {
        stats[a.questionId].correct++;
      }
    }

    return Object.values(stats).map((s) => ({
      ...s,
      correctRate: s.total > 0 ? Math.round(s.correct / s.total * 100) : 0,
      difficulty: s.total === 0 ? 'belum dijawab'
        : s.correct / s.total >= 0.8 ? 'mudah'
        : s.correct / s.total >= 0.5 ? 'sedang'
        : 'sulit',
    }));
  }

  // ── Laporan: kehadiran ujian ───────────────────────────────────────────
  async getReportAttendance(examId: string) {
    const exam = await this.prisma.exam.findUnique({ where: { id: examId } });
    if (!exam) return null;

    const allStudents = await this.prisma.user.findMany({
      where: { role: 'STUDENT' },
      select: { id: true, name: true, email: true, nis: true, jenjang: true, kelas: true, rombel: true },
    });

    const sessions = await this.prisma.examSession.findMany({
      where: { examId },
      select: { studentId: true, status: true, score: true, startedAt: true, submittedAt: true },
    });

    const sessionMap = new Map(sessions.map((s) => [s.studentId, s]));

    return {
      exam,
      total: allStudents.length,
      attended: sessions.length,
      submitted: sessions.filter((s) => s.status === 'SUBMITTED').length,
      students: allStudents.map((st) => {
        const session = sessionMap.get(st.id);
        return {
          ...st,
          status: session ? session.status : 'NOT_STARTED',
          score: session?.score ?? null,
        };
      }),
    };
  }

  // ── Export laporan ke Excel ────────────────────────────────────────────
  async exportReport(type: 'student' | 'class' | 'attendance', examId?: string): Promise<{ buffer: Buffer; filename: string }> {
    const wb = XLSX.utils.book_new();

    if (type === 'student') {
      const data = await this.getReportByStudent(examId);
      const rows = data.map((r, i) => ({
        'No': i + 1,
        'Ujian': r.examTitle,
        'NIS': r.student.nis ?? '-',
        'Nama Siswa': r.student.name,
        'Jenjang': r.student.jenjang ?? '-',
        'Kelas': r.student.kelas ?? '-',
        'Rombel': r.student.rombel ?? '-',
        'Nilai': r.score ?? 0,
        'KKM': r.passingScore ?? 60,
        'Status': r.passed ? 'LULUS' : 'TIDAK LULUS',
        'Durasi (menit)': r.duration ?? '-',
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 8 }, { wch: 6 }, { wch: 14 }, { wch: 16 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Hasil per Siswa');
      return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), filename: 'laporan_hasil_siswa.xlsx' };
    }

    if (type === 'class') {
      const data = await this.getReportByClass(examId);
      const rows = data.map((r, i) => ({
        'No': i + 1,
        'Ujian': r.examTitle,
        'Jenjang': r.jenjang,
        'Kelas': r.kelas,
        'Rombel': r.rombel,
        'Jumlah Peserta': r.total,
        'Rata-rata': r.avg,
        'Tertinggi': r.highest,
        'Terendah': r.lowest,
        'Lulus': r.passed,
        'Tidak Lulus': r.total - r.passed,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [{ wch: 4 }, { wch: 30 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 14 }, { wch: 10 }, { wch: 10 }, { wch: 10 }, { wch: 8 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, ws, 'Rekap per Kelas');
      return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), filename: 'laporan_per_kelas.xlsx' };
    }

    // attendance
    const data = await this.getReportAttendance(examId!);
    const rows = (data?.students ?? []).map((s: any, i: number) => ({
      'No': i + 1,
      'NIS': s.nis ?? '-',
      'Nama': s.name,
      'Jenjang': s.jenjang ?? '-',
      'Kelas': s.kelas ?? '-',
      'Rombel': s.rombel ?? '-',
      'Status': s.status === 'SUBMITTED' ? 'Selesai' : s.status === 'IN_PROGRESS' ? 'Sedang Mengerjakan' : 'Belum Mengikuti',
      'Nilai': s.score ?? '-',
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 4 }, { wch: 12 }, { wch: 25 }, { wch: 8 }, { wch: 8 }, { wch: 10 }, { wch: 22 }, { wch: 8 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Kehadiran Ujian');
    return { buffer: XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' }), filename: 'laporan_kehadiran.xlsx' };
  }

  // ── Backup database ────────────────────────────────────────────────────
  getDatabaseBackup(): Buffer {
    const dbUrl = process.env.DATABASE_URL!;
    const url = new URL(dbUrl);
    const env = {
      ...process.env,
      PGPASSWORD: decodeURIComponent(url.password),
    };
    const cmd = [
      'pg_dump',
      `-h ${url.hostname}`,
      `-p ${url.port || 5432}`,
      `-U ${decodeURIComponent(url.username)}`,
      `-d ${url.pathname.replace('/', '')}`,
      '--no-owner',
      '--no-acl',
    ].join(' ');

    const output = execSync(cmd, { env, maxBuffer: 100 * 1024 * 1024 });
    return output;
  }

  // ── Daftar ujian untuk filter laporan ─────────────────────────────────
  getExamList() {
    return this.prisma.exam.findMany({
      select: { id: true, title: true, status: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ── App Settings (key-value) ───────────────────────────────────────────
  async getAppSettings(): Promise<Record<string, string>> {
    const rows = await this.prisma.appSetting.findMany();
    return Object.fromEntries(rows.map((r) => [r.key, r.value]));
  }

  async updateAppSettings(data: Record<string, string>): Promise<Record<string, string>> {
    await Promise.all(
      Object.entries(data).map(([key, value]) =>
        this.prisma.appSetting.upsert({
          where: { key },
          update: { value },
          create: { key, value },
        }),
      ),
    );
    return this.getAppSettings();
  }
}
