'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { StatCard } from '@/components/ui/StatCard';
import { Badge } from '@/components/ui/Badge';
import { toast } from 'gooey-toast';

const typeLabel = (type: string) => {
  switch (type) {
    case 'MULTIPLE_CHOICE': return 'Pilihan Ganda';
    case 'MULTIPLE_ANSWER': return 'Pilihan Ganda Kompleks';
    case 'TRUE_FALSE': return 'Benar / Salah';
    case 'SHORT_ANSWER': return 'Isian Singkat';
    case 'FILL_BLANK': return 'Isian Rumpang';
    case 'MATCHING': return 'Menjodohkan';
    case 'ESSAY': return 'Uraian / Essay';
    default: return type;
  }
};

export default function ExamResultsPage() {
  const { id: examId } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState<'rekap' | 'analisis'>('rekap');
  const [expandedQuestions, setExpandedQuestions] = useState<Record<string, boolean>>({});

  const { data, isLoading } = useQuery({
    queryKey: ['results', examId],
    queryFn: () => api.get(`/api/results/exam/${examId}`).then((r) => r.data),
  });

  const { data: analysisData, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['results-analysis', examId],
    queryFn: () => api.get(`/api/results/exam/${examId}/analysis`).then((r) => r.data),
    enabled: activeTab === 'analisis',
  });

  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await api.get(`/api/results/exam/${examId}/export`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `hasil-ujian-${data?.exam?.title ?? examId}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success({ title: 'Berhasil diunduh', description: 'File Excel hasil ujian tersimpan.' });
    } catch {
      toast.error({ title: 'Unduh gagal', description: 'Pastikan ada data hasil ujian.' });
    } finally {
      setExporting(false);
    }
  }

  const toggleExpand = (qId: string) => {
    setExpandedQuestions((prev) => ({ ...prev, [qId]: !prev[qId] }));
  };

  if (isLoading) return <div className="p-8 text-gray-400 text-sm">Memuat hasil ujian...</div>;
  if (!data) return null;

  const { exam, sessions, totalStudents, avgScore, passCount } = data;
  const passRate = totalStudents > 0 ? Math.round((passCount / totalStudents) * 100) : 0;

  // Analysis stats variables
  const analysisList = analysisData?.questionAnalysis ?? [];
  const easyCount = analysisList.filter((q: any) => q.difficultyCategory === 'Mudah').length;
  const mediumCount = analysisList.filter((q: any) => q.difficultyCategory === 'Sedang').length;
  const hardCount = analysisList.filter((q: any) => q.difficultyCategory === 'Sukar').length;
  const poorDiscriminationCount = analysisList.filter((q: any) => q.discriminationIndex < 0.2).length;

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/exams/${examId}`} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Hasil & Analisis Ujian</h1>
            <p className="text-sm text-gray-500 mt-0.5">{exam?.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleExport} loading={exporting}>
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Excel
          </Button>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-gray-200 mb-6 gap-6">
        <button
          onClick={() => setActiveTab('rekap')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'rekap' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Rekap Hasil Ujian
          {activeTab === 'rekap' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />}
        </button>
        <button
          onClick={() => setActiveTab('analisis')}
          className={`pb-3 text-sm font-semibold transition-all relative ${
            activeTab === 'analisis' ? 'text-blue-600' : 'text-gray-500 hover:text-gray-800'
          }`}
        >
          Analisis Kualitas Soal
          {activeTab === 'analisis' && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-full" />}
        </button>
      </div>

      {/* TAB 1: REKAP HASIL */}
      {activeTab === 'rekap' && (
        <>
          {/* Summary stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Peserta"
              value={totalStudents}
              color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>}
            />
            <StatCard
              label="Nilai Rata-rata"
              value={`${avgScore.toFixed(1)}`}
              color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>}
            />
            <StatCard
              label="Lulus"
              value={passCount}
              sub={`KKM ${exam?.passingScore}`}
              color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
            />
            <StatCard
              label="Tingkat Kelulusan"
              value={`${passRate}%`}
              color="blue"
              icon={<svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
            />
          </div>

          {/* Distribusi nilai */}
          <div className="bg-white rounded-xl border border-blue-100 p-6 mb-6">
            <h2 className="font-semibold text-gray-900 mb-4">Distribusi Nilai</h2>
            <div className="flex items-end gap-2 h-24">
              {[
                { label: '0–29', min: 0, max: 30 },
                { label: '30–49', min: 30, max: 50 },
                { label: '50–59', min: 50, max: 60 },
                { label: '60–69', min: 60, max: 70 },
                { label: '70–79', min: 70, max: 80 },
                { label: '80–89', min: 80, max: 90 },
                { label: '90–100', min: 90, max: 101 },
              ].map((bucket) => {
                const count = sessions.filter((s: any) => s.score >= bucket.min && s.score < bucket.max).length;
                const pct = totalStudents > 0 ? (count / totalStudents) * 100 : 0;
                return (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-gray-700">{count > 0 ? count : ''}</span>
                    <div
                      className="w-full bg-blue-500 rounded-t-md transition-all"
                      style={{ height: `${Math.max(pct, count > 0 ? 8 : 0)}%` }}
                    />
                    <span className="text-xs text-gray-400 mt-1">{bucket.label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daftar nilai */}
          <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
            <div className="px-6 py-4 border-b border-blue-50">
              <h2 className="font-semibold text-gray-900">Daftar Nilai Siswa</h2>
            </div>
            {sessions.length === 0 ? (
              <p className="text-center py-12 text-gray-400 text-sm">Belum ada siswa yang submit</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[700px]">
                  <thead className="bg-blue-50">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">No</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">NIS</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Nama Siswa</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Kelas</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Nilai</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Pelanggaran</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Status</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-blue-700 uppercase">Waktu Submit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {sessions
                      .sort((a: any, b: any) => b.score - a.score)
                      .map((s: any, i: number) => {
                        const passed = s.score >= (exam?.passingScore ?? 70);
                        return (
                          <tr key={s.id} className="hover:bg-blue-50/30">
                            <td className="px-4 py-3 text-sm text-gray-400">{i + 1}</td>
                            <td className="px-4 py-3 text-xs font-mono text-gray-500">{s.student?.nis ?? '—'}</td>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.student?.name}</td>
                            <td className="px-4 py-3 text-xs text-gray-500">
                              {s.student?.jenjang && s.student?.kelas
                                ? `${s.student.jenjang} ${s.student.kelas}`
                                : '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-sm font-bold ${passed ? 'text-blue-600' : 'text-red-500'}`}>
                                {s.score?.toFixed(1) ?? '—'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {s.violationCount > 0 ? (
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  s.violationCount >= 3 ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                }`}>
                                  {s.violationCount}x (-{s.penaltyScore?.toFixed(0)}pts)
                                </span>
                              ) : (
                                <span className="text-xs text-gray-300">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${passed ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-600'}`}>
                                {passed ? 'Lulus' : 'Tidak Lulus'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-400">
                              {s.submittedAt ? new Date(s.submittedAt).toLocaleString('id-ID') : '—'}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* TAB 2: ANALISIS KUALITAS SOAL */}
      {activeTab === 'analisis' && (
        <>
          {isAnalysisLoading ? (
            <div className="p-8 text-center text-gray-400 text-sm">
              <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Menghitung analisis kualitas soal...
            </div>
          ) : totalStudents === 0 ? (
            <div className="bg-white border border-blue-100 rounded-xl p-12 text-center text-gray-400 text-sm">
              Belum ada hasil ujian. Analisis soal memerlukan minimal satu pengumpulan jawaban siswa.
            </div>
          ) : (
            <>
              {/* Analysis Stats Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                <StatCard
                  label="Soal Mudah"
                  value={easyCount}
                  sub="Difficulty > 0.7"
                  color="green"
                  icon={<svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                  label="Soal Sedang"
                  value={mediumCount}
                  sub="0.3 <= Difficulty <= 0.7"
                  color="orange"
                  icon={<svg className="w-5 h-5 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
                />
                <StatCard
                  label="Soal Sukar"
                  value={hardCount}
                  sub="Difficulty < 0.3"
                  color="purple"
                  icon={<svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m0 0v-3.5a9 9 0 10-18 0V13m18 0v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6" /></svg>}
                />
                <StatCard
                  label="Perlu Perbaikan"
                  value={poorDiscriminationCount}
                  sub="Daya Pembeda < 0.2"
                  color="purple"
                  icon={<svg className="w-5 h-5 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 18.333 3.53 20 5.07 20z" /></svg>}
                />
              </div>

              <div className="bg-white rounded-xl border border-blue-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-blue-50">
                  <h2 className="font-semibold text-gray-900">Analisis Butir Soal (Classical Item Analysis)</h2>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[850px]">
                    <thead className="bg-blue-50 text-xs font-semibold text-blue-700 uppercase">
                      <tr>
                        <th className="px-4 py-3 text-left w-12">No</th>
                        <th className="px-4 py-3 text-left w-32">Tipe Soal</th>
                        <th className="px-4 py-3 text-left">Teks Pertanyaan</th>
                        <th className="px-4 py-3 text-center w-36">Tingkat Kesulitan</th>
                        <th className="px-4 py-3 text-center w-36">Daya Pembeda</th>
                        <th className="px-4 py-3 text-center w-36">Status Kualitas</th>
                        <th className="px-4 py-3 text-center w-12"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {analysisList.map((q: any) => {
                        const isExpanded = !!expandedQuestions[q.id];
                        const difficultyPct = Math.round(q.difficultyIndex * 100);
                        const discrimination = q.discriminationIndex.toFixed(2);

                        // Colors for Difficulty
                        let diffColor = 'bg-yellow-100 text-yellow-800';
                        if (q.difficultyCategory === 'Mudah') diffColor = 'bg-green-100 text-green-800';
                        if (q.difficultyCategory === 'Sukar') diffColor = 'bg-red-100 text-red-800';

                        // Colors for Discrimination
                        let discColor = 'bg-yellow-100 text-yellow-800';
                        if (q.discriminationCategory === 'Sangat Baik') discColor = 'bg-green-100 text-green-800';
                        if (q.discriminationCategory === 'Baik') discColor = 'bg-emerald-100 text-emerald-800';
                        if (q.discriminationCategory === 'Buruk / Perlu Perbaikan') discColor = 'bg-red-100 text-red-800';

                        // Colors for Quality Status
                        let statusText = 'Baik';
                        let statusColor = 'bg-green-100 text-green-800';
                        if (q.discriminationIndex < 0) {
                          statusText = 'Dibuang / Fatal';
                          statusColor = 'bg-red-200 text-red-900 border border-red-300';
                        } else if (q.discriminationIndex < 0.2) {
                          statusText = 'Revisi Total';
                          statusColor = 'bg-red-100 text-red-800';
                        } else if (q.discriminationIndex < 0.3) {
                          statusText = 'Cukup / Revisi';
                          statusColor = 'bg-orange-100 text-orange-800';
                        }

                        if (q.isNullified) {
                          statusText = 'Dianulir';
                          statusColor = 'bg-gray-100 text-gray-500';
                        }

                        return (
                          <>
                            <tr
                              key={q.id}
                              onClick={() => toggleExpand(q.id)}
                              className="hover:bg-blue-50/20 cursor-pointer transition-colors"
                            >
                              <td className="px-4 py-4 text-sm font-medium text-gray-500">{q.order}</td>
                              <td className="px-4 py-4 text-xs font-semibold text-gray-500">{typeLabel(q.type)}</td>
                              <td className="px-4 py-4 text-sm text-gray-800 font-medium">
                                <div className="max-w-md truncate md:max-w-lg lg:max-w-xl">
                                  {q.content}
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${diffColor}`}>
                                  {difficultyPct}% ({q.difficultyCategory})
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-bold ${discColor}`}>
                                  {discrimination} ({q.discriminationCategory})
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className={`text-xs px-2.5 py-1 rounded-full font-extrabold ${statusColor}`}>
                                  {statusText}
                                </span>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <svg
                                  className={`w-4 h-4 text-gray-400 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </td>
                            </tr>

                            {/* Expanded options details */}
                            {isExpanded && (
                              <tr className="bg-blue-50/10">
                                <td colSpan={7} className="px-6 py-4 border-t border-gray-100">
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Pertanyaan Lengkap</h4>
                                      <p className="text-sm text-gray-900 bg-white border border-gray-200 rounded-xl p-4 leading-relaxed whitespace-pre-wrap">
                                        {q.content}
                                      </p>
                                    </div>

                                    {/* Option analysis */}
                                    {q.optionsAnalysis && q.optionsAnalysis.length > 0 && (
                                      <div>
                                        <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                                          Analisis Pilihan Jawaban & Efektivitas Pengecoh
                                        </h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                          {q.optionsAnalysis.map((opt: any) => {
                                            const pct = Math.round(opt.percentage);
                                            return (
                                              <div
                                                key={opt.id}
                                                className={`border rounded-xl p-4 bg-white flex flex-col justify-between gap-2 shadow-sm ${
                                                  opt.isCorrect ? 'border-blue-400 bg-blue-50/10' : 'border-gray-200'
                                                }`}
                                              >
                                                <div className="flex items-start gap-2">
                                                  <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5 ${
                                                    opt.isCorrect ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                                  }`}>
                                                    {opt.label}
                                                  </span>
                                                  <span className="text-sm text-gray-700 flex-1">{opt.content}</span>
                                                </div>

                                                <div className="flex items-center justify-between border-t border-gray-50 pt-2 mt-1">
                                                  <div className="flex items-center gap-3">
                                                    <span className="text-xs font-semibold text-gray-500">
                                                      Dipilih: <strong>{opt.count} siswa</strong> ({pct}%)
                                                    </span>
                                                    <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                                                      <div
                                                        className={`h-full ${opt.isCorrect ? 'bg-blue-500' : 'bg-gray-400'}`}
                                                        style={{ width: `${pct}%` }}
                                                      />
                                                    </div>
                                                  </div>

                                                  <div>
                                                    {opt.isCorrect ? (
                                                      <span className="text-[10px] bg-blue-100 text-blue-700 font-bold px-2 py-0.5 rounded-full uppercase">
                                                        Kunci Jawaban
                                                      </span>
                                                    ) : opt.isEffective ? (
                                                      <span className="text-[10px] bg-green-50 text-green-700 border border-green-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                                                        Pengecoh Efektif
                                                      </span>
                                                    ) : (
                                                      <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 font-bold px-2 py-0.5 rounded-full flex items-center gap-1 uppercase">
                                                        <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 18.333 3.53 20 5.07 20z" /></svg>
                                                        Pengecoh Tidak Efektif (&lt;5%)
                                                      </span>
                                                    )}
                                                  </div>
                                                </div>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Recommendations */}
                                    <div className="bg-blue-50/50 border border-blue-100 rounded-xl p-4">
                                      <h4 className="text-xs font-bold text-blue-800 uppercase tracking-wider mb-1">Rekomendasi Tindakan</h4>
                                      <p className="text-xs text-blue-700 leading-relaxed font-medium">
                                        {q.isNullified ? (
                                          'Soal ini sudah dianulir oleh guru selama ujian.'
                                        ) : q.discriminationIndex < 0 ? (
                                          '⚠️ PERINGATAN: Daya pembeda bernilai negatif. Artinya siswa berkemampuan rendah menjawab benar lebih banyak daripada siswa berkemampuan tinggi. Sangat disarankan untuk membuang soal ini dari bank soal atau merombak total pertanyaannya karena berpotensi membingungkan.'
                                        ) : q.discriminationIndex < 0.2 ? (
                                          '⚠️ PERINGATAN: Daya pembeda buruk (< 0.2). Soal ini kurang mampu membedakan tingkat pemahaman siswa. Disarankan untuk direvisi total, terutama pada opsi jawaban pengecoh atau kalimat pertanyaan yang kurang jelas.'
                                        ) : q.difficultyIndex < 0.2 ? (
                                          '💡 CATATAN: Soal ini dikategorikan sangat sukar (hanya <20% siswa menjawab benar). Pastikan topik ini sudah diajarkan dengan cukup mendalam di kelas.'
                                        ) : q.difficultyIndex > 0.85 ? (
                                          '💡 CATATAN: Soal ini sangat mudah (>85% siswa menjawab benar). Cukup baik sebagai apersepsi, namun kurang cocok sebagai instrumen seleksi utama.'
                                        ) : (
                                          '✓ Kualitas soal sudah sangat baik. Keseimbangan tingkat kesulitan sedang dan daya pembeda tinggi sangat ideal untuk terus digunakan di ujian mendatang.'
                                        )}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
