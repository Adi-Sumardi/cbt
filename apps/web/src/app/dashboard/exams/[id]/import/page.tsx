'use client';

import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

type ImportMode = 'text' | 'excel';

// ─── Parser soal format teks biasa (Notepad/Word) ───────────────────────────
function parseTextQuestions(raw: string) {
  const questions: any[] = [];
  // Pisahkan per blok soal (diawali angka + titik)
  const blocks = raw.trim().split(/\n(?=\s*\d+[\.\)]\s)/);

  for (const block of blocks) {
    const lines = block.trim().split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Baris pertama harus diawali nomor soal
    if (!/^\d+[\.\)]/.test(lines[0])) continue;
    const questionLine = lines[0].replace(/^\d+[\.\)]\s*/, '').trim();
    if (!questionLine) continue;

    const options: any[] = [];
    let jawaban = '';
    let poin = 1;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      // Opsi: A. / B. / A) / B) / a. / b.
      const optMatch = line.match(/^([A-Da-d])[\.\)]\s*(.+)/);
      if (optMatch) {
        options.push({
          label: optMatch[1].toUpperCase(),
          content: optMatch[2].trim(),
          isCorrect: false,
          order: options.length + 1,
        });
        continue;
      }
      // Jawaban: "Jawaban: B" / "Kunci: B" / "Kunci Jawaban: B"
      const ansMatch = line.match(/^(?:Jawaban|Kunci\s*Jawaban?)\s*[:\-]\s*([A-Da-d])/i);
      if (ansMatch) { jawaban = ansMatch[1].toUpperCase(); continue; }
      // Poin: "Poin: 2" / "Bobot: 2"
      const poinMatch = line.match(/^(?:Poin|Bobot|Nilai)\s*[:\-]\s*(\d+(?:\.\d+)?)/i);
      if (poinMatch) { poin = parseFloat(poinMatch[1]); continue; }
    }

    // Tandai jawaban benar
    if (jawaban && options.length > 0) {
      options.forEach((o) => { o.isCorrect = o.label === jawaban; });
    }

    let type: string;
    if (options.length === 0) type = 'ESSAY';
    else if (options.length === 2 && options.some((o) => /^(benar|salah|true|false)$/i.test(o.content))) type = 'TRUE_FALSE';
    else type = 'MULTIPLE_CHOICE';

    questions.push({ content: questionLine, type, points: poin, options });
  }
  return questions;
}

const TEMPLATE_TEXT = `1. Berapakah nilai x jika 2x + 4 = 10?
A. 2
B. 3
C. 4
D. 5
Jawaban: B
Poin: 1

2. Ibukota Indonesia adalah Jakarta.
A. Benar
B. Salah
Jawaban: A
Poin: 1

3. Jelaskan pengertian fotosintesis!
Poin: 5`;

