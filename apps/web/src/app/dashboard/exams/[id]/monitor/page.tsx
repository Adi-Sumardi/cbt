'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { io, Socket } from 'socket.io-client';
import api from '@/lib/api';
import { getServerUrl } from '@/lib/serverUrl';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { QuestionEditModal } from '@/components/ui/QuestionEditModal';

const sessionStatusColor: Record<string, string> = {
  NOT_STARTED: 'bg-gray-100 text-gray-500',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  SUBMITTED: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-red-100 text-red-600',
};
const sessionStatusLabel: Record<string, string> = {
  NOT_STARTED: 'Belum mulai',
  IN_PROGRESS: 'Sedang mengerjakan',
  SUBMITTED: 'Sudah submit',
  EXPIRED: 'Kedaluwarsa',
};

export default function LiveMonitorPage() {
  const { id: examId } = useParams<{ id: string }>();
  const { data: session } = useSession();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [liveEvents, setLiveEvents] = useState<{ studentId: string; studentName: string; event: string; at: number }[]>([]);
  const [nullifyTarget, setNullifyTarget] = useState<any>(null);
  const [editTarget, setEditTarget] = useState<any>(null);
  const [socket, setSocket] = useState<Socket | null>(null);
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementSending, setAnnouncementSending] = useState(false);

  const { data: exam } = useQuery({
    queryKey: ['exam', examId],
    queryFn: () => api.get(`/api/exams/${examId}`).then((r) => r.data),
  });

  const { data: monitor = [], refetch } = useQuery({
    queryKey: ['monitor', examId],
    queryFn: () => api.get(`/api/exams/${examId}/monitor`).then((r) => r.data),
    refetchInterval: 10000,
  });

  const nullifyMutation = useMutation({
    mutationFn: (qId: string) => api.patch(`/api/exams/${examId}/questions/${qId}/nullify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', examId] });
      toast('Soal dianulir — semua siswa otomatis mendapat poin penuh');
      setNullifyTarget(null);
    },
  });


  const finishMutation = useMutation({
    mutationFn: () => api.patch(`/api/exams/${examId}/status`, { status: 'FINISHED' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', examId] });
      toast('Ujian diselesaikan');
    },
  });

  const pardonMutation = useMutation({
    mutationFn: (sessionId: string) => api.post(`/api/sessions/${sessionId}/pardon`),
    onSuccess: () => {
      refetch();
      toast('Pelanggaran siswa berhasil diputihkan/dihapus');
    },
    onError: () => toast('Gagal memutihkan pelanggaran siswa', 'error'),
  });

  useEffect(() => {
    if (!session) return;
    const base = getServerUrl() || process.env.NEXT_PUBLIC_WS_URL || window.location.origin;
    const sock = io(`${base}/exam`, {
      query: { examId, role: 'teacher' },
      auth: { token: (session as any).accessToken },
    });
    sock.on('student:activity', (data: any) => {
      setLiveEvents((prev) => [{ studentId: data.sessionId, studentName: data.studentName || 'Siswa', event: data.event, at: Date.now() }, ...prev.slice(0, 49)]);
    });
    sock.on('student:disconnect', () => refetch());
    setSocket(sock);
    return () => { sock.disconnect(); };
  }, [session, examId]);

  const submitted = monitor.filter((s: any) => s.status === 'SUBMITTED').length;
  const inProgress = monitor.filter((s: any) => s.status === 'IN_PROGRESS').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/exams/${examId}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">Monitor Live</h1>
              <span className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 px-2 py-0.5 rounded-full">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Live
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{exam?.title}</p>
          </div>
        </div>
        <Button variant="danger" onClick={() => finishMutation.mutate()} loading={finishMutation.isPending}>
          Selesaikan Ujian
        </Button>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total Peserta', value: monitor.length, color: 'text-gray-900' },
          { label: 'Sedang Mengerjakan', value: inProgress, color: 'text-blue-600' },
          { label: 'Sudah Submit', value: submitted, color: 'text-green-600' },
          { label: 'Total Soal', value: exam?.questions?.length ?? 0, color: 'text-gray-900' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-blue-100 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Student list */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-blue-100 overflow-hidden">
          <div className="px-6 py-4 border-b border-blue-50 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Status Siswa</h2>
            <button onClick={() => refetch()} className="text-xs text-blue-600 hover:underline">Refresh</button>
          </div>
          {monitor.length === 0 ? (
            <p className="text-center py-12 text-gray-400 text-sm">Belum ada siswa yang bergabung</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full min-w-[400px]">
              <thead className="bg-blue-50">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Siswa</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Dijawab</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Pelanggaran</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Status</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {monitor.map((s: any) => {
                  const hasViolations = s.violationCount > 0;
                  return (
                    <tr key={s.id} className="hover:bg-blue-50/30">
                      <td className="px-6 py-3">
                        <p className="text-sm font-medium text-gray-900">{s.student.name}</p>
                      </td>
                      <td className="px-6 py-3 text-sm text-gray-600">
                        {s._count.answers} / {exam?.questions?.length ?? '?'}
                      </td>
                      <td className="px-6 py-3 text-sm">
                        {hasViolations ? (
                          <span className="text-xs bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full font-bold">
                            {s.violationCount}x Pelanggaran
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Aman</span>
                        )}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${sessionStatusColor[s.status]}`}>
                          {sessionStatusLabel[s.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right">
                        {hasViolations && s.status !== 'SUBMITTED' && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs border-green-300 text-green-700 hover:bg-green-50"
                            onClick={() => pardonMutation.mutate(s.id)}
                            loading={pardonMutation.isPending}
                          >
                            Reset
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          )}
        </div>

        {/* Koreksi soal + log */}
        <div className="space-y-4">
          {/* Siarkan Pengumuman */}
          <div className="bg-white rounded-xl border border-blue-100 p-5 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-1.5">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Siarkan Pengumuman
            </h3>
            <p className="text-xs text-gray-400 mb-4">Kirim ralat atau petunjuk secara instan ke seluruh siswa yang sedang ujian</p>
            <div className="space-y-2.5">
              <textarea
                rows={3}
                value={announcementText}
                onChange={(e) => setAnnouncementText(e.target.value)}
                placeholder="Tulis pengumuman di sini..."
                className="w-full px-3 py-2 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none text-gray-800"
              />
              <Button
                size="sm"
                className="w-full justify-center bg-blue-600 hover:bg-blue-700 text-xs font-semibold"
                disabled={!announcementText.trim() || announcementSending}
                loading={announcementSending}
                onClick={() => {
                  if (!socket || !announcementText.trim()) return;
                  setAnnouncementSending(true);
                  socket.emit('announcement:broadcast', { examId, message: announcementText });
                  setTimeout(() => {
                    setAnnouncementSending(false);
                    toast('Pengumuman terkirim ke semua siswa');
                    setAnnouncementText('');
                  }, 600);
                }}
              >
                Kirim Pengumuman
              </Button>
            </div>
          </div>

          {/* Anulir soal */}
          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Koreksi Soal</h3>
            <p className="text-xs text-gray-400 mb-4">Anulir soal yang salah — semua siswa otomatis dapat poin penuh</p>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {exam?.questions?.map((q: any, i: number) => (
                <div key={q.id} className={`flex items-start justify-between gap-2 p-2 rounded-lg ${q.isNullified ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                  <p className={`text-xs flex-1 line-clamp-2 ${q.isNullified ? 'text-blue-500 line-through' : 'text-gray-700'}`}>
                    {i + 1}. {q.content}
                  </p>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!q.isNullified && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500 text-xs px-2"
                        onClick={() => setEditTarget(q)}
                      >
                        Edit
                      </Button>
                    )}
                    {!q.isNullified ? (
                      <Button size="sm" variant="ghost" className="text-red-500 text-xs px-2" onClick={() => setNullifyTarget(q)}>
                        Anulir
                      </Button>
                    ) : (
                      <span className="text-xs text-blue-500">Dianulir</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Live event log */}
          <div className="bg-white rounded-xl border border-blue-100 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Log Aktivitas</h3>
            <div className="space-y-1.5 max-h-48 overflow-y-auto">
              {liveEvents.length === 0 ? (
                <p className="text-xs text-gray-400">Belum ada aktivitas</p>
              ) : (
                liveEvents.map((ev, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs">
                    <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${ev.event === 'blur' ? 'bg-red-400' : 'bg-green-400'}`} />
                    <span className="text-gray-500 truncate">
                      <strong className="text-gray-700">{ev.studentName}</strong> {ev.event === 'blur' ? 'keluar tab' : 'kembali ke tab'} · {new Date(ev.at).toLocaleTimeString('id-ID')}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <QuestionEditModal
        open={!!editTarget}
        question={editTarget}
        examId={examId}
        onClose={() => setEditTarget(null)}
        onSaved={() => {
          qc.invalidateQueries({ queryKey: ['exam', examId] });
          toast('Soal berhasil diperbarui');
          setEditTarget(null);
        }}
        onError={() => toast('Gagal memperbarui soal', 'error')}
      />

      <ConfirmModal
        open={!!nullifyTarget}
        onClose={() => setNullifyTarget(null)}
        onConfirm={() => nullifyMutation.mutate(nullifyTarget?.id)}
        loading={nullifyMutation.isPending}
        title="Anulir Soal"
        message={`Anulir soal "${nullifyTarget?.content?.slice(0, 60)}..."? Semua siswa yang sedang maupun sudah mengerjakan akan mendapat poin penuh untuk soal ini.`}
        confirmLabel="Anulir Soal"
        danger={false}
      />
    </div>
  );
}
