'use client';

import { signOut, useSession } from 'next-auth/react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { toast } from 'gooey-toast';

export default function StudentDashboard() {
  const { data: session } = useSession();

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/users/me').then((r) => r.data),
    enabled: !!session,
  });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img src="/logo/logo.png" alt="CBT Logo" className="w-8 h-8 rounded-full object-cover" />
          <span className="font-bold text-gray-900 text-sm">CBT Sekolah</span>
        </div>
        <button
          onClick={() => {
            toast.info({ title: 'Keluar dari sistem...', description: 'Sampai jumpa!' });
            setTimeout(() => signOut({ callbackUrl: '/auth/login' }), 800);
          }}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 hover:bg-red-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Keluar
        </button>
      </header>

      <div className="max-w-2xl mx-auto p-6 space-y-6">
        {/* Profile card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-blue-600 rounded-2xl flex items-center justify-center text-white font-bold text-xl">
              {session?.user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">{session?.user?.name}</h1>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Siswa</span>
                {me?.nis && (
                  <span className="text-xs text-gray-500">NIS: <span className="font-mono font-medium text-gray-700">{me.nis}</span></span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Start exam card */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="h-1 bg-blue-600" />
          <div className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div className="flex-1">
                <h2 className="font-semibold text-gray-900">Mulai Ujian</h2>
                <p className="text-sm text-gray-500 mt-0.5">Minta kode ujian dari guru, lalu masukkan untuk memulai</p>
                <Link
                  href="/exam"
                  className="inline-flex items-center gap-2 mt-4 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Masukkan Kode Ujian
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Info card */}
        <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
          <div className="flex items-start gap-3">
            <svg className="w-4 h-4 text-blue-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-xs text-blue-700 leading-relaxed">
              Pastikan koneksi internet stabil sebelum memulai ujian. Jawaban akan tersimpan otomatis setiap beberapa detik.
            </p>
          </div>
        </div>

        <p className="mt-6 text-center text-[11px] text-gray-400">
          © {new Date().getFullYear()} adilabs.id · Seluruh hak dilindungi
        </p>
      </div>
    </div>
  );
}