export default function ImportQuestionsPage() {
  const { id: examId } = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<ImportMode>('text');
  const [textInput, setTextInput] = useState('');
  const [preview, setPreview] = useState<any[]>([]);
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [showTemplate, setShowTemplate] = useState(false);

  // Parse dari Excel via API
  const parseMutation = useMutation({
    mutationFn: async (f: File) => {
      const form = new FormData();
      form.append('file', f);
      return api.post('/api/import/parse', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    },
    onSuccess: (res) => { setPreview(res.data); setStep('preview'); },
    onError: () => toast('Gagal mem-parse file Excel. Cek format kolom.', 'error'),
  });

  // Import soal ke database
  const importMutation = useMutation({
    mutationFn: () => api.post(`/api/exams/${examId}/questions/bulk`, { questions: preview }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['exam', examId] });
      toast(`${preview.length} soal berhasil diimpor`);
      router.push(`/dashboard/exams/${examId}`);
    },
    onError: () => toast('Gagal menyimpan soal', 'error'),
  });

  function handleParseText() {
    if (!textInput.trim()) return toast('Teks soal kosong', 'error');
    const parsed = parseTextQuestions(textInput);
    if (parsed.length === 0) return toast('Format tidak dikenali. Cek contoh template.', 'error');
    setPreview(parsed);
    setStep('preview');
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) parseMutation.mutate(f);
  }

  function reset() { setStep('input'); setPreview([]); setTextInput(''); }

  function downloadTemplate() {
    const header = ['no', 'pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'jawaban_benar', 'poin'];
    const rows = [
      [1, 'Contoh soal pilihan ganda?', 'Pilihan A', 'Pilihan B', 'Pilihan C', 'Pilihan D', 'A', 1],
      [2, 'Soal benar/salah?', 'Benar', 'Salah', '', '', 'A', 1],
      [3, '2 + 2 = ?', '3', '4', '5', '6', 'B', 2],
    ];
    const csvContent = [header, ...rows].map((r) => r.join(',')).join('\n');
    const blob = new Blob(['﻿' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template_soal_cbt.csv';
    a.click();
    URL.revokeObjectURL(url);
    toast('Template berhasil diunduh');
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/exams/${examId}`} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Import Soal</h1>
            <p className="text-sm text-gray-500">Dari teks biasa (Notepad/Word) atau file Excel</p>
          </div>
        </div>
        <button
          onClick={downloadTemplate}
          className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors flex-shrink-0"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download Template Excel
        </button>
      </div>

      {step === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Mode tabs */}
          <div className="flex gap-1 bg-blue-50 p-1 rounded-xl w-fit border border-blue-100">
            <button
              onClick={() => setMode('text')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'text' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Teks / Word / Notepad
            </button>
            <button
              onClick={() => setMode('excel')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                mode === 'excel' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              File Excel (.xlsx)
            </button>
          </div>

          {mode === 'text' && (
            <>
              {/* Panduan format */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-blue-800 mb-1">Format Penulisan Soal</p>
                    <p className="text-xs text-blue-600">Salin soal dari Notepad atau Word langsung ke kotak teks di bawah. Format yang dikenali:</p>
                    <ul className="mt-2 space-y-1 text-xs text-blue-700">
                      <li>• <code className="bg-blue-100 px-1 rounded">1.</code> atau <code className="bg-blue-100 px-1 rounded">1)</code> — nomor soal</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">A.</code> / <code className="bg-blue-100 px-1 rounded">A)</code> — pilihan jawaban (A–D)</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">Jawaban: B</code> — kunci jawaban</li>
                      <li>• <code className="bg-blue-100 px-1 rounded">Poin: 1</code> — bobot soal (opsional, default 1)</li>
                      <li>• Soal tanpa opsi = <strong>Essay</strong>. Opsi Benar/Salah = <strong>Benar/Salah</strong>.</li>
                    </ul>
                  </div>
                  <button
                    onClick={() => setShowTemplate(!showTemplate)}
                    className="text-xs text-blue-600 hover:underline whitespace-nowrap flex-shrink-0"
                  >
                    {showTemplate ? 'Sembunyikan' : 'Lihat contoh'}
                  </button>
                </div>

                {showTemplate && (
                  <div className="mt-4">
                    <div className="bg-white rounded-lg border border-blue-200 p-4">
                      <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{TEMPLATE_TEXT}</pre>
                    </div>
                    <button
                      onClick={() => { setTextInput(TEMPLATE_TEXT); setShowTemplate(false); }}
                      className="mt-2 text-xs text-blue-600 hover:underline"
                    >
                      Pakai contoh ini
                    </button>
                  </div>
                )}
              </div>

              {/* Text area */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tempel soal di sini
                </label>
                <textarea
                  rows={16}
                  value={textInput}
                  onChange={(e) => setTextInput(e.target.value)}
                  placeholder={`1. Berapakah nilai x jika 2x + 4 = 10?\nA. 2\nB. 3\nC. 4\nD. 5\nJawaban: B\nPoin: 1\n\n2. Soal berikutnya...`}
                  className="w-full px-4 py-3 border border-blue-200 rounded-xl text-sm font-mono text-gray-900 bg-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none leading-relaxed"
                  style={{ fontFamily: "'Courier New', 'Consolas', monospace" }}
                  dir="auto"
                />
                <p className="text-xs text-gray-400 mt-1">Mendukung soal berbahasa Indonesia, Arab, Mandarin, dan simbol matematika</p>
              </div>

              <Button onClick={handleParseText} disabled={!textInput.trim()} size="lg">
                Proses Soal
              </Button>
            </>
          )}

          {mode === 'excel' && (
            <>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
                <p className="text-sm font-medium text-blue-800 mb-1">Format kolom Excel</p>
                <p className="text-xs text-blue-600 mb-2">
                  Baris pertama adalah header. Kolom: <code className="bg-blue-100 px-1 rounded">Soal | Opsi A | Opsi B | Opsi C | Opsi D | Jawaban | Poin</code>
                </p>
                <a href="/api/import/template" className="text-xs text-blue-700 font-medium hover:underline">
                  Download template Excel →
                </a>
              </div>

              <div
                className="border-2 border-dashed border-blue-200 rounded-xl p-12 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {parseMutation.isPending ? (
                  <div>
                    <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Memproses file...</p>
                  </div>
                ) : (
                  <>
                    <svg className="w-10 h-10 text-blue-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    <p className="text-gray-600 font-medium">Klik untuk upload file Excel</p>
                    <p className="text-sm text-gray-400 mt-1">Format: .xlsx, .xls</p>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileChange} />
              </div>
            </>
          )}
        </div>

          {/* Panduan (kolom kanan) */}
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
              <p className="text-sm font-semibold text-blue-900 mb-3">Format Teks (Notepad)</p>
              <pre className="text-xs text-blue-800 whitespace-pre-wrap leading-relaxed font-mono bg-white rounded-lg p-3 border border-blue-100">{`1. Pertanyaan soal?
A. Pilihan A
B. Pilihan B
C. Pilihan C
D. Pilihan D
Jawaban: B
Poin: 2`}</pre>
            </div>
            <div className="bg-green-50 rounded-xl border border-green-100 p-5">
              <p className="text-sm font-semibold text-green-900 mb-2">Format Excel</p>
              <p className="text-xs text-green-700 mb-3">Kolom yang diperlukan:</p>
              <div className="space-y-1 text-xs font-mono text-green-800">
                {['no', 'pertanyaan', 'pilihan_a', 'pilihan_b', 'pilihan_c', 'pilihan_d', 'jawaban_benar', 'poin'].map((col) => (
                  <div key={col} className="bg-white px-2 py-0.5 rounded border border-green-100">{col}</div>
                ))}
              </div>
              <p className="text-xs text-green-600 mt-3">jawaban_benar diisi A / B / C / D</p>
            </div>
          </div>
        </div>
      )}

      {step === 'preview' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm">
              <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="text-gray-700">
                <strong className="text-blue-600">{preview.length} soal</strong> berhasil dikenali
              </span>
            </div>
            <button className="text-sm text-blue-600 hover:underline" onClick={reset}>Ulangi</button>
          </div>

          <div className="bg-white rounded-xl border border-blue-100 divide-y divide-gray-50 max-h-[55vh] overflow-y-auto">
            {preview.map((q, i) => (
              <div key={i} className="px-5 py-4">
                <div className="flex items-start gap-3">
                  <span className="w-6 h-6 bg-blue-100 text-blue-700 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900" dir="auto">{q.content}</p>
                    {q.options?.length > 0 && (
                      <div className="mt-2 grid grid-cols-2 gap-1">
                        {q.options.map((opt: any, j: number) => (
                          <span
                            key={j}
                            className={`text-xs px-2 py-1 rounded-lg ${opt.isCorrect ? 'bg-blue-100 text-blue-700 font-medium' : 'text-gray-400'}`}
                            dir="auto"
                          >
                            {opt.label}. {opt.content} {opt.isCorrect && '✓'}
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-xs text-gray-400">
                        {q.type === 'ESSAY' ? 'Essay' : q.type === 'TRUE_FALSE' ? 'Benar/Salah' : 'Pilihan Ganda'}
                      </span>
                      <span className="text-xs text-gray-400">{q.points} poin</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-3">
            <Button onClick={() => importMutation.mutate()} loading={importMutation.isPending} size="lg">
              Import {preview.length} Soal ke Ujian
            </Button>
            <Button variant="outline" size="lg" onClick={reset}>Batal</Button>
          </div>
        </div>
      )}
    </div>
  );
}
