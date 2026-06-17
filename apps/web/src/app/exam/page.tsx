'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { toast as gToast } from 'gooey-toast';

export default function ExamStartPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { toast } = useToast();
  const [accessCode, setAccessCode] = useState('');

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/users/me').then((r) => r.data),
    enabled: !!session,
  });

  const startMutation = useMutation({
    mutationFn: () => api.post(`/api/sessions/exam/${accessCode.trim().toUpperCase()}/start`),
    onSuccess: (res) => router.push(`/exam/${res.data.session.id}`),
    onError: (e: any) => {
      const msg = e.response?.data?.message ?? '';
      if (msg.includes('belum aktif')) toast('Ujian belum dibuka oleh guru', 'error');
      else if (msg.includes('dikerjakan')) toast('Kamu sudah mengerjakan ujian ini', 'error');
      else if (msg.includes('tidak valid')) toast('Kode ujian tidak ditemukan', 'error');
      else toast('Gagal masuk ujian. Periksa kode dan coba lagi.', 'error');
    },
  });

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <span className="font-bold text-gray-900 text-sm">CBT Sekolah</span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-sm font-medium text-gray-900">{session?.user?.name}</p>
            <p className="text-xs text-gray-400">Siswa{me?.nis ? ` · NIS ${me.nis}` : ''}</p>
          </div>
          <button
            onClick={() => {
              gToast.info({ title: 'Keluar dari sistem...', description: 'Sampai jumpa!' });
              setTimeout(() => signOut({ callbackUrl: '/auth/login' }), 800);
            }}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-red-500 transition-colors"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Keluar
          </button>
        </div>
      </header>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Card */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            {/* Top accent */}
            <div className="h-1.5 bg-blue-600" />

            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h1 className="text-xl font-bold text-gray-900">Masuk Ujian</h1>
                <p className="text-sm text-gray-500 mt-1">Masukkan kode ujian dari guru Anda</p>
              </div>

              {/* Student info */}
              <div className="bg-blue-50 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                    {session?.user?.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{session?.user?.name}</p>
                    <p className="text-xs text-gray-500">
                      NIS: <span className="font-mono font-medium text-blue-700">{me?.nis ?? '—'}</span>
                    </p>
                  </div>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (accessCode.trim()) startMutation.mutate();
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Kode Ujian
                  </label>
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                    placeholder="Contoh: A3BF9K"
                    maxLength={8}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-center text-xl tracking-[0.3em] font-mono uppercase text-gray-900 bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoComplete="off"
                    autoCapitalize="characters"
                    required
                  />
                  <p className="text-xs text-gray-400 mt-1.5 text-center">Minta kode dari guru Anda, lalu ketik di sini</p>
                </div>

                <Button
                  type="submit"
                  size="lg"
                  className="w-full justify-center"
                  loading={startMutation.isPending}
                  disabled={accessCode.trim().length < 4}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Masuk ke Ujian
                </Button>
              </form>
            </div>
          </div>

          <p className="text-center text-xs text-gray-400 mt-4">
            Pastikan identitas dan kode ujian sudah benar sebelum memulai
          </p>
        </div>
      </div>
    </div>
  );
}
