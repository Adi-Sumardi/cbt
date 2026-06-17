'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
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

export default function NewUserPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'STUDENT', nis: '', jenjang: '', kelas: '', rombel: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
        role: form.role,
        ...(form.role === 'STUDENT' ? {
          nis: form.nis || undefined,
          jenjang: form.jenjang || undefined,
          kelas: form.kelas || undefined,
          rombel: form.rombel || undefined,
        } : {}),
      }),
    onSuccess: () => {
      toast('Pengguna berhasil ditambahkan');
      router.push('/admin/users');
    },
    onError: (e: any) => toast(e.response?.data?.message || 'Gagal menambahkan pengguna', 'error'),
  });

  function validate() {
    const errs: Record<string, string> = {};
    if (!form.name.trim()) errs.name = 'Nama wajib diisi';
    if (!form.email.trim()) errs.email = 'Email wajib diisi';
    if (form.password.length < 8) errs.password = 'Password minimal 8 karakter';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  const kelasOptions = form.jenjang
    ? [{ value: '', label: 'Pilih kelas...' }, ...( KELAS_BY_JENJANG[form.jenjang] || [])]
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
          <h1 className="text-xl font-bold text-gray-900">Tambah Pengguna</h1>
          <p className="text-sm text-gray-500">Buat akun baru untuk guru atau siswa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <form onSubmit={(e) => { e.preventDefault(); if (validate()) mutation.mutate(); }} className="lg:col-span-2 bg-white rounded-xl border border-blue-100 p-6 space-y-5">
        <Input
          label="Nama Lengkap"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          error={errors.name}
          placeholder="contoh: Budi Santoso"
        />
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          error={errors.email}
          placeholder="contoh: budi@sekolah.sch.id"
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          error={errors.password}
          placeholder="Minimal 8 karakter"
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
          <Button type="submit" loading={mutation.isPending}>Simpan Pengguna</Button>
          <Link href="/admin/users">
            <Button type="button" variant="outline">Batal</Button>
          </Link>
        </div>
      </form>

        {/* Kolom kanan — panduan */}
        <div className="bg-blue-50 rounded-xl border border-blue-100 p-6 h-fit">
          <h3 className="font-semibold text-blue-900 mb-3">Panduan Pengisian</h3>
          <ul className="space-y-2 text-sm text-blue-800">
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>Email digunakan sebagai username login</li>
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>Password minimal 8 karakter</li>
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>NIS hanya untuk akun Siswa, bersifat unik</li>
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>Jenjang, Kelas &amp; Rombel digunakan untuk filter dan pengelompokan</li>
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>Rombel contoh: A, B, IPA 1, IPS 2 (opsional)</li>
            <li className="flex gap-2"><span className="text-blue-400 flex-shrink-0">·</span>Untuk import banyak siswa sekaligus, gunakan fitur Import Excel</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
