'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const JENJANG_OPTIONS = [
  { value: '', label: 'Pilih jenjang...' },
  { value: 'SD', label: 'SD (Sekolah Dasar)' },
  { value: 'SMP', label: 'SMP (Sekolah Menengah Pertama)' },
  { value: 'SMA', label: 'SMA (Sekolah Menengah Atas)' },
  { value: 'SMK', label: 'SMK (Sekolah Menengah Kejuruan)' },
];

const KELAS_BY_JENJANG: Record<string, { value: string; label: string }[]> = {
  SD:  ['1','2','3','4','5','6'].map((k) => ({ value: k, label: 'Kelas ' + k })),
  SMP: ['7','8','9'].map((k) => ({ value: k, label: 'Kelas ' + k })),
  SMA: ['X','XI','XII'].map((k) => ({ value: k, label: 'Kelas ' + k })),
  SMK: ['X','XI','XII'].map((k) => ({ value: k, label: 'Kelas ' + k })),
};

export default function EditUserPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'STUDENT', nis: '', jenjang: '', kelas: '', rombel: '',
  });

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn: () => api.get(`/api/users/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        nis: user.nis ?? '',
        jenjang: user.jenjang ?? '',
        kelas: user.kelas ?? '',
        rombel: user.rombel ?? '',
      });
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: () =>
      api.patch(`/api/users/${id}`, {
        name: form.name,
        email: form.email,
        role: form.role,
        ...(form.password ? { password: form.password } : {}),
        ...(form.role === 'STUDENT' ? {
          nis: form.nis || null,
          jenjang: form.jenjang || null,
          kelas: form.kelas || null,
          rombel: form.rombel || null,
        } : {
          nis: null,
          jenjang: null,
          kelas: null,
          rombel: null,
        }),
      }),
    onSuccess: () => {
      toast('Pengguna berhasil diperbarui');
      router.push('/admin/users');
    },
    onError: () => toast('Gagal memperbarui pengguna', 'error'),
  });

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">Memuat...</div>;

  const kelasOptions = form.jenjang
    ? [{ value: '', label: 'Pilih kelas...' }, ...(KELAS_BY_JENJANG[form.jenjang] || [])]
    : [];

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href="/admin/users" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Pengguna</h1>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form
        onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}
        className="lg:col-span-2 bg-white rounded-xl border border-blue-100 p-6 space-y-5"
      >
        <Input
          label="Nama Lengkap"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
        />
        <Input
          label="Password Baru (kosongkan jika tidak diubah)"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
        />
        <Select
          label="Peran"
          value={form.role}
          onChange={(e) => setForm({ ...form, role: e.target.value, jenjang: '', kelas: '', rombel: '' })}
          options={[
            { value: 'ADMIN', label: 'Administrator' },
            { value: 'TEACHER', label: 'Guru' },
            { value: 'STUDENT', label: 'Siswa' },
          ]}
        />

        {form.role === 'STUDENT' && (
          <>
            <Input
              label="NIS (Nomor Induk Siswa)"
              value={form.nis}
              onChange={(e) => setForm({ ...form, nis: e.target.value })}
              placeholder="contoh: 2024001"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Jenjang"
                value={form.jenjang}
                onChange={(e) => setForm({ ...form, jenjang: e.target.value, kelas: '', rombel: '' })}
                options={JENJANG_OPTIONS}
              />
              <Select
                label="Kelas"
                value={form.kelas}
                onChange={(e) => setForm({ ...form, kelas: e.target.value, rombel: '' })}
                options={kelasOptions.length > 0 ? kelasOptions : [{ value: '', label: 'Pilih jenjang dulu' }]}
                disabled={!form.jenjang}
              />
            </div>
            <Input
              label="Rombel (Rombongan Belajar)"
              value={form.rombel}
              onChange={(e) => setForm({ ...form, rombel: e.target.value })}
              placeholder="contoh: A, B, IPA 1, IPS 2"
              disabled={!form.kelas}
            />
          </>
        )}

        <div className="flex gap-3 pt-2">
          <Button type="submit" loading={mutation.isPending}>Simpan Perubahan</Button>
          <Link href="/admin/users"><Button variant="outline">Batal</Button></Link>
        </div>
      </form>

        {/* Info panel */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6 h-fit">
          <h3 className="font-semibold text-blue-900 mb-3">Info Akun</h3>
          <div className="space-y-2 text-sm text-blue-800">
            {user?.createdAt && (
              <p>Terdaftar: <span className="font-medium">{new Date(user.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span></p>
            )}
            {user?.role === 'STUDENT' && user?.nis && (
              <p>NIS: <span className="font-mono font-medium">{user.nis}</span></p>
            )}
            {user?.jenjang && (
              <p>Jenjang: <span className="font-medium">{user.jenjang}</span></p>
            )}
            {user?.kelas && (
              <p>Kelas: <span className="font-medium">{user.kelas}</span></p>
            )}
            {user?.rombel && (
              <p>Rombel: <span className="font-medium">{user.rombel}</span></p>
            )}
          </div>
          <div className="mt-4 pt-4 border-t border-blue-200 text-xs text-blue-600">
            Kosongkan password jika tidak ingin mengubah password lama.
          </div>
        </div>
      </div>
    </div>
  );
}
