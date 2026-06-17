'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';

const TOGGLE_OPTS = [
  { key: 'shuffleQuestions', label: 'Acak urutan soal', desc: 'Setiap siswa mendapat urutan soal yang berbeda' },
  { key: 'shuffleOptions',   label: 'Acak pilihan jawaban', desc: 'Urutan opsi A/B/C/D diacak per siswa' },
  { key: 'showResult',       label: 'Tampilkan hasil langsung', desc: 'Siswa bisa lihat nilai setelah submit' },
  { key: 'requireSeb',       label: 'Wajib Safe Exam Browser', desc: 'Siswa hanya bisa ikut ujian melalui mode terkunci bawaan aplikasi' },
];

const JENJANG_OPTS = ['SD', 'SMP', 'SMA', 'SMK'];
const KELAS_BY_JENJANG: Record<string, string[]> = {
  SD:  ['1', '2', '3', '4', '5', '6'],
  SMP: ['7', '8', '9'],
  SMA: ['X', 'XI', 'XII'],
  SMK: ['X', 'XI', 'XII'],
};

export default function EditExamPage() {
  const { id } = useParams<{ id: string }>();
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
  const [loaded, setLoaded] = useState(false);

  const { data: exam, isLoading } = useQuery({
    queryKey: ['exam', id],
    queryFn: () => api.get(`/api/exams/${id}`).then((r) => r.data),
  });

  useEffect(() => {
    if (exam && !loaded) {
      setForm({
        title: exam.title ?? '',
        description: exam.description ?? '',
        duration: exam.duration ?? 60,
        passingScore: exam.passingScore ?? 70,
        targetJenjang: exam.targetJenjang ?? '',
        targetKelas: exam.targetKelas ?? '',
        shuffleQuestions: exam.shuffleQuestions ?? false,
        shuffleOptions: exam.shuffleOptions ?? false,
        showResult: exam.showResult ?? false,
        requireSeb: exam.requireSeb ?? false,
      });
      if (exam.targetRombel) {
        setSelectedRombel(exam.targetRombel.split(',').map((s: string) => s.trim()).filter(Boolean));
      }
      setLoaded(true);
    }
  }, [exam, loaded]);

  const { data: existingRombel = [] } = useQuery<string[]>({
    queryKey: ['rombel-opts', form.targetJenjang, form.targetKelas],
    queryFn: async () => {
      const params: Record<string, string> = { role: 'STUDENT' };
      if (form.targetJenjang) params.jenjang = form.targetJenjang;
      if (form.targetKelas) params.kelas = form.targetKelas;
      const { data } = await api.get('/api/users', { params });
      return [...new Set<string>((data as any[]).map((u: any) => u.rombel).filter(Boolean))].sort();
    },
    enabled: !!form.targetJenjang,
  });

  function toggleRombel(r: string) {
    setSelectedRombel((prev) => prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]);
  }

  function buildTargetRombel(): string | null {
    const fromCustom = customRombel.split(',').map((s) => s.trim()).filter(Boolean);
    const all = [...new Set([...selectedRombel, ...fromCustom])];
    return all.length > 0 ? all.join(',') : null;
  }

  const mutation = useMutation({
    mutationFn: () => api.patch(`/api/exams/${id}`, {
      ...form,
      targetJenjang: form.targetJenjang || null,
      targetKelas: form.targetKelas || null,
      targetRombel: buildTargetRombel(),
    }),
    onSuccess: () => {
      toast('Ujian berhasil diperbarui');
      router.push(`/dashboard/exams/${id}`);
    },
    onError: () => toast('Gagal menyimpan perubahan', 'error'),
  });

  function toggle(key: string) {
    setForm((f) => ({ ...f, [key]: !f[key as keyof typeof f] }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="flex items-center gap-3 mb-8">
        <Link href={`/dashboard/exams/${id}`} className="text-gray-400 hover:text-gray-600">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Edit Ujian</h1>
          <p className="text-sm text-gray-500">{exam?.title}</p>
        </div>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">
            <div className="bg-white rounded-xl border border-blue-100 p-6 space-y-5">
              <h2 className="font-semibold text-gray-900">Informasi Ujian</h2>
              <Input
                label="Judul Ujian"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
              <Textarea
                label="Deskripsi (opsional)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />

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
              </div>

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
                            <span className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${checked ? 'bg-white border-white' : 'border-gray-300'}`}>
                              {checked && <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>}
                            </span>
                            {r}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 mb-2">Belum ada data rombel untuk kelas ini.</p>
                  )}
                  <input
                    type="text"
                    value={customRombel}
                    onChange={(e) => setCustomRombel(e.target.value)}
                    placeholder="Tambah rombel lain (pisah koma)..."
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
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${
                        form[opt.key as keyof typeof form] ? 'translate-x-5' : 'translate-x-1'
                      }`} />
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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Simpan Perubahan
              </Button>
              <Link href={`/dashboard/exams/${id}`}>
                <Button type="button" variant="outline" className="w-full justify-center">Batal</Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
