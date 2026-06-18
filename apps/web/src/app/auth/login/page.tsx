'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { toast } from 'gooey-toast';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(
    searchParams.get('error') ? 'Sesi berakhir atau terjadi kesalahan. Silakan login kembali.' : ''
  );
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const result = await signIn('credentials', { email, password, redirect: false });
    if (result?.error) {
      setError('Email atau password salah. Periksa kembali dan coba lagi.');
      toast.error({ title: 'Login gagal', description: 'Email atau password salah.' });
      setLoading(false);
    } else {
      toast.success({ title: 'Login berhasil', description: 'Selamat datang!' });
      router.push('/dashboard');
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-blue-600 flex-col justify-between p-12">
        <div>
          <div className="flex items-center gap-3">
            <img src="/logo/logo.png" alt="CBT Logo" className="w-10 h-10 rounded-full object-cover ring-2 ring-white/30" />
            <span className="text-white font-bold text-xl tracking-wide">CBT Sekolah</span>
          </div>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-white text-4xl font-bold leading-tight">
              Ujian digital<br />lebih mudah &<br />terpercaya
            </h2>
            <p className="text-blue-200 mt-4 text-base leading-relaxed">
              Platform Computer Based Testing untuk guru dan siswa — akses soal, pantau ujian, dan lihat hasil secara real-time.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { icon: '✓', text: 'Import soal dari Word & Excel' },
              { icon: '✓', text: 'Pantau ujian siswa secara langsung' },
              { icon: '✓', text: 'Nilai otomatis & laporan lengkap' },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3">
                <span className="w-5 h-5 rounded-full bg-white/20 text-white text-xs flex items-center justify-center font-bold flex-shrink-0">
                  {item.icon}
                </span>
                <span className="text-blue-100 text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-xs">© 2026 CBT Sekolah. Hak cipta dilindungi.</p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <img src="/logo/logo.png" alt="CBT Logo" className="w-9 h-9 rounded-full object-cover" />
            <span className="text-gray-900 font-bold text-xl">CBT Sekolah</span>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 sm:p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-gray-900">Selamat datang</h1>
              <p className="text-gray-500 text-sm mt-1">Masuk ke akun Anda untuk melanjutkan</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Email */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="nama@sekolah.sch.id"
                    required
                    autoComplete="email"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="flex items-start gap-2.5 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                  <svg className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Memproses...
                  </>
                ) : (
                  'Masuk'
                )}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6 pt-6 border-t border-gray-100">
              <p className="text-xs text-gray-400 text-center mb-3">Akun demo tersedia</p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Admin', email: 'admin@cbt.local', color: 'blue' },
                  { label: 'Guru', email: 'guru@cbt.local', color: 'blue' },
                ].map((acc) => (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => { setEmail(acc.email); setPassword(acc.label === 'Admin' ? 'admin123' : acc.label === 'Guru' ? 'guru123' : 'siswa123'); }}
                    className="flex flex-col items-center gap-1 p-2 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition text-center"
                  >
                    <span className="text-xs font-medium text-gray-700">{acc.label}</span>
                    <span className="text-[10px] text-gray-400 truncate w-full text-center">{acc.email}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Credit pembuat */}
            <p className="mt-6 text-center text-[11px] text-gray-400">
              © {new Date().getFullYear()}{' '}
              <a href="https://adilabs.id" target="_blank" rel="noopener noreferrer" className="font-medium text-gray-500 hover:text-blue-600">
                adilabs.id
              </a>
              {' '}· Seluruh hak dilindungi
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
