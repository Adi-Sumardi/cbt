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
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-lg animate-slide-down">
      <div className="bg-white rounded-full shadow-2xl border border-blue-100 overflow-hidden">
        {installed ? (
          <div className="flex items-center gap-2.5 px-4 py-2.5">
            <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-gray-800">Aplikasi berhasil dipasang!</p>
          </div>
        ) : isIos && !hasNativePrompt ? (
          /* iOS: compact text + close */
          <div className="flex items-center gap-2.5 px-3 py-2">
            <img src="/logo/logo.png" alt="CBT" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            <p className="text-xs text-gray-700 leading-tight flex-1 min-w-0">
              Pasang ke layar utama: ketuk <strong>Bagikan</strong> → <strong>Add to Home Screen</strong>
            </p>
            <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          /* Horizontal bar: logo + label + install + close */
          <div className="flex items-center gap-2 sm:gap-3 pl-3 pr-2 py-2">
            <img src="/logo/logo.png" alt="CBT" className="w-7 h-7 rounded-full object-cover flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-800 flex-1 min-w-0 truncate">
              Pasang Aplikasi CBT
            </span>
            <button
              onClick={handleInstall}
              disabled={installing}
              className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-70 text-white font-semibold text-xs sm:text-sm py-1.5 px-3.5 rounded-full transition-colors flex-shrink-0"
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
              {installing ? 'Memasang' : 'Pasang'}
            </button>
            <button onClick={dismiss} className="text-gray-400 hover:text-gray-600 p-1 flex-shrink-0">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
