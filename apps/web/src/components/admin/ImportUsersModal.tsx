'use client';

import { useRef, useState } from 'react';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { toast } from 'gooey-toast';

type Role = 'TEACHER' | 'STUDENT';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ImportUsersModal({ open, onClose, onSuccess }: Props) {
  const [role, setRole] = useState<Role>('STUDENT');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!open) return null;

  const handleClose = () => {
    setFile(null);
    setResult(null);
    setLoading(false);
    onClose();
  };

  const downloadTemplate = async () => {
    try {
      const { data } = await api.get(`/api/users/template?role=${role}`, { responseType: 'blob' });
      const url = URL.createObjectURL(new Blob([data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = role === 'TEACHER' ? 'template_guru.xlsx' : 'template_siswa.xlsx';
      a.click();
      URL.revokeObjectURL(url);
      toast.success({ title: 'Template diunduh', description: `Template ${role === 'TEACHER' ? 'guru' : 'siswa'} tersimpan.` });
    } catch {
      toast.error({ title: 'Gagal mengunduh template', description: 'Periksa koneksi dan coba lagi.' });
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    setResult(null);
    try {
      const form = new FormData();
      form.append('file', file);
      const { data } = await api.post(`/api/users/import?role=${role}`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.success > 0) {
        toast.success({ title: `${data.success} akun berhasil diimport`, description: data.failed > 0 ? `${data.failed} data gagal.` : 'Semua data berhasil.' });
        onSuccess();
      } else {
        toast.error({ title: 'Import gagal', description: 'Tidak ada data yang berhasil diimport.' });
      }
    } catch (e: any) {
      const msg = e?.response?.data?.message || 'Terjadi kesalahan';
      toast.error({ title: 'Import gagal', description: msg });
      setResult({ success: 0, failed: 1, errors: [msg] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={handleClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Import Pengguna</h2>
            <p className="text-xs text-gray-500 mt-0.5">Upload file Excel untuk import banyak akun sekaligus</p>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Role selector */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">Jenis Pengguna</label>
            <div className="flex gap-2">
              {(['STUDENT', 'TEACHER'] as Role[]).map((r) => (
                <button
                  key={r}
                  onClick={() => { setRole(r); setFile(null); setResult(null); }}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    role === r
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
                  }`}
                >
                  {r === 'STUDENT' ? '🎓 Siswa' : '👨‍🏫 Guru'}
                </button>
              ))}
            </div>
          </div>

          {/* Template download */}
          <div className="bg-blue-50 rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-blue-800">Download Template</p>
              <p className="text-xs text-blue-600 mt-0.5">
                {role === 'STUDENT'
                  ? 'Kolom: Nama, Email, NIS, Jenjang, Kelas, Rombel, Password'
                  : 'Kolom: Nama, Email, Password'}
              </p>
            </div>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-blue-200 rounded-lg text-sm text-blue-700 font-medium hover:bg-blue-50 transition-colors flex-shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </button>
          </div>

          {/* File upload */}
          <div>
            <label className="text-xs font-medium text-gray-700 mb-2 block">File Excel (.xlsx)</label>
            <div
              onClick={() => inputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file ? 'border-blue-400 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={(e) => { setFile(e.target.files?.[0] || null); setResult(null); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-8 h-8 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div className="text-left">
                    <p className="text-sm font-medium text-gray-800">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); setFile(null); setResult(null); }}
                    className="ml-2 text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 text-gray-300 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-gray-500">Klik untuk pilih file <span className="text-blue-600 font-medium">.xlsx</span></p>
                  <p className="text-xs text-gray-400 mt-1">Maksimal 5MB</p>
                </>
              )}
            </div>
          </div>

          {/* Result */}
          {result && (
            <div className={`rounded-xl p-4 ${result.failed === 0 ? 'bg-green-50' : result.success === 0 ? 'bg-red-50' : 'bg-yellow-50'}`}>
              <div className="flex items-center gap-4 mb-2">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">{result.success}</p>
                  <p className="text-xs text-gray-500">Berhasil</p>
                </div>
                <div className="w-px h-8 bg-gray-200" />
                <div className="text-center">
                  <p className="text-lg font-bold text-red-500">{result.failed}</p>
                  <p className="text-xs text-gray-500">Gagal</p>
                </div>
                <p className="text-sm text-gray-600 ml-2">
                  {result.failed === 0
                    ? 'Semua data berhasil diimport!'
                    : result.success === 0
                    ? 'Import gagal. Periksa format file.'
                    : 'Import selesai dengan beberapa error.'}
                </p>
              </div>
              {result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 max-h-24 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <li key={i} className="text-xs text-red-600 font-mono">• {err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>Tutup</Button>
          <Button onClick={handleImport} disabled={!file || loading}>
            {loading ? (
              <span className="flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Mengimport...
              </span>
            ) : 'Import Sekarang'}
          </Button>
        </div>
      </div>
    </div>
  );
}
