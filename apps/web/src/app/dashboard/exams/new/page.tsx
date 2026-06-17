'use client';

import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const TOGGLE_OPTS = [
  { key: 'shuffleQuestions', label: 'Acak urutan soal', desc: 'Setiap siswa mendapat urutan soal yang berbeda' },
  { key: 'shuffleOptions',   label: 'Acak pilihan jawaban', desc: 'Urutan opsi A/B/C/D diacak per siswa' },
  { key: 'showResult',       label: 'Tampilkan hasil langsung', desc: 'Siswa bisa lihat nilai setelah submit' },
  { key: 'requireSeb',       label: 'Wajib Safe Exam Browser', desc: 'Siswa hanya bisa ikut ujian menggunakan SEB' },
];

export default function NewExamPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    title: '',
    description: '',
    duration: 60,
    passingScore: 70,
    targetJenjang: '',
    targetKelas: '',
    shuffleQuestions: false,
    shuffleOptions: false,
    showResult: false,
    requireSeb: false,
  });

  const [selectedRombel, setSelectedRombel] = useState<string[]>([]);
  const [customRombel, setCustomRombel] = useState('');

  const JENJANG_OPTS = ['SD', 'SMP', 'SMA', 'SMK'];
  const KELAS_BY_JENJANG: Record<string, string[]> = {
    SD:  ['1', '2', '3', '4', '5', '6'],
    SMP: ['7', '8', '9'],
    SMA: ['X', 'XI', 'XII'],
    SMK: ['X', 'XI', 'XII'],
  };

  // Load existing rombel values dari siswa yang match jenjang+kelas
  const { data: existingRombel = [] } = useQuery<string[]>({
    queryKey: ['rombel-opts', form.targetJenjang, form.targetKelas],
    queryFn: async () => {
      const params: Record<string, string> = { role: 'STUDENT' };
      if (form.targetJenjang) params.jenjang = form.targetJenjang;
      if (form.targetKelas) params.kelas = form.targetKelas;
      const { data } = await api.get('/api/users', { params });
      const rombels = [...new Set<string>(
        (data as any[]).map((u: any) => u.rombel).filter(Boolean)
      )].sort();
      return rombels;
    },
    enabled: !!form.targetJenjang,
  });

  function toggleRombel(r: string) {
    setSelectedRombel((prev) =>
      prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]
    );
  }

  function buildTargetRombel(): string | null {
    const fromSelected = selectedRombel;
    const fromCustom = customRombel.split(',').map((s) => s.trim()).filter(Boolean);
    const all = [...new Set([...fromSelected, ...fromCustom])];
    return all.length > 0 ? all.join(',') : null;
  }

  const mutation = useMutation({
    mutationFn: () => api.post('/api/exams', {
      ...form,
      targetJenjang: form.targetJenjang || null,
      targetKelas: form.targetKelas || null,
      targetRombel: buildTargetRombel(),
    }),
    onSuccess: (res) => {
      toast('Ujian berhasil dibuat');
      router.push(`/dashboard/exams/${res.data.id}`);
    },
    onError: () => toast('Gagal membuat ujian', 'error'),
  });

  function toggle(key: string) {
    setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }));
  }

  return (
    <div className="p-4 sm:p-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <Link href="/dashboard/exams" className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Buat Ujian Baru</h1>
          <p className="text-sm text-gray-500">Isi informasi dasar ujian — soal ditambahkan di langkah berikutnya</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom kiri — info utama */}
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-blue-100 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Informasi Ujian</h2>
              <Input
                label="Judul Ujian"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                placeholder="contoh: Ujian Tengah Semester Matematika Kelas X"
                required
              />
              <Textarea
                label="Deskripsi (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Keterangan singkat tentang ujian ini"
              />

              {/* Target peserta */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Target Peserta</label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Jenjang</label>
                    <select
                      value={form.targetJenjang}
                      onChange={(e) => setForm({ ...form, targetJenjang: e.target.value, targetKelas: '' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Semua Jenjang</option>
                      {JENJANG_OPTS.map((j) => <option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Kelas</label>
                    <select
                      value={form.targetKelas}
                      onChange={(e) => setForm({ ...form, targetKelas: e.target.value })}
                      disabled={!form.targetJenjang}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
                    >
                      <option value="">Semua Kelas</option>
                      {(KELAS_BY_JENJANG[form.targetJenjang] ?? []).map((k) => (
                        <option key={k} value={k}>{k}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-1.5">
                  {form.targetJenjang
                    ? `Ujian untuk siswa ${form.targetJenjang}${form.targetKelas ? ` kelas ${form.targetKelas}` : ''}`
                    : 'Biarkan kosong agar ujian bisa diikuti semua jenjang'}
                </p>
              </div>

              {/* Rombel selector — muncul kalau sudah pilih jenjang */}
              {form.targetJenjang && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700">Rombel</label>
                    {selectedRombel.length > 0 && (
                      <button type="button" onClick={() => setSelectedRombel([])} className="text-xs text-gray-400 hover:text-red-500">
                        Batal pilih semua
                      </button>
                    )}
                  </div>

                  {existingRombel.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {existingRombel.map((r) => {
                        const checked = selectedRombel.includes(r);
                        return (
                          <button
                            key={r}
                            type="button"
                            onClick={() => toggleRombel(r)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                              checked
                                ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-purple-400 hover:bg-purple-50'
                            }`}
                          >
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                              checked ? 'bg-white border-white' : 'border-gray-300'
                            }`}>
                              {checked && <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                            </span>
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Belum ada data rombel untuk kelas ini. Ketik manual di bawah.</p>
                  )}

                  {/* Input tambahan untuk rombel yang belum ada di data siswa */}
                  <input
                    type="text"
                    value={customRombel}
                    onChange={(e) => setCustomRombel(e.target.value)}
                    placeholder={existingRombel.length > 0 ? 'Tambah rombel lain (pisah koma)...' : 'contoh: A, B, IPA 1, IPS 2'}
                    className="mt-2 w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />

                  <p className="text-xs mt-1.5 text-gray-400">
                    {buildTargetRombel()
                      ? <span className="text-purple-600 font-medium">Target rombel: {buildTargetRombel()}</span>
                      : 'Tidak ada yang dipilih = semua rombel'}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Durasi (menit)</label>
                  <input
                    type="number" min={5} max={360}
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">KKM / Nilai Lulus</label>
                  <input
                    type="number" min={0} max={100}
                    value={form.passingScore}
                    onChange={(e) => setForm({ ...form, passingScore: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Kolom kanan — opsi */}
          <div className="space-y-5">
            <div className="bg-white rounded-xl border border-blue-100 p-6">
              <h2 className="font-semibold text-gray-900 mb-5">Opsi Ujian</h2>
              <div className="space-y-4">
                {TOGGLE_OPTS.map((opt) => (
                  <div key={opt.key} className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={() => toggle(opt.key)}
                      className={`w-10 h-6 rounded-full relative transition-colors flex-shrink-0 mt-0.5 ${
                        form[opt.key as keyof typeof form] ? 'bg-blue-600' : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                          form[opt.key as keyof typeof form] ? 'translate-x-5' : 'translate-x-1'
                        }`}
                      />
                    </button>
                    <div>
                      <p className="text-sm font-medium text-gray-800">{opt.label}</p>
                      <p className="text-xs text-gray-400">{opt.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <Button type="submit" loading={mutation.isPending} className="w-full justify-center">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Buat Ujian &amp; Tambah Soal
              </Button>
              <Link href="/dashboard/exams">
                <Button type="button" variant="outline" className="w-full justify-center">Batal</Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
