'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge, examStatusColor, examStatusLabel } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';

export default function TeacherDashboard() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['exams'],
    queryFn: () => api.get('/api/exams').then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/exams/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exams'] });
      toast('Status ujian diperbarui');
    },
  });

  const active = exams.filter((e: any) => e.status === 'ACTIVE').length;
  const draft = exams.filter((e: any) => e.status === 'DRAFT').length;
  const finished = exams.filter((e: any) => e.status === 'FINISHED').length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daftar Ujian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola semua ujian Anda</p>
        </div>
        <Link href="/dashboard/exams/new">
          <Button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Ujian
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Ujian Aktif"
          value={active}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
        />
        <StatCard
          label="Draft"
          value={draft}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          }
        />
        <StatCard
          label="Selesai"
          value={finished}
          color="blue"
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          }
        />
      </div>

      {/* Exam list */}
      {isLoading ? (
        <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
      ) : exams.length === 0 ? (
        <div className="bg-white rounded-xl border border-blue-100 p-16 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">Belum ada ujian</p>
          <p className="text-sm text-gray-400 mt-1">Buat ujian pertama untuk mulai</p>
          <Link href="/dashboard/exams/new" className="mt-4 inline-block">
            <Button>Buat Ujian Sekarang</Button>
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Nama Ujian</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Kode</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Soal</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Durasi</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Peserta</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {exams.map((exam: any) => (
                <tr key={exam.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    {exam.description && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-xs">{exam.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {exam.accessCode ? (
                      <span className="font-mono text-xs font-semibold bg-blue-50 text-blue-700 px-2 py-1 rounded-lg tracking-widest">
                        {exam.accessCode}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam._count?.questions ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam.duration} menit</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam._count?.sessions ?? 0}</td>
                  <td className="px-6 py-4">
                    <Badge color={examStatusColor[exam.status]}>{examStatusLabel[exam.status]}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      <Link href={`/dashboard/exams/${exam.id}`}>
                        <Button size="sm" variant="ghost">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                          </svg>
                          Kelola
                        </Button>
                      </Link>
                      {exam.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: exam.id, status: 'ACTIVE' })}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Aktifkan
                        </Button>
                      )}
                      {exam.status === 'ACTIVE' && (
                        <>
                          <Link href={`/dashboard/exams/${exam.id}/monitor`}>
                            <Button size="sm" className="bg-blue-600 text-white text-xs">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0" />
                              </svg>
                              Live
                            </Button>
                          </Link>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateStatus.mutate({ id: exam.id, status: 'FINISHED' })}
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Selesai
                          </Button>
                        </>
                      )}
                      {exam.status === 'FINISHED' && (
                        <Link href={`/dashboard/exams/${exam.id}/results`}>
                          <Button size="sm" variant="outline">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            Nilai
                          </Button>
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}
    </div>
  );
}
