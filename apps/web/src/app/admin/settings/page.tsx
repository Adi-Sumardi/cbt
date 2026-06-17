'use client';

import { useState, useEffect } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useToast } from '@/components/ui/Toast';
import { toast } from 'gooey-toast';
import { getServerUrl, setServerUrl, getDomainUrl, setDomainUrl as saveDomainUrl } from '@/lib/serverUrl';

async function handleBackup() {
  try {
    toast.info({ title: 'Membuat backup...', description: 'Harap tunggu sebentar.' });
    const res = await (await import('@/lib/api')).default.get('/api/admin/backup', { responseType: 'blob' });
    const url = URL.createObjectURL(new Blob([res.data]));
    const a = document.createElement('a');
    a.href = url;
    a.download = `backup_cbt_${new Date().toISOString().slice(0, 10)}.sql`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success({ title: 'Backup berhasil', description: 'File SQL tersimpan di folder unduhan.' });
  } catch {
    toast.error({ title: 'Backup gagal', description: 'Pastikan pg_dump tersedia di server.' });
  }
}

export default function AdminSettingsPage() {
  const { toast: showToast } = useToast();

  const [school, setSchool] = useState({
    name: 'SMA Negeri 1 Contoh',
    address: 'Jl. Pendidikan No. 1',
    principalName: '',
    academicYear: '2025/2026',
  });

  const [seb, setSeb] = useState({ enableSeb: false, sebDownloadUrl: '' });

  const [serverUrl, setServerUrlState] = useState('');
  const [domainUrl, setDomainUrl] = useState('');
  const [urlSaved, setUrlSaved] = useState(false);

  // Load DB settings
  const { data: dbSettings } = useQuery({
    queryKey: ['app-settings'],
    queryFn: () => api.get('/api/admin/settings').then((r) => r.data as Record<string, string>),
  });

  useEffect(() => {
    if (dbSettings) {
      if (dbSettings.schoolName) setSchool((s) => ({ ...s, name: dbSettings.schoolName }));
      if (dbSettings.schoolAddress) setSchool((s) => ({ ...s, address: dbSettings.schoolAddress }));
      if (dbSettings.principalName) setSchool((s) => ({ ...s, principalName: dbSettings.principalName }));
      if (dbSettings.academicYear) setSchool((s) => ({ ...s, academicYear: dbSettings.academicYear }));
      if (dbSettings.serverUrl) {
        setServerUrlState(dbSettings.serverUrl);
        setServerUrl(dbSettings.serverUrl);
      }
      if (dbSettings.domainUrl) { setDomainUrl(dbSettings.domainUrl); saveDomainUrl(dbSettings.domainUrl); }
    }
  }, [dbSettings]);

  useEffect(() => {
    const stored = getServerUrl();
    if (stored && !serverUrl) setServerUrlState(stored);
    const storedDomain = getDomainUrl();
    if (storedDomain && !domainUrl) setDomainUrl(storedDomain);
  }, []);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.patch('/api/admin/settings', {
        schoolName: school.name,
        schoolAddress: school.address,
        principalName: school.principalName,
        academicYear: school.academicYear,
        serverUrl: serverUrl.replace(/\/+$/, ''),
      }),
    onSuccess: () => {
      setServerUrl(serverUrl.replace(/\/+$/, ''));
      showToast('Pengaturan berhasil disimpan');
    },
    onError: () => showToast('Gagal menyimpan pengaturan', 'error'),
  });

  function handleSaveUrl() {
    const normalized = serverUrl.replace(/\/+$/, '');
    const normalizedDomain = domainUrl.replace(/\/+$/, '');
    setServerUrl(normalized);
    setServerUrlState(normalized);
    saveDomainUrl(normalizedDomain);
    api.patch('/api/admin/settings', { serverUrl: normalized, domainUrl: normalizedDomain })
      .then(() => { setUrlSaved(true); setTimeout(() => setUrlSaved(false), 2000); })
      .catch(() => showToast('Gagal menyimpan URL', 'error'));
  }

  function autoDetect() {
    setServerUrlState(window.location.origin);
  }

  return (
    <div className="p-4 sm:p-8">
      <div className="mb-8">
        <h1 className="text-xl font-bold text-gray-900">Pengaturan Sistem</h1>
        <p className="text-sm text-gray-500 mt-0.5">Konfigurasi identitas sekolah dan sistem CBT</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Jaringan & Akses ── */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-blue-100 p-6">
          <div className="flex items-center gap-2 mb-1">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <h2 className="font-semibold text-gray-900">Jaringan & Akses Server</h2>
          </div>
          <p className="text-sm text-gray-500 mb-5">
            URL ini digunakan untuk membagikan tautan ujian ke siswa dan menghubungkan WebSocket.
            Isi dengan IP lokal jaringan sekolah atau domain publik server.
          </p>

          <div className="space-y-4">
            {/* IP / URL utama */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                URL / IP Server <span className="text-red-400">*</span>
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={serverUrl}
                  onChange={(e) => setServerUrlState(e.target.value)}
                  placeholder="http://192.168.1.100"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
                <Button type="button" variant="outline" size="sm" onClick={autoDetect}>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
                  </svg>
                  Auto-detect
                </Button>
              </div>
              {serverUrl && (
                <p className="text-xs text-gray-400 mt-1.5 font-mono truncate">
                  Login siswa via IP: <span className="text-blue-600">{serverUrl}/auth/login</span>
                </p>
              )}
            </div>

            {/* Domain opsional */}
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">
                Nama Domain <span className="text-gray-400 font-normal">(opsional)</span>
              </label>
              <input
                type="url"
                value={domainUrl}
                onChange={(e) => setDomainUrl(e.target.value)}
                placeholder="https://cbt.sekolahku.id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
              />
              {domainUrl && (
                <p className="text-xs text-gray-400 mt-1.5 font-mono truncate">
                  Login siswa via domain: <span className="text-purple-600">{domainUrl}/auth/login</span>
                </p>
              )}
              <p className="text-xs text-gray-400 mt-1">
                Jika diisi, URL domain akan ditampilkan berdampingan dengan URL IP di halaman kelola ujian.
              </p>
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveUrl}
                disabled={!serverUrl}
                className={urlSaved ? 'bg-green-600 hover:bg-green-600' : ''}
              >
                {urlSaved ? (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Tersimpan
                  </>
                ) : 'Simpan Pengaturan Jaringan'}
              </Button>
            </div>
          </div>

          {/* Info cards */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              {
                icon: '🏫',
                title: 'Server Lokal LAN',
                desc: 'Jalankan di server sekolah. Semua perangkat harus terhubung ke WiFi/LAN yang sama.',
                example: 'http://192.168.1.5',
              },
              {
                icon: '☁️',
                title: 'Cloud / VPS',
                desc: 'Akses dari mana saja via internet. Gunakan domain atau IP publik VPS.',
                example: 'https://cbt.sekolahku.id',
              },
              {
                icon: '💻',
                title: 'Pengembangan Lokal',
                desc: 'Hanya bisa diakses dari komputer yang sama. Untuk testing.',
                example: 'http://localhost',
              },
            ].map((card) => (
              <div
                key={card.title}
                onClick={() => setServerUrlState(card.example)}
                className="cursor-pointer border border-gray-100 rounded-xl p-4 hover:border-blue-200 hover:bg-blue-50/40 transition-colors group"
              >
                <div className="text-2xl mb-2">{card.icon}</div>
                <p className="text-sm font-semibold text-gray-800 mb-1">{card.title}</p>
                <p className="text-xs text-gray-500 mb-2">{card.desc}</p>
                <code className="text-xs text-blue-600 font-mono bg-blue-50 px-2 py-0.5 rounded group-hover:bg-blue-100">
                  {card.example}
                </code>
              </div>
            ))}
          </div>
        </div>

        {/* Identitas sekolah */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-5">Identitas Sekolah</h2>
          <div className="space-y-4">
            <Input label="Nama Sekolah" value={school.name} onChange={(e) => setSchool({ ...school, name: e.target.value })} />
            <Input label="Alamat" value={school.address} onChange={(e) => setSchool({ ...school, address: e.target.value })} />
            <Input label="Nama Kepala Sekolah" value={school.principalName} onChange={(e) => setSchool({ ...school, principalName: e.target.value })} />
            <Input label="Tahun Pelajaran" value={school.academicYear} onChange={(e) => setSchool({ ...school, academicYear: e.target.value })} />
          </div>
        </div>

        {/* Safe Exam Browser */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Safe Exam Browser (SEB)</h2>
          <p className="text-sm text-gray-500 mb-5">
            SEB mengunci layar siswa saat ujian — tidak bisa buka tab, aplikasi, atau keluar browser.
          </p>
          <div className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <div
                onClick={() => setSeb({ ...seb, enableSeb: !seb.enableSeb })}
                className={`w-10 h-6 rounded-full relative transition-colors ${seb.enableSeb ? 'bg-blue-600' : 'bg-gray-200'}`}
              >
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${seb.enableSeb ? 'translate-x-5' : 'translate-x-1'}`} />
              </div>
              <span className="text-sm font-medium text-gray-700">Wajibkan SEB untuk semua ujian</span>
            </label>
            {seb.enableSeb && (
              <Input
                label="URL Download SEB (opsional)"
                value={seb.sebDownloadUrl}
                onChange={(e) => setSeb({ ...seb, sebDownloadUrl: e.target.value })}
                placeholder="https://safeexambrowser.org/download_en.html"
              />
            )}
          </div>
        </div>

        {/* Maintenance */}
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="font-semibold text-gray-900 mb-2">Maintenance</h2>
          <p className="text-sm text-gray-500 mb-5">Aksi yang berdampak ke seluruh sistem</p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={handleBackup}>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Backup Database
            </Button>
            <Button
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50"
              onClick={() => showToast('Hubungi developer untuk reset data', 'info')}
            >
              Reset Data Ujian
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6">
        <Button onClick={() => saveMutation.mutate()} loading={saveMutation.isPending} size="lg">
          Simpan Semua Pengaturan
        </Button>
      </div>
    </div>
  );
}
