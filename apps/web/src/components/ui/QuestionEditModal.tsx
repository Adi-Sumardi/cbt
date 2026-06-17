'use client';

import { useRef, useState } from 'react';
import { Modal } from './Modal';
import { Button } from './Button';
import { Textarea } from './Input';
import api from '@/lib/api';

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'TRUE_FALSE'
  | 'ESSAY'
  | 'MULTIPLE_ANSWER'
  | 'SHORT_ANSWER'
  | 'FILL_BLANK'
  | 'MATCHING';

export interface QuestionOption {
  id?: string;
  label: string;
  content: string;
  isCorrect: boolean;
  order: number;
}

export interface QuestionForm {
  content: string;
  type: QuestionType;
  points: number;
  imageUrl?: string;
  options: QuestionOption[];
}

const defaultOptions: QuestionOption[] = [
  { label: 'A', content: '', isCorrect: false, order: 1 },
  { label: 'B', content: '', isCorrect: false, order: 2 },
  { label: 'C', content: '', isCorrect: false, order: 3 },
  { label: 'D', content: '', isCorrect: false, order: 4 },
];

export function getDefaultOptionsForType(t: QuestionType): QuestionOption[] {
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

export function questionFormFromQuestion(q: any): QuestionForm {
  return {
    content: q.content,
    type: q.type,
    points: q.points,
    imageUrl: q.imageUrl,
    options:
      q.options?.length > 0
        ? q.options.map((o: any) => ({ id: o.id, label: o.label, content: o.content, isCorrect: o.isCorrect, order: o.order }))
        : getDefaultOptionsForType(q.type),
  };
}

interface Props {
  open: boolean;
  question: any | null;
  examId: string;
  onClose: () => void;
  onSaved: () => void;
  onError: () => void;
  loading?: boolean;
}

export function QuestionEditModal({ open, question, examId, onClose, onSaved, onError }: Props) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<QuestionForm>({
    content: '',
    type: 'MULTIPLE_CHOICE',
    points: 1,
    options: defaultOptions.map((o) => ({ ...o })),
  });

  // Sync form when question changes
  const lastQId = useRef<string | null>(null);
  if (question && question.id !== lastQId.current) {
    lastQId.current = question.id;
    const f = questionFormFromQuestion(question);
    setForm(f);
  }
  if (!question && lastQId.current !== null) {
    lastQId.current = null;
  }

  async function handleImageUpload(file: File) {
    setImageUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await api.post('/api/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      setForm((f) => ({ ...f, imageUrl: res.data.url }));
    } catch {
      // silently ignore, caller handles errors
    } finally {
      setImageUploading(false);
    }
  }

  function setOptionCorrect(index: number) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => ({ ...o, isCorrect: i === index })) }));
  }

  function toggleOptionCorrect(index: number) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? { ...o, isCorrect: !o.isCorrect } : o)) }));
  }

  function updateOption(index: number, content: string) {
    setForm((f) => ({ ...f, options: f.options.map((o, i) => (i === index ? { ...o, content } : o)) }));
  }

  function addOption() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setForm((f) => ({
      ...f,
      options: [...f.options, { label: labels[f.options.length] ?? String(f.options.length + 1), content: '', isCorrect: false, order: f.options.length + 1 }],
    }));
  }

  function addMatchingPair() {
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    setForm((f) => ({
      ...f,
      options: [...f.options, { label: labels[f.options.length] ?? String(f.options.length + 1), content: '|||', isCorrect: true, order: f.options.length + 1 }],
    }));
  }

  function addBlank() {
    setForm((f) => ({
      ...f,
      options: [...f.options, { label: String(f.options.length + 1), content: '', isCorrect: true, order: f.options.length + 1 }],
    }));
  }

  function removeOption(index: number) {
    setForm((f) => ({ ...f, options: f.options.filter((_, i) => i !== index).map((o, i) => ({ ...o, order: i + 1 })) }));
  }

  function updateMatchingPair(index: number, side: 'left' | 'right', value: string) {
    setForm((f) => ({
      ...f,
      options: f.options.map((o, i) => {
        if (i !== index) return o;
        const parts = o.content.split('|||');
        const left = parts[0] ?? '';
        const right = parts[1] ?? '';
        return { ...o, content: side === 'left' ? `${value}|||${right}` : `${left}|||${value}` };
      }),
    }));
  }

  async function handleSave() {
    if (!question) return;
    setSaving(true);
    try {
      await api.patch(`/api/exams/${examId}/questions/${question.id}`, form);
      onSaved();
    } catch {
      onError();
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit Soal"
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Batal</Button>
          <Button onClick={handleSave} loading={saving} disabled={!form.content.trim()}>
            Simpan Perubahan
          </Button>
        </>
      }
    >
      <div className="space-y-5">
        <Textarea
          label="Teks Soal"
          value={form.content}
          onChange={(e) => setForm({ ...form, content: e.target.value })}
          placeholder={form.type === 'FILL_BLANK' ? 'Gunakan ____ sebagai penanda. Contoh: Ibu kota Indonesia adalah ____.' : 'Tuliskan pertanyaan di sini...'}
        />

        {/* Gambar soal */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gambar Soal (opsional)</label>
          {form.imageUrl ? (
            <div className="relative inline-block">
              <img src={form.imageUrl} alt="Gambar soal" className="max-h-48 rounded-xl border border-blue-100 object-contain bg-gray-50" />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, imageUrl: undefined }))}
                className="absolute top-2 right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
              >
                ×
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
              value={form.type}
              onChange={(e) => { const t = e.target.value as QuestionType; setForm((f) => ({ ...f, type: t, options: getDefaultOptionsForType(t) })); }}
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
              type="number" min={0.5} step={0.5}
              value={form.points}
              onChange={(e) => setForm({ ...form, points: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* MULTIPLE_CHOICE */}
        {form.type === 'MULTIPLE_CHOICE' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Pilihan Jawaban <span className="text-gray-400 font-normal">(klik lingkaran untuk tandai jawaban benar)</span></p>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${opt.isCorrect ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                  <button type="button" onClick={() => setOptionCorrect(i)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${opt.isCorrect ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                    {opt.isCorrect && <div className="w-2 h-2 bg-white rounded-full" />}
                  </button>
                  <span className="font-semibold text-sm text-gray-500 w-4">{opt.label}</span>
                  <input type="text" value={opt.content} onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Pilihan ${opt.label}`} className="flex-1 text-sm text-gray-900 bg-transparent outline-none" />
                  {form.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 6 && (
              <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:underline">+ Tambah pilihan</button>
            )}
          </div>
        )}

        {/* MULTIPLE_ANSWER */}
        {form.type === 'MULTIPLE_ANSWER' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Pilihan Jawaban <span className="text-gray-400 font-normal">(centang semua jawaban yang benar)</span></p>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 transition-colors ${opt.isCorrect ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
                  <button type="button" onClick={() => toggleOptionCorrect(i)}
                    className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${opt.isCorrect ? 'border-blue-600 bg-blue-600' : 'border-gray-300'}`}>
                    {opt.isCorrect && <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </button>
                  <span className="font-semibold text-sm text-gray-500 w-4">{opt.label}</span>
                  <input type="text" value={opt.content} onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Pilihan ${opt.label}`} className="flex-1 text-sm text-gray-900 bg-transparent outline-none" />
                  {form.options.length > 2 && (
                    <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            {form.options.length < 6 && (
              <button type="button" onClick={addOption} className="mt-2 text-sm text-blue-600 hover:underline">+ Tambah pilihan</button>
            )}
          </div>
        )}

        {/* TRUE_FALSE */}
        {form.type === 'TRUE_FALSE' && (
          <div>
            <p className="text-sm font-medium text-gray-700 mb-3">Jawaban Benar</p>
            <div className="flex gap-3">
              {form.options.map((opt, i) => (
                <button key={i} type="button" onClick={() => setOptionCorrect(i)}
                  className={`flex-1 py-3 rounded-xl border-2 font-medium text-sm transition-colors ${opt.isCorrect ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-600 hover:border-blue-300'}`}>
                  {opt.content}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* SHORT_ANSWER */}
        {form.type === 'SHORT_ANSWER' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunci Jawaban</label>
            <input type="text" value={form.options[0]?.content ?? ''} onChange={(e) => updateOption(0, e.target.value)}
              placeholder="Ketik kunci jawaban yang benar (tidak case-sensitive)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        )}

        {/* FILL_BLANK */}
        {form.type === 'FILL_BLANK' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Jawaban untuk setiap titik-titik</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-blue-600 w-8 flex-shrink-0">({opt.label})</span>
                  <input type="text" value={opt.content} onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Jawaban titik-titik ke-${opt.label}`}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  {form.options.length > 1 && (
                    <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addBlank} className="mt-2 text-sm text-blue-600 hover:underline">+ Tambah titik-titik</button>
          </div>
        )}

        {/* MATCHING */}
        {form.type === 'MATCHING' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Pasangan (Kiri — Kanan)</label>
            <div className="space-y-2">
              {form.options.map((opt, i) => {
                const parts = opt.content.split('|||');
                return (
                  <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <span className="text-sm font-semibold text-blue-600 w-6 flex-shrink-0">{opt.label}.</span>
                    <input type="text" value={parts[0] ?? ''} onChange={(e) => updateMatchingPair(i, 'left', e.target.value)}
                      placeholder="Teks kiri"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                    </svg>
                    <input type="text" value={parts[1] ?? ''} onChange={(e) => updateMatchingPair(i, 'right', e.target.value)}
                      placeholder="Teks kanan"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    {form.options.length > 2 && (
                      <button type="button" onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-500 text-lg leading-none">×</button>
                    )}
                  </div>
                );
              })}
            </div>
            <button type="button" onClick={addMatchingPair} className="mt-2 text-sm text-blue-600 hover:underline">+ Tambah pasangan</button>
            <p className="text-xs text-gray-400 mt-1">Sisi kanan akan diacak saat ditampilkan ke siswa</p>
          </div>
        )}

        {/* ESSAY */}
        {form.type === 'ESSAY' && (
          <div className="bg-blue-50 rounded-xl p-4 text-sm text-blue-700">
            Soal uraian perlu dinilai manual oleh guru setelah ujian selesai.
          </div>
        )}
      </div>
    </Modal>
  );
}
