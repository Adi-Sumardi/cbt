'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, examStatusColor, examStatusLabel } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import Link from 'next/link';

const statusList = ['', 'DRAFT', 'ACTIVE', 'FINISHED', 'ARCHIVED'];

export default function AdminExamsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const { data: exams = [], isLoading } = useQuery({
    queryKey: ['admin-exams', statusFilter],
    queryFn: () =>
      api.get('/api/exams/all', { params: { status: statusFilter || undefined } }).then((r) => r.data),
  });

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.patch(`/api/exams/${id}/status`, { status }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-exams'] });
      toast('Status ujian diperbarui');
    },
  });

  const filtered = exams.filter((e: any) =>
    e.title.toLowerCase().includes(search.toLowerCase()) ||
    e.teacher?.name?.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manajemen Ujian</h1>
          <p className="text-sm text-gray-500 mt-0.5">Pantau dan kelola semua ujian dari seluruh guru</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex-1 sm:max-w-sm">
          <Input placeholder="Cari ujian atau guru..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="flex flex-wrap gap-1 bg-white border border-blue-100 rounded-lg p-1 h-fit">
          {statusList.map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                statusFilter === s ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {s === '' ? 'Semua' : examStatusLabel[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Tidak ada ujian ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-blue-50 border-b border-blue-100">
              <tr>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Nama Ujian</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Guru</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Soal</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Peserta</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map((exam: any) => (
                <tr key={exam.id} className="hover:bg-blue-50/30 transition-colors">
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{exam.title}</p>
                    <p className="text-xs text-gray-400">{exam.duration} menit · KKM {exam.passingScore}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam.teacher?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam._count?.questions ?? 0}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">{exam._count?.sessions ?? 0}</td>
                  <td className="px-6 py-4">
                    <Badge color={examStatusColor[exam.status]}>{examStatusLabel[exam.status]}</Badge>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-1">
                      {exam.status === 'DRAFT' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: exam.id, status: 'ACTIVE' })}
                        >
                          Aktifkan
                        </Button>
                      )}
                      {exam.status === 'ACTIVE' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: exam.id, status: 'FINISHED' })}
                        >
                          Selesaikan
                        </Button>
                      )}
                      <Link href={`/dashboard/exams/${exam.id}/edit`}>
                        <Button size="sm" variant="outline">Edit</Button>
                      </Link>
                      <Link href={`/dashboard/exams/${exam.id}`}>
                        <Button size="sm" variant="ghost">Kelola</Button>
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  );
}
