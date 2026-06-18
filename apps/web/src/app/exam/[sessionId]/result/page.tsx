'use client';

import { useQuery } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { useSession } from 'next-auth/react';

export default function ExamResultPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { data: session } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ['session-result', sessionId],
    queryFn: () => api.get(`/api/results/session/${sessionId}`).then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat hasil...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { exam, score } = data;
  const passed = score >= (exam?.passingScore ?? 70);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-blue-100 px-6 py-4 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <span className="font-bold text-gray-900">CBT</span>
      </header>

      <div className="max-w-2xl mx-auto p-8">
        {/* Score card */}
        <div className="bg-white rounded-2xl border border-blue-100 p-8 text-center mb-6">
          <div className={`w-20 h-20 rounded-full mx-auto flex items-center justify-center mb-4 ${
            passed ? 'bg-blue-100' : 'bg-red-50'
          }`}>
            {passed ? (
              <svg className="w-10 h-10 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>

          <p className="text-sm text-gray-500 mb-1">{exam?.title}</p>
          <p className="text-5xl font-bold text-gray-900 mb-2">{score?.toFixed(1)}</p>
          <span className={`inline-block px-4 py-1.5 rounded-full text-sm font-semibold ${
            passed ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'
          }`}>
            {passed ? 'LULUS' : 'TIDAK LULUS'}
          </span>
          <p className="text-xs text-gray-400 mt-3">KKM: {exam?.passingScore}</p>
          <p className="text-sm text-gray-600 mt-2">
            Halo <strong>{session?.user?.name}</strong>, ujian telah selesai dikumpulkan.
          </p>
        </div>

        {/* Pembahasan & kunci jawaban sengaja TIDAK ditampilkan ke siswa
            (mencegah penyebaran via screenshot/foto). Siswa hanya melihat nilai. */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 text-center text-sm text-blue-700">
          Pembahasan dan kunci jawaban tidak ditampilkan. Silakan tanyakan ke guru bila ada yang ingin dibahas.
        </div>

        <div className="mt-6 text-center">
          <Link href="/exam" className="text-sm text-blue-600 hover:underline">
            Kembali ke halaman ujian
          </Link>
        </div>
      </div>
    </div>
  );
}
