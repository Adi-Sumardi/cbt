'use client';

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import api from '@/lib/api';
import { getServerUrl, getDomainUrl } from '@/lib/serverUrl';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { Badge, examStatusColor, examStatusLabel } from '@/components/ui/Badge';
import { Modal, ConfirmModal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'ESSAY'
  | 'MULTIPLE_ANSWER'
  | 'SHORT_ANSWER'
  | 'FILL_BLANK'
  | 'MATCHING';

interface Option {
  id?: string;
  label: string;
  content: string;
  isCorrect: boolean;
  order: number;
}

interface QuestionForm {
  content: string;
  type: QuestionType;
  points: number;
  imageUrl?: string;
  options: Option[];
}

const defaultOptions: Option[] = [
  { label: 'A', content: '', isCorrect: false, order: 1 },
  { label: 'B', content: '', isCorrect: false, order: 2 },
  { label: 'C', content: '', isCorrect: false, order: 3 },
  { label: 'D', content: '', isCorrect: false, order: 4 },
];

function emptyForm(): QuestionForm {
  return { content: '', type: 'MULTIPLE_CHOICE', points: 1, options: defaultOptions.map((o) => ({ ...o })) };
}

function typeLabel(type: QuestionType): string {
  const labels: Record<QuestionType, string> = {
    MULTIPLE_CHOICE: 'Pilihan Ganda',
    TRUE_FALSE: 'Benar / Salah',
    ESSAY: 'Uraian / Essay',
    MULTIPLE_ANSWER: 'Pilihan Ganda (Multi-Jawaban)',
    SHORT_ANSWER: 'Jawaban Singkat',
    FILL_BLANK: 'Isian Kosong',
    MATCHING: 'Menjodohkan',
  };
  return labels[type] ?? type;
}

function getDefaultOptionsForType(t: QuestionType): Option[] {
  switch (t) {
    case 'MULTIPLE_CHOICE':
    case 'MULTIPLE_ANSWER':
      return defaultOptions.map((o) => ({ ...o }));
    case 'TRUE_FALSE':
      return [
        { label: 'A', content: 'Benar', isCorrect: false, order: 1 },
        { label: 'B', content: 'Salah', isCorrect: false, order: 2 },
      ];
    case 'SHORT_ANSWER':
      return [{ label: '1', content: '', isCorrect: true, order: 1 }];
    case 'FILL_BLANK':
      return [{ label: '1', content: '', isCorrect: true, order: 1 }];
    case 'MATCHING':
      return [
        { label: 'A', content: '|||', isCorrect: true, order: 1 },
        { label: 'B', content: '|||', isCorrect: true, order: 2 },
      ];
    case 'ESSAY':
      return [];
  }
}

export default function ExamDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const router = useRouter();

  const [qModal, setQModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [qForm, setQForm] = useState<QuestionForm>(emptyForm());
  const [imageUploading, setImageUploading] = useState(false);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [deleteQ, setDeleteQ] = useState<any>(null);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => api.get(`/api/exams/${id}`).then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: () =>
      editingQuestion
        ? api.patch(`/api/exams/${id}/questions/${editingQuestion.id}`, qForm)
        : api.post(`/api/exams/${id}/questions`, qForm),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      toast(editingQuestion ? 'Soal diperbarui' : 'Soal ditambahkan');
      setQModal(false);
    },
    onError: () => toast('Gagal menyimpan soal', 'error'),
  });

  function handleSaveQuestion() {
    if (!qForm.content.trim()) {
      toast('Teks soal tidak boleh kosong', 'error');
      return;
    }

    if (['MULTIPLE_CHOICE', 'MULTIPLE_ANSWER', 'TRUE_FALSE'].includes(qForm.type)) {
      if (qForm.options.length === 0) {
        toast('Pilihan jawaban tidak boleh kosong', 'error');
        return;
      }
      for (const opt of qForm.options) {
        if (!opt.content.trim()) {
          toast(`Teks pilihan ${opt.label} tidak boleh kosong`, 'error');
          return;
        }
      }
      const correctCount = qForm.options.filter((o) => o.isCorrect).length;
      if (['MULTIPLE_CHOICE', 'TRUE_FALSE'].includes(qForm.type) && correctCount !== 1) {
        toast('Pilih tepat satu jawaban yang benar', 'error');
        return;
      }
      if (qForm.type === 'MULTIPLE_ANSWER' && correctCount < 1) {
        toast('Pilih minimal satu jawaban yang benar', 'error');
        return;
      }
    }

    if (qForm.type === 'SHORT_ANSWER') {
      if (!qForm.options[0]?.content.trim()) {
        toast('Kunci jawaban singkat tidak boleh kosong', 'error');
        return;
      }
    }

    if (qForm.type === 'FILL_BLANK') {
      if (qForm.options.length === 0) {
        toast('Minimal harus ada satu isian kosong', 'error');
        return;
      }
      for (const opt of qForm.options) {
        if (!opt.content.trim()) {
          toast(`Jawaban untuk isian (${opt.label}) tidak boleh kosong`, 'error');
          return;
        }
      }
      const matches = qForm.content.match(/____/g);
      const placeholderCount = matches ? matches.length : 0;
      if (placeholderCount !== qForm.options.length) {
        toast(`Jumlah placeholder ____ (${placeholderCount}) tidak sesuai dengan jumlah jawaban (${qForm.options.length})`, 'error');
        return;
      }
    }

    if (qForm.type === 'MATCHING') {
      if (qForm.options.length === 0) {
        toast('Pasangan jodohkan tidak boleh kosong', 'error');
        return;
      }
      for (const opt of qForm.options) {
        const parts = opt.content.split('|||');
        const left = parts[0]?.trim();
        const right = parts[1]?.trim();
        if (!left || !right) {
          toast(`Pasangan ${opt.label} harus memiliki bagian kiri dan kanan`, 'error');
          return;
        }
      }
    }

    saveMutation.mutate();
  }

  const nullifyMutation = useMutation({
    mutationFn: (qId: string) => api.patch(`/api/exams/${id}/questions/${qId}/nullify`, {}),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      toast('Soal dianulir — semua siswa mendapat poin penuh');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => api.delete(`/api/exams/${id}/questions/${qId}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      toast('Soal dihapus');
      setDeleteQ(null);
    },
  });

  const statusMutation = useMutation({
    mutationFn: (status: string) => api.patch(`/api/exams/${id}/status`, { status }),
    onSuccess: (_, status) => {
      qc.invalidateQueries({ queryKey: ['exam', id] });
      toast(`Ujian ${status === 'ACTIVE' ? 'diaktifkan' : 'diselesaikan'}`);
    },
  });

  function openAddQuestion() {
    setEditingQuestion(null);
    setQForm(emptyForm());
    setQModal(true);
  }

  async function handleImageUpload(file: File) {
    setImageUploading(true);
    try {
      const form = new FormData();
      form.append('image', file);
      const res = await api.post('/api/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setQForm((f) => ({ ...f, imageUrl: res.data.url }));
    } catch {
      toast('Gagal upload gambar', 'error');
    } finally {
      setImageUploading(false);
    }
  }

  function openEditQuestion(q: any) {
    setEditingQuestion(q);
    setQForm({
      content: q.content,
      type: q.type,
      points: q.points,
      imageUrl: q.imageUrl,
      options:
        q.options.length > 0
          ? q.options.map((o: any) => ({ id: o.id, label: o.label, content: o.content, isCorrect: o.isCorrect, order: o.order }))
          : getDefaultOptionsForType(q.type),
    });
    setQModal(true);
  }

  // For MULTIPLE_CHOICE / TRUE_FALSE — single correct
  function setOptionCorrect(index: number) {
    setQForm((f) => ({
      ...f,
      options: f.options.map((o, i) => ({ ...o, isCorrect: i === index })),
    }));
  }

  // For MULTIPLE_ANSWER — toggle correct
  function toggleOptionCorrect(index: number) {
    setQForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)),
    }));
  }

  function updateOption(index: number, content: string) {
    setQForm((f) => ({
      ...f,
      options: f.options.map((o, i) => (i === index ? { ...o, content } : o)),
    }));
  }

  // Add option for MULTIPLE_CHOICE / MULTIPLE_ANSWER
  function addOption() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setQForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { label: labels[f.options.length] ?? String(f.options.length + 1), content: '', isCorrect: false, order: f.options.length + 1 },
      ],
    }));
  }

  // Add matching pair
  function addMatchingPair() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setQForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { label: labels[f.options.length] ?? String(f.options.length + 1), content: '|||', isCorrect: true, order: f.options.length + 1 },
      ],
    }));
  }

  function removeOption(index: number) {
    setQForm((f) => ({
      ...f,
      options: f.options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i + 1 })),
    }));
  }

  // Update matching left or right text
  function updateMatchingPair(index: number, side: 'left' | 'right', value: string) {
    setQForm((f) => ({
      ...f,
      options: f.options.map((o, i) => {
        if (i !== index) return o;
        const parts = o.content.split('|||');
        const left = parts[0] ?? '';
        const right = parts[1] ?? '';
        return {
          ...o,
          content: side === 'left' ? `${value}|||${right}` : `${left}|||${value}`,
        };
      }),
    }));
  }

  // Add blank for FILL_BLANK
  function addBlank() {
    setQForm((f) => ({
      ...f,
      options: [
        ...f.options,
        { label: String(f.options.length + 1), content: '', isCorrect: true, order: f.options.length + 1 },
      ],
    }));
  }

  if (isLoading) return <div className="p-4 sm:p-8 text-gray-400 text-sm">Memuat ujian...</div>;
  if (!exam) return <div className="p-4 sm:p-8 text-red-500 text-sm">Ujian tidak ditemukan</div>;

  const questions = exam.questions ?? [];
  const isActive = exam.status === 'ACTIVE';
  const isFinished = exam.status === 'FINISHED';

  return (
    <div className="p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-8">
        <div className="flex items-start gap-3">
          <Link href="/dashboard" className="text-gray-400 hover:text-gray-600 mt-1">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900">{exam.title}</h1>
              <Badge color={examStatusColor[exam.status]}>{examStatusLabel[exam.status]}</Badge>
            </div>
            <p className="text-sm text-gray-500 mt-0.5">
              {questions.length} soal · {exam.duration} menit · KKM {exam.passingScore}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isFinished && (
            <>
              <Link href={`/dashboard/exams/${id}/import`}>
                <Button variant="outline">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                  </svg>
                  Import Soal
                </Button>
              </Link>
              <Button variant="outline" onClick={openAddQuestion}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Tambah Soal
              </Button>
            </>
          )}
          {exam.status === 'DRAFT' && questions.length > 0 && (
            <Button onClick={() => statusMutation.mutate('ACTIVE')}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Aktifkan Ujian
            </Button>
          )}
          {isActive && (
            <>
              <Link href={`/dashboard/exams/${id}/monitor`}>
                <Button>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  Monitor Live
                </Button>
              </Link>
              <Button variant="outline" onClick={() => statusMutation.mutate('FINISHED')}>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Selesaikan
              </Button>
            </>
          )}
          {isFinished && (
            <Link href={`/dashboard/exams/${id}/results`}>
              <Button>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                Lihat Hasil
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Kode Ujian card */}
      {exam.accessCode && (() => {
        const base = getServerUrl() || (typeof window !== 'undefined' ? window.location.origin : '');
        const domain = getDomainUrl();
        const joinUrl = `${base}/exam?code=${exam.accessCode}`;
        const domainJoinUrl = domain ? `${domain}/exam?code=${exam.accessCode}` : null;
        return (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide mb-1">Kode Ujian untuk Siswa</p>
                <p className="text-3xl font-bold font-mono tracking-[0.2em] text-blue-800">{exam.accessCode}</p>
                <p className="text-xs text-blue-500 mt-1">Bagikan kode atau URL di bawah kepada siswa</p>
              </div>
              <button
                onClick={() => { navigator.clipboard.writeText(exam.accessCode); toast('Kode disalin!'); }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl text-sm font-medium transition-colors self-start sm:self-auto"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Salin Kode
              </button>
            </div>

            {/* URL via IP */}
            <div className="bg-white border border-blue-100 rounded-lg px-3 py-2 flex items-center gap-2">
              <span className="text-[10px] font-semibold text-gray-400 uppercase flex-shrink-0 w-12">IP</span>
              <span className="text-xs font-mono text-gray-600 flex-1 truncate">{joinUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(joinUrl); toast('URL IP disalin!'); }}
                className="text-blue-500 hover:text-blue-700 flex-shrink-0"
                title="Salin URL IP"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            {/* URL via Domain (opsional) */}
            {domainJoinUrl && (
              <div className="bg-purple-50 border border-purple-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <span className="text-[10px] font-semibold text-purple-400 uppercase flex-shrink-0 w-12">Domain</span>
                <span className="text-xs font-mono text-purple-700 flex-1 truncate">{domainJoinUrl}</span>
                <button
                  onClick={() => { navigator.clipboard.writeText(domainJoinUrl); toast('URL domain disalin!'); }}
                  className="text-purple-500 hover:text-purple-700 flex-shrink-0"
                  title="Salin URL Domain"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })()}

      {/* Bank Soal heading */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          Bank Soal
          <span className="text-sm font-normal text-gray-400">({questions.length} soal)</span>
        </h2>
      </div>

      {/* Question list */}
      {questions.length === 0 ? (
        <div className="bg-white rounded-xl border border-blue-100 p-16 text-center">
          <p className="text-gray-500">Belum ada soal. Klik "Tambah Soal" untuk mulai.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {questions.map((q: any, idx: number) => (
            <div
              key={q.id}
              className={`bg-white rounded-xl border ${q.isNullified ? 'border-blue-200 bg-blue-50/30' : 'border-blue-100'} p-5`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 bg-blue-100 text-blue-700 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm text-gray-900 leading-relaxed ${q.isNullified ? 'line-through text-gray-400' : ''}`}>
                    {q.content}
                  </p>
                  {q.isNullified && (
                    <span className="inline-flex items-center gap-1 mt-1 text-xs text-orange-700 bg-orange-100 px-2 py-0.5 rounded-full">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Dianulir — semua siswa dapat poin penuh
                    </span>
                  )}
                  {q.imageUrl && (
                    <img
                      src={q.imageUrl}
                      alt="Gambar soal"
                      className="mt-2 max-h-40 rounded-lg border border-blue-100 object-contain bg-gray-50"
                    />
                  )}

                  {/* Preview options per type */}
                  {(q.type === 'MULTIPLE_CHOICE' || q.type === 'MULTIPLE_ANSWER') && !q.isNullified && (
                    <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-1">
                      {q.options.map((opt: any) => (
                        <div
                          key={opt.id}
                          className={`flex items-center gap-2 text-xs px-2.5 py-1.5 rounded-lg ${
                            opt.isCorrect
                              ? 'bg-blue-50 border border-blue-200 text-blue-700 font-medium'
                              : 'text-gray-500 bg-gray-50'
                          }`}
                        >
                          <span className="font-semibold w-4 flex-shrink-0">{opt.label}.</span>
                          <span className="flex-1">{opt.content}</span>
                          {opt.isCorrect && (
                            <svg className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {q.type === 'TRUE_FALSE' && !q.isNullified && (
                    <div className="mt-2 flex gap-2">
                      {q.options.map((opt: any) => (
                        <span
                          key={opt.id}
                          className={`text-xs px-3 py-1 rounded-full font-medium ${
                            opt.isCorrect ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {opt.content}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === 'SHORT_ANSWER' && !q.isNullified && (
                    <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-1.5">
                      Kunci: <span className="font-medium text-blue-700">{q.options[0]?.content ?? '-'}</span>
                    </div>
                  )}
                  {q.type === 'FILL_BLANK' && !q.isNullified && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {q.options.map((opt: any) => (
                        <span key={opt.id} className="text-xs bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full">
                          ({opt.label}) {opt.content}
                        </span>
                      ))}
                    </div>
                  )}
                  {q.type === 'MATCHING' && !q.isNullified && (
                    <div className="mt-2 space-y-1">
                      {q.options.map((opt: any) => {
                        const parts = opt.content.split('|||');
                        return (
                          <div key={opt.id} className="text-xs flex items-center gap-2">
                            <span className="font-semibold text-blue-600 w-5">{opt.label}.</span>
                            <span className="text-gray-700">{parts[0] ?? ''}</span>
                            <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                            </svg>
                            <span className="text-gray-700">{parts[1] ?? ''}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-xs text-gray-400">{q.points} poin</span>
                    <span className="text-xs text-gray-300">·</span>
                    <span className="text-xs text-gray-400">{typeLabel(q.type)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              {!isFinished && (
                <div className="flex items-center gap-2 mt-4 pt-3 border-t border-gray-100">
                  <Button size="sm" variant="outline" onClick={() => openEditQuestion(q)}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit Soal
                  </Button>

                  {!q.isNullified && isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-orange-600 hover:bg-orange-50"
                      onClick={() => nullifyMutation.mutate(q.id)}
                      loading={nullifyMutation.isPending}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Anulir Soal
                    </Button>
                  )}

                  {q.isNullified && isActive && (
                    <span className="text-xs text-orange-600 bg-orange-50 px-3 py-1.5 rounded-lg font-medium">
                      Soal ini telah dianulir
                    </span>
                  )}

                  {!isActive && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-red-500 hover:bg-red-50 ml-auto"
                      onClick={() => setDeleteQ(q)}
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Hapus
                    </Button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Question modal */}
      <Modal
        open={qModal}
        onClose={() => setQModal(false)}
        title={editingQuestion ? 'Edit Soal' : 'Tambah Soal'}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setQModal(false)}>Batal</Button>
            <Button onClick={handleSaveQuestion} loading={saveMutation.isPending}>
              {editingQuestion ? 'Simpan Perubahan' : 'Tambah Soal'}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <Textarea
            label="Teks Soal"
            value={qForm.content}
            onChange={(e) => setQForm({ ...qForm, content: e.target.value })}
            placeholder={
              qForm.type === 'FILL_BLANK'
                ? 'Gunakan ____ (4 garis bawah) sebagai penanda titik-titik. Contoh: Ibu kota Indonesia adalah ____.'
                : 'Tuliskan pertanyaan di sini...'
            }
            className="dir-auto"
            style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" } as any}
          />

          {qForm.type === 'FILL_BLANK' && (
            <p className="text-xs text-blue-600 bg-blue-50 rounded-lg px-3 py-2">
              Gunakan <code className="font-mono font-bold">____</code> (4 garis bawah) untuk setiap titik-titik.
              Jumlah titik-titik harus sesuai dengan jawaban di bawah.
            </p>
          )}

          {/* Gambar soal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Soal (opsional)</label>
            {qForm.imageUrl ? (
              <div className="relative inline-block">
                <img
                  src={qForm.imageUrl}
                  alt="Gambar soal"
                  className="max-h-48 rounded-xl border border-blue-100 object-contain bg-gray-50"
                />
                <button
                  type="button"
                  onClick={() => setQForm((f) => ({ ...f, imageUrl: undefined }))}
                  className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                >
                  x
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={imageUploading}
                className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-blue-300 rounded-xl text-sm text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
              >
                {imageUploading ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                )}
                {imageUploading ? 'Mengompresi & menyimpan...' : 'Upload gambar'}
              </button>
            )}
            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
            />
            <p className="text-xs text-gray-400 mt-1">JPG/PNG/WebP · maks 10MB · otomatis dikompres</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipe Soal</label>
              <select
                value={qForm.type}
                onChange={(e) => {
                  const t = e.target.value as QuestionType;
                  setQForm((f) => ({
                    ...f,
                    type: t,
                    options: getDefaultOptionsForType(t),
                  }));
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="MULTIPLE_CHOICE">Pilihan Ganda</option>
                <option value="MULTIPLE_ANSWER">Pilihan Ganda (Multi-Jawaban)</option>
                <option value="TRUE_FALSE">Benar / Salah</option>
                <option value="SHORT_ANSWER">Jawaban Singkat</option>
                <option value="FILL_BLANK">Isian Kosong (____)</option>
                <option value="MATCHING">Menjodohkan</option>
                <option value="ESSAY">Uraian / Essay</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Poin</label>
              <input
                type="number"
                min={0.5}
                step={0.5}
                value={qForm.points}
                onChange={(e) => setQForm({ ...qForm, points: parseFloat(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* ---- MULTIPLE_CHOICE options (single correct, radio) ---- */}
          {qForm.type === 'MULTIPLE_CHOICE' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pilihan Jawaban <span className="text-gray-400 font-normal">(klik lingkaran untuk tandai jawaban benar)</span>
              </p>
              <div className="space-y-2">
                {qForm.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${
                      opt.isCorrect ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setOptionCorrect(i)}
                      className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        opt.isCorrect ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {opt.isCorrect && <div className="w-2 h-2 bg-white rounded-full" />}
                    </button>
                    <span className="font-semibold text-sm text-gray-500 w-4">{opt.label}</span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Pilihan ${opt.label}`}
                      className="flex-1 text-sm text-gray-900 bg-transparent outline-none"
                    />
                    {qForm.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {qForm.options.length < 6 && (
                <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:underline">
                  + Tambah pilihan
                </button>
              )}
            </div>
          )}

          {/* ---- MULTIPLE_ANSWER options (multi correct, checkbox) ---- */}
          {qForm.type === 'MULTIPLE_ANSWER' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Pilihan Jawaban <span className="text-gray-400 font-normal">(centang semua jawaban yang benar)</span>
              </p>
              <div className="space-y-2">
                {qForm.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${
                      opt.isCorrect ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleOptionCorrect(i)}
                      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                        opt.isCorrect ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                      }`}
                    >
                      {opt.isCorrect && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                    <span className="font-semibold text-sm text-gray-500 w-4">{opt.label}</span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Pilihan ${opt.label}`}
                      className="flex-1 text-sm text-gray-900 bg-transparent outline-none"
                    />
                    {qForm.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {qForm.options.length < 6 && (
                <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:underline">
                  + Tambah pilihan
                </button>
              )}
              <p className="text-xs text-blue-600 mt-2">Skor parsial: (benar - salah) / total_benar</p>
            </div>
          )}

          {/* ---- TRUE_FALSE ---- */}
          {qForm.type === 'TRUE_FALSE' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-3">
                Jawaban Benar <span className="text-gray-400 font-normal">(klik untuk tandai jawaban benar)</span>
              </p>
              <div className="flex gap-3">
                {qForm.options.map((opt, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setOptionCorrect(i)}
                    className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${
                      opt.isCorrect ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'
                    }`}
                  >
                    {opt.content}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ---- SHORT_ANSWER ---- */}
          {qForm.type === 'SHORT_ANSWER' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Kunci Jawaban</label>
              <input
                type="text"
                value={qForm.options[0]?.content ?? ''}
                onChange={(e) => updateOption(0, e.target.value)}
                placeholder="Ketik kunci jawaban yang benar (tidak case-sensitive)"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Perbandingan tidak memperhatikan huruf besar/kecil</p>
            </div>
          )}

          {/* ---- FILL_BLANK ---- */}
          {qForm.type === 'FILL_BLANK' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Jawaban untuk setiap titik-titik
              </label>
              <div className="space-y-2">
                {qForm.options.map((opt, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-blue-600 w-8 flex-shrink-0">({opt.label})</span>
                    <input
                      type="text"
                      value={opt.content}
                      onChange={(e) => updateOption(i, e.target.value)}
                      placeholder={`Jawaban titik-titik ke-${opt.label}`}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {qForm.options.length > 1 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
                        x
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addBlank} className="mt-2 text-sm text-blue-600 hover:underline">
                + Tambah titik-titik
              </button>
              <p className="text-xs text-gray-400 mt-1">
                Pastikan jumlah titik-titik ({qForm.options.length}) sesuai dengan ____ dalam teks soal.
              </p>
            </div>
          )}

          {/* ---- MATCHING ---- */}
          {qForm.type === 'MATCHING' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Pasangan (Kiri — Kanan)</label>
              <div className="space-y-2">
                {qForm.options.map((opt, i) => {
                  const parts = opt.content.split('|||');
                  const leftText = parts[0] ?? '';
                  const rightText = parts[1] ?? '';
                  return (
                    <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                      <span className="text-sm font-semibold text-blue-600 w-6 flex-shrink-0">{opt.label}.</span>
                      <input
                        type="text"
                        value={leftText}
                        onChange={(e) => updateMatchingPair(i, 'left', e.target.value)}
                        placeholder="Teks kiri"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <svg className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                      </svg>
                      <input
                        type="text"
                        value={rightText}
                        onChange={(e) => updateMatchingPair(i, 'right', e.target.value)}
                        placeholder="Teks kanan"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      {qForm.options.length > 2 && (
                        <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">
                          x
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
              <button type="button" onClick={addMatchingPair} className="mt-2 text-sm text-blue-600 hover:underline">
                + Tambah pasangan
              </button>
              <p className="text-xs text-gray-400 mt-1">Sisi kanan akan diacak saat ditampilkan ke siswa</p>
            </div>
          )}

          {/* ---- ESSAY ---- */}
          {qForm.type === 'ESSAY' && (
            <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
              Soal uraian perlu dinilai manual oleh guru setelah ujian selesai.
            </div>
          )}
        </div>
      </Modal>

      <ConfirmModal
        open={!!deleteQ}
        onClose={() => setDeleteQ(null)}
        onConfirm={() => deleteMutation.mutate(deleteQ?.id)}
        loading={deleteMutation.isPending}
        title="Hapus Soal"
        message="Yakin ingin menghapus soal ini? Tindakan tidak dapat dibatalkan."
      />
    </div>
  );
}
