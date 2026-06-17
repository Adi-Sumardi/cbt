'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge, roleColor, roleLabel } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ImportUsersModal } from '@/components/admin/ImportUsersModal';

const JENJANG_OPTIONS = ['SD', 'SMP', 'SMA', 'SMK'];

const KELAS_BY_JENJANG: Record<string, string[]> = {
  SD:  ['1', '2', '3', '4', '5', '6'],
  SMP: ['7', '8', '9'],
  SMA: ['X', 'XI', 'XII'],
  SMK: ['X', 'XI', 'XII'],
};

export default function AdminUsersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [jenjangFilter, setJenjangFilter] = useState('');
  const [kelasFilter, setKelasFilter] = useState('');
  const [rombelFilter, setRombelFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<any>(null);
  const [importOpen, setImportOpen] = useState(false);

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users', roleFilter, jenjangFilter, kelasFilter, rombelFilter],
    queryFn: () =>
      api.get('/api/users', {
        params: {
          role: roleFilter || undefined,
          jenjang: jenjangFilter || undefined,
          kelas: kelasFilter || undefined,
          rombel: rombelFilter || undefined,
        },
      }).then((r) => r.data),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      toast('Pengguna berhasil dihapus');
      setDeleteTarget(null);
    },
    onError: () => toast('Gagal menghapus pengguna', 'error'),
  });

  const filtered = users.filter(
    (u: any) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.nis && u.nis.includes(search)),
  );

  const kelasOptions = jenjangFilter ? KELAS_BY_JENJANG[jenjangFilter] || [] : [];
  const rombelOptions = kelasFilter
    ? [...new Set(users.filter((u: any) => u.rombel).map((u: any) => u.rombel as string))].sort()
    : [];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Manajemen Pengguna</h1>
          <p className="text-sm text-gray-500 mt-0.5">Kelola akun admin, guru, dan siswa</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setImportOpen(true)}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 11l3 3m0 0l3-3m-3 3V4" />
            </svg>
            Import
          </Button>
          <Link href="/admin/users/new">
            <Button>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Tambah Pengguna
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter bar */}
      <div className="bg-white rounded-xl border border-blue-100 p-4 mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cari nama, email, atau NIS..."
                className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Role filter */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 flex-shrink-0">
            {(['', 'ADMIN', 'TEACHER', 'STUDENT'] as const).map((r) => (
              <button
                key={r}
                onClick={() => { setRoleFilter(r); if (r !== 'STUDENT') { setJenjangFilter(''); setKelasFilter(''); setRombelFilter(''); } }}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                  roleFilter === r ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {r === '' ? 'Semua' : roleLabel[r]}
              </button>
            ))}
          </div>
        </div>

        {/* Jenjang & Kelas filter — hanya tampil saat filter siswa */}
        {(roleFilter === 'STUDENT' || roleFilter === '') && (
          <div className="flex flex-wrap gap-3 pt-1 border-t border-gray-100">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Jenjang:</span>
              <div className="flex gap-1">
                <button
                  onClick={() => { setJenjangFilter(''); setKelasFilter(''); setRombelFilter(''); }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    jenjangFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  Semua
                </button>
                {JENJANG_OPTIONS.map((j) => (
                  <button
                    key={j}
                    onClick={() => { setJenjangFilter(j); setKelasFilter(''); setRombelFilter(''); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      jenjangFilter === j ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>

            {jenjangFilter && kelasOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Kelas:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => { setKelasFilter(''); setRombelFilter(''); }}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      kelasFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                  </button>
                  {kelasOptions.map((k) => (
                    <button
                      key={k}
                      onClick={() => { setKelasFilter(k); setRombelFilter(''); }}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        kelasFilter === k ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {kelasFilter && rombelOptions.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 font-medium whitespace-nowrap">Rombel:</span>
                <div className="flex flex-wrap gap-1">
                  <button
                    onClick={() => setRombelFilter('')}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      rombelFilter === '' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    Semua
                  </button>
                  {rombelOptions.map((rb) => (
                    <button
                      key={rb}
                      onClick={() => setRombelFilter(rb)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        rombelFilter === rb ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {rb}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-gray-500">
          Menampilkan <span className="font-medium text-gray-900">{filtered.length}</span> pengguna
          {jenjangFilter && <span className="text-blue-600"> · {jenjangFilter}{kelasFilter ? ' Kelas ' + kelasFilter : ''}{rombelFilter ? ' Rombel ' + rombelFilter : ''}</span>}
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Memuat...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Tidak ada pengguna ditemukan</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[700px]">
              <thead className="bg-blue-50 border-b border-blue-100">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Nama</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Email / NIS</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Jenjang / Kelas / Rombel</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Peran</th>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-blue-700 uppercase tracking-wider">Terdaftar</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((user: any) => (
                  <tr key={user.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold text-sm flex-shrink-0">
                          {user.name[0].toUpperCase()}
                        </div>
                        <span className="text-sm font-medium text-gray-900">{user.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-gray-600">{user.email}</p>
                      {user.role === 'STUDENT' && user.nis && (
                        <p className="text-xs font-mono text-gray-400 mt-0.5">NIS: {user.nis}</p>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'STUDENT' && (user.jenjang || user.kelas) ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {user.jenjang && (
                            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md font-medium">
                              {user.jenjang}
                            </span>
                          )}
                          {user.kelas && (
                            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md font-medium">
                              Kelas {user.kelas}
                            </span>
                          )}
                          {user.rombel && (
                            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-md font-medium">
                              {user.rombel}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-gray-300 text-sm">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <Badge color={roleColor[user.role]}>{roleLabel[user.role]}</Badge>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400">
                      {new Date(user.createdAt).toLocaleDateString('id-ID')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <Link href={`/admin/users/${user.id}`}>
                          <Button variant="ghost" size="sm">
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            Edit
                          </Button>
                        </Link>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget(user)}
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          Hapus
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ConfirmModal
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => deleteMutation.mutate(deleteTarget?.id)}
        loading={deleteMutation.isPending}
        title="Hapus Pengguna"
        message={`Yakin ingin menghapus akun "${deleteTarget?.name}"? Tindakan ini tidak dapat dibatalkan.`}
      />

      <ImportUsersModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ['admin-users'] });
          toast('Pengguna berhasil diimport');
        }}
      />
    </div>
  );
}
