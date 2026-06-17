'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toast } from 'gooey-toast';

type Tab = 'student' | 'class' | 'question' | 'attendance';

const TABS: { id: Tab; label: string }[] = [
  { id: 'student', label: 'Hasil per Siswa' },
  { id: 'class', label: 'Per Kelas / Rombel' },
  { id: 'question', label: 'Statistik Soal' },
  { id: 'attendance', label: 'Kehadiran' },
];

function ExportButton({ type, examId, disabled }: { type: string; examId: string; disabled: boolean }) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type });
      if (examId) params.set('examId', examId);
      const res = await api.get(`/api/admin/reports/export?${params}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `laporan_${type}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success({ title: 'Laporan diunduh', description: 'File Excel tersimpan.' });
    } catch {
      toast.error({ title: 'Export gagal', description: 'Tidak ada data atau terjadi kesalahan.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleExport} disabled={disabled || loading} loading={loading}>
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
      Export Excel
    </Button>
  );
}

// ── Tab: Hasil per Siswa ────────────────────────────────────────────────────
function TabStudent({ examId }: { examId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-student', examId],
    queryFn: () => api.get('/api/admin/reports/by-student', { params: examId ? { examId } : {} }).then((r) => r.data),
  });

  if (isLoading) return <LoadingRow />;
  if (!data.length) return <EmptyRow message="Belum ada data hasil ujian" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['No', 'Ujian', 'NIS', 'Nama Siswa', 'Kelas / Rombel', 'Nilai', 'KKM', 'Status', 'Durasi'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((r: any, i: number) => (
            <tr key={r.sessionId} className="hover:bg-blue-50/20">
              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{r.examTitle}</td>
              <td className="px-4 py-3 text-gray-500">{r.student.nis ?? '-'}</td>
              <td className="px-4 py-3">
                <p className="font-medium text-gray-900">{r.student.name}</p>
                <p className="text-xs text-gray-400">{r.student.email}</p>
              </td>
              <td className="px-4 py-3 text-gray-600">
                {r.student.kelas ?? '-'}
                {r.student.rombel && <span className="ml-1 text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{r.student.rombel}</span>}
              </td>
              <td className="px-4 py-3 font-bold text-gray-900">{r.score ?? '-'}</td>
              <td className="px-4 py-3 text-gray-500">{r.passingScore ?? 60}</td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${r.passed ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
                  {r.passed ? 'LULUS' : 'TIDAK LULUS'}
                </span>
              </td>
              <td className="px-4 py-3 text-gray-500">{r.duration != null ? `${r.duration} mnt` : '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Per Kelas / Rombel ─────────────────────────────────────────────────
function TabClass({ examId }: { examId: string }) {
  const { data = [], isLoading } = useQuery({
    queryKey: ['report-class', examId],
    queryFn: () => api.get('/api/admin/reports/by-class', { params: examId ? { examId } : {} }).then((r) => r.data),
  });

  if (isLoading) return <LoadingRow />;
  if (!data.length) return <EmptyRow message="Belum ada data rekap kelas" />;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[700px] text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['No', 'Ujian', 'Jenjang', 'Kelas', 'Rombel', 'Peserta', 'Rata-rata', 'Tertinggi', 'Terendah', 'Lulus', 'Tidak Lulus'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((r: any, i: number) => (
            <tr key={i} className="hover:bg-blue-50/20">
              <td className="px-4 py-3 text-gray-400">{i + 1}</td>
              <td className="px-4 py-3 font-medium text-gray-800 max-w-[180px] truncate">{r.examTitle}</td>
              <td className="px-4 py-3 text-gray-600">{r.jenjang}</td>
              <td className="px-4 py-3 text-gray-600">{r.kelas}</td>
              <td className="px-4 py-3">
                {r.rombel !== '-' ? (
                  <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded">{r.rombel}</span>
                ) : <span className="text-gray-400">-</span>}
              </td>
              <td className="px-4 py-3 text-gray-700">{r.total}</td>
              <td className="px-4 py-3 font-bold text-gray-900">{r.avg}</td>
              <td className="px-4 py-3 text-green-600 font-medium">{r.highest}</td>
              <td className="px-4 py-3 text-red-500 font-medium">{r.lowest}</td>
              <td className="px-4 py-3">
                <span className="text-green-600 font-semibold">{r.passed}</span>
              </td>
              <td className="px-4 py-3">
                <span className="text-red-500 font-semibold">{r.total - r.passed}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Statistik Soal ─────────────────────────────────────────────────────
function TabQuestion({ examId }: { examId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-question', examId],
    queryFn: () => api.get('/api/admin/reports/question-stats', { params: { examId } }).then((r) => r.data),
    enabled: !!examId,
  });

  if (!examId) return <EmptyRow message="Pilih ujian terlebih dahulu untuk melihat statistik soal" />;
  if (isLoading) return <LoadingRow />;
  if (!data || !data.length) return <EmptyRow message="Belum ada data jawaban untuk ujian ini" />;

  const difficultyColor: Record<string, string> = {
    mudah: 'bg-green-50 text-green-700',
    sedang: 'bg-yellow-50 text-yellow-700',
    sulit: 'bg-red-50 text-red-600',
    'belum dijawab': 'bg-gray-100 text-gray-500',
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[600px] text-sm">
        <thead className="bg-gray-50 border-b border-gray-100">
          <tr>
            {['No', 'Soal', 'Tipe', 'Dijawab', 'Benar', '% Benar', 'Tingkat Kesulitan'].map((h) => (
              <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((q: any) => (
            <tr key={q.questionId} className="hover:bg-blue-50/20">
              <td className="px-4 py-3 text-gray-400">{q.order}</td>
              <td className="px-4 py-3 text-gray-800 max-w-[280px]">
                <p className="line-clamp-2">{q.content.replace(/<[^>]+>/g, '')}</p>
              </td>
              <td className="px-4 py-3 text-gray-500 uppercase text-xs">{q.type}</td>
              <td className="px-4 py-3 text-gray-700">{q.total}</td>
              <td className="px-4 py-3 text-green-600 font-medium">{q.correct}</td>
              <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="w-20 bg-gray-100 rounded-full h-1.5">
                    <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${q.correctRate}%` }} />
                  </div>
                  <span className="text-gray-700 font-medium">{q.correctRate}%</span>
                </div>
              </td>
              <td className="px-4 py-3">
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${difficultyColor[q.difficulty] ?? 'bg-gray-100 text-gray-500'}`}>
                  {q.difficulty}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Tab: Kehadiran ──────────────────────────────────────────────────────────
function TabAttendance({ examId }: { examId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['report-attendance', examId],
    queryFn: () => api.get('/api/admin/reports/attendance', { params: { examId } }).then((r) => r.data),
    enabled: !!examId,
  });

  if (!examId) return <EmptyRow message="Pilih ujian terlebih dahulu untuk melihat data kehadiran" />;
  if (isLoading) return <LoadingRow />;
  if (!data) return <EmptyRow message="Ujian tidak ditemukan" />;

  const statusLabel: Record<string, { label: string; cls: string }> = {
    SUBMITTED: { label: 'Selesai', cls: 'bg-green-50 text-green-700' },
    IN_PROGRESS: { label: 'Sedang Mengerjakan', cls: 'bg-yellow-50 text-yellow-700' },
    NOT_STARTED: { label: 'Belum Mengikuti', cls: 'bg-gray-100 text-gray-500' },
  };

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4 p-4 border-b border-gray-100">
        <div className="bg-blue-50 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{data.total}</p>
          <p className="text-xs text-blue-500 mt-0.5">Total Siswa</p>
        </div>
        <div className="bg-green-50 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-green-700">{data.submitted}</p>
          <p className="text-xs text-green-500 mt-0.5">Selesai</p>
        </div>
        <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
          <p className="text-2xl font-bold text-gray-600">{data.total - data.attended}</p>
          <p className="text-xs text-gray-400 mt-0.5">Belum Mengikuti</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              {['No', 'NIS', 'Nama', 'Kelas / Rombel', 'Status', 'Nilai'].map((h) => (
                <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-600 uppercase whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {data.students.map((s: any, i: number) => {
              const st = statusLabel[s.status] ?? statusLabel['NOT_STARTED'];
              return (
                <tr key={s.id} className="hover:bg-blue-50/20">
                  <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                  <td className="px-4 py-3 text-gray-500">{s.nis ?? '-'}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.name}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {s.kelas ?? '-'}
                    {s.rombel && <span className="ml-1 text-xs bg-purple-50 text-purple-700 px-1.5 py-0.5 rounded">{s.rombel}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-4 py-3 font-bold text-gray-900">{s.score ?? '-'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function LoadingRow() {
  return <div className="text-center py-16 text-gray-400 text-sm">Memuat data...</div>;
}
function EmptyRow({ message }: { message: string }) {
  return <div className="text-center py-16 text-gray-400 text-sm">{message}</div>;
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function AdminReportsPage() {
  const [tab, setTab] = useState<Tab>('student');
  const [examId, setExamId] = useState('');

  const { data: exams = [] } = useQuery({
    queryKey: ['admin-exams'],
    queryFn: () => api.get('/api/admin/exams').then((r) => r.data),
  });

  const canExport = tab !== 'question' && (tab !== 'attendance' ? true : !!examId);

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Laporan</h1>
          <p className="text-sm text-gray-500 mt-0.5">Analisis hasil ujian dan data siswa</p>
        </div>
        {canExport && (
          <ExportButton type={tab} examId={examId} disabled={false} />
        )}
      </div>

      {/* Filter ujian */}
      <div className="mb-5">
        <label className="text-xs font-medium text-gray-600 mb-1.5 block">Filter Ujian</label>
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className="w-full sm:w-72 px-3 py-2 text-sm border border-gray-200 rounded-lg bg-white text-gray-800 focus:outline-none focus:ring-2 focus:ring-blue-300"
        >
          <option value="">Semua Ujian</option>
          {exams.map((e: any) => (
            <option key={e.id} value={e.id}>{e.title}</option>
          ))}
        </select>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex border-b border-gray-100 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex-shrink-0 px-5 py-3.5 text-sm font-medium transition-colors border-b-2 ${
                tab === t.id
                  ? 'border-blue-600 text-blue-600 bg-blue-50/50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'student' && <TabStudent examId={examId} />}
        {tab === 'class' && <TabClass examId={examId} />}
        {tab === 'question' && <TabQuestion examId={examId} />}
        {tab === 'attendance' && <TabAttendance examId={examId} />}
      </div>
    </div>
  );
}
