'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Badge, examStatusColor, examStatusLabel } from '@/components/ui/Badge';
import { StatCard } from '@/components/ui/StatCard';
import { useToast } from '@/components/ui/Toast';
import { useState } from 'react';

export default function ExamsListPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

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
    onError: () => toast('Gagal memperbarui status', 'error'),
  });

  const filtered = exams.filter((e: any) => {
    const matchSearch = e.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const counts = {
    total: exams.length,
    active: exams.filter((e: any) => e.status === 'ACTIVE').length,
    draft: exams.filter((e: any) => e.status === 'DRAFT').length,
    finished: exams.filter((e: any) => e.status === 'FINISHED').length,
  };

  const statuses = [
    { key: 'ALL', label: 'Semua', count: counts.total },
    { key: 'DRAFT', label: 'Draft', count: counts.draft },
    { key: 'ACTIVE', label: 'Aktif', count: counts.active },
    { key: 'FINISHED', label: 'Selesai', count: counts.finished },
  ];

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Daftar Ujian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola semua ujian yang telah Anda buat</p>
        </div>
        <Link href="/dashboard/exams/new">
          <Button>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Buat Ujian Baru
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Ujian" value={counts.total} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>}
        />
        <StatCard label="Ujian Aktif" value={counts.active} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard label="Draft" value={counts.draft} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>}
        />
        <StatCard label="Selesai" value={counts.finished} color="blue"
          icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2m-6 9l2 2 4-4" /></svg>}
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-1 max-w-sm">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari ujian..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {statuses.map((s) => (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === s.key
                  ? 'bg-white text-blue-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {s.label}
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
                statusFilter === s.key ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-500'
              }`}>
                {s.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Exam list */}
      {isLoading ? (
        <div className="text-center py-16 text-gray-400 text-sm">Memuat data...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-blue-100 p-16 text-center">
          <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-6 h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-600 font-medium">{search ? 'Ujian tidak ditemukan' : 'Belum ada ujian'}</p>
          {!search && (
            <Link href="/dashboard/exams/new" className="mt-4 inline-block">
              <Button>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Ujian Pertama
              </Button>
            </Link>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((exam: any) => (
            <div key={exam.id} className="bg-white rounded-xl border border-blue-100 p-5 hover:border-blue-300 transition-colors">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">{exam.title}</h3>
                    <Badge color={examStatusColor[exam.status]}>{examStatusLabel[exam.status]}</Badge>
                  </div>
                  {exam.description && (
                    <p className="text-xs text-gray-400 truncate mb-2">{exam.description}</p>
                  )}
                  <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {exam._count?.questions ?? 0} soal
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {exam.duration} menit
                    </span>
                    <span className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {exam._count?.sessions ?? 0} peserta
                    </span>
                    {exam.accessCode && (
                      <span className="flex items-center gap-1 font-mono bg-blue-50 text-blue-700 px-2 py-0.5 rounded font-semibold tracking-wider">
                        {exam.accessCode}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex flex-wrap items-center gap-2">
                  <Link href={`/dashboard/exams/${exam.id}/edit`}>
                    <Button size="sm" variant="outline">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Edit
                    </Button>
                  </Link>
                  <Link href={`/dashboard/exams/${exam.id}`}>
                    <Button size="sm" variant="outline">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Kelola
                    </Button>
                  </Link>

                  {exam.status === 'DRAFT' && exam._count?.questions > 0 && (
                    <Button
                      size="sm"
                      onClick={() => updateStatus.mutate({ id: exam.id, status: 'ACTIVE' })}
                      loading={updateStatus.isPending}
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
                        <Button size="sm" variant="outline">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                          Monitor
                        </Button>
                      </Link>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-gray-500"
                        onClick={() => updateStatus.mutate({ id: exam.id, status: 'FINISHED' })}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Selesaikan
                      </Button>
                    </>
                  )}

                  {exam.status === 'FINISHED' && (
                    <Link href={`/dashboard/exams/${exam.id}/results`}>
                      <Button size="sm" variant="outline">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                        </svg>
                        Lihat Nilai
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
