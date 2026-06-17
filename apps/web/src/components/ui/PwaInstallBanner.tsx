'use client';

import { useEffect, useState } from 'react';

const DISMISSED_KEY = 'cbt_pwa_install_dismissed';

export function PwaInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Already installed as PWA — don't show
    if (window.matchMedia('(display-mode: standalone)').matches) return;
    // User already dismissed before
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler as any);

    // iOS Safari doesn't fire beforeinstallprompt — show manual guide instead
    const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    if (isIos && isSafari && !localStorage.getItem(DISMISSED_KEY)) {
      setVisible(true);
    }

    window.addEventListener('appinstalled', () => {
      setInstalled(true);
      setTimeout(() => setVisible(false), 2500);
    });

    return () => window.removeEventListener('beforeinstallprompt', handler as any);
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISSED_KEY, '1');
    setVisible(false);
  }

  async function handleInstall() {
    if (!deferredPrompt) return;
    setInstalling(true);
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setInstalling(false);
    setDeferredPrompt(null);
    if (outcome === 'accepted') {
      setInstalled(true);
      setTimeout(() => setVisible(false), 2500);
    }
  }

  if (!visible) return null;

  const isIos = typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const hasNativePrompt = !!deferredPrompt;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4 animate-slide-up">
      <div className="bg-white rounded-2xl shadow-2xl border border-blue-100 overflow-hidden">
        {installed ? (
          <div className="flex items-center gap-3 px-5 py-4">
            <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Aplikasi berhasil dipasang!</p>
          </div>
        ) : (
          <>
            {/* Header strip */}
            <div className="bg-blue-600 px-5 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <img src="/logo/logo.png" alt="CBT" className="w-7 h-7 rounded-full object-cover" />
                <span className="text-white font-bold text-sm">Pasang Aplikasi CBT</span>
              </div>
              <button onClick={dismiss} className="text-white/70 hover:text-white p-0.5">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-gray-600 mb-4">
                Pasang aplikasi di perangkat untuk akses cepat, tampilan layar penuh, dan bisa digunakan saat offline.
              </p>

              {/* Feature pills */}
              <div className="flex flex-wrap gap-2 mb-4">
                {['Akses cepat', 'Layar penuh', 'Offline mode'].map((f) => (
                  <span key={f} className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">{f}</span>
                ))}
              </div>

              {hasNativePrompt ? (
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold text-sm py-2.5 rounded-xl transition-colors"
                >
                  {installing ? (
                    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                    </svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  )}
                  {installing ? 'Memasang...' : 'Pasang Sekarang'}
                </button>
              ) : isIos ? (
                /* iOS manual guide */
                <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Cara pasang di iPhone/iPad:</p>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">1</span>
                    Ketuk ikon
                    <svg className="w-4 h-4 text-blue-600 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                    </svg>
                    di Safari
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">2</span>
                    Pilih <strong className="mx-1">Add to Home Screen</strong>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold flex-shrink-0 text-[10px]">3</span>
                    Ketuk <strong className="ml-1">Add</strong>
                  </div>
                </div>
              ) : null}

              <button onClick={dismiss} className="w-full mt-2 text-xs text-gray-400 hover:text-gray-600 py-1.5">
                Nanti saja
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
