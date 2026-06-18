'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from 'next-auth/react';
import api from '@/lib/api';
import { useExamStore } from '@/store/examStore';
import { useExamSocket } from '@/hooks/useExamSocket';
import { ConfirmModal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// Shuffle an array (Fisher-Yates) — stable per question id seed
function shuffleArray<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  // Simple deterministic shuffle based on seed hash
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  for (let i = copy.length - 1; i > 0; i--) {
    h = (Math.imul(h, 1664525) + 1013904223) | 0;
    const j = Math.abs(h) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// ── Penalty helpers ──────────────────────────────────────────────────────────
function getPenaltySeconds(count: number): number {
  if (count <= 3) return 0;
  if (count <= 5) return 60;
  if (count <= 7) return 120;
  return 300;
}

function getNextPenaltySeconds(count: number): number {
  return getPenaltySeconds(count + 1);
}

function penaltyLabel(n: number): string {
  return ['Pertama', 'Kedua', 'Ketiga', 'Keempat', 'Kelima', 'Keenam', 'Ketujuh', 'Kedelapan'][n - 1] ?? `ke-${n}`;
}

// ── Penalty Overlay ───────────────────────────────────────────────────────────
interface PenaltyOverlayProps {
  open: boolean;
  onClose: () => void;
  count: number;
  penaltySeconds: number;
  autoSubmit: boolean;
}

function PenaltyOverlay({ open, onClose, count, penaltySeconds, autoSubmit }: PenaltyOverlayProps) {
  const [countdown, setCountdown] = useState(penaltySeconds);

  useEffect(() => {
    if (open) setCountdown(penaltySeconds);
  }, [open, penaltySeconds]);

  useEffect(() => {
    if (!open || countdown <= 0) return;
    const t = setInterval(() => setCountdown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(t);
  }, [open, countdown]);

  if (!open) return null;

  const isPhase1 = count <= 3;           // warning only
  const penaltyNumber = count - 3;       // 1-based penalty index (starts at violation 4)
  const nextPenalty = getNextPenaltySeconds(count);
  const canDismiss = countdown <= 0;

  // Warning messages for Phase 1
  const warningMsg =
    count === 1 ? 'Peringatan Pertama! Anda keluar dari halaman ujian.'
    : count === 2 ? 'Peringatan Kedua! Anda keluar dari halaman ujian.'
    : 'Peringatan Ketiga! Pelanggaran berikutnya akan dikenakan penalti 60 detik.';

  const bg = isPhase1 ? 'bg-yellow-900/95' : 'bg-red-950/98';

  return (
    <div className={`fixed inset-0 z-[100] flex items-center justify-center ${bg} backdrop-blur-sm`}>
      <div className="w-full max-w-lg mx-4 text-center select-none">

        {/* Icon */}
        <div className={`w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center ${isPhase1 ? 'bg-yellow-400/20 ring-4 ring-yellow-400/40' : 'bg-red-500/20 ring-4 ring-red-500/40'}`}>
          {isPhase1 ? (
            <svg className="w-10 h-10 text-yellow-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 18.333 3.53 20 5.07 20z" />
            </svg>
          ) : (
            <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
        </div>

        {/* Title */}
        {autoSubmit ? (
          <h2 className="text-2xl font-bold text-white mb-2">Ujian Dikumpulkan Paksa</h2>
        ) : isPhase1 ? (
          <h2 className="text-2xl font-bold text-yellow-300 mb-2">⚠ Peringatan {penaltyLabel(count)}</h2>
        ) : (
          <h2 className="text-2xl font-bold text-red-300 mb-2">⛔ Penalti {penaltyLabel(penaltyNumber)}</h2>
        )}

        {/* Message */}
        <p className={`text-base mb-6 ${isPhase1 ? 'text-yellow-100' : 'text-red-100'}`}>
          {autoSubmit
            ? 'Terlalu banyak pelanggaran. Ujian dikumpulkan secara otomatis.'
            : isPhase1
            ? warningMsg
            : `Anda dikenakan penalti ${penaltySeconds} detik. Ujian tidak dapat dilanjutkan hingga waktu penalti habis.`}
        </p>

        {/* Countdown ring (phase 2 only) */}
        {!isPhase1 && !autoSubmit && (
          <div className="mb-6">
            <div className="relative w-32 h-32 mx-auto">
              <svg className="w-32 h-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="54" fill="none" stroke="#ffffff10" strokeWidth="8" />
                <circle
                  cx="60" cy="60" r="54" fill="none"
                  stroke={countdown > 30 ? '#f87171' : countdown > 10 ? '#fb923c' : '#facc15'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${2 * Math.PI * 54}`}
                  strokeDashoffset={`${2 * Math.PI * 54 * (1 - countdown / penaltySeconds)}`}
                  style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s' }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-4xl font-bold text-white tabular-nums">{countdown}</span>
                <span className="text-xs text-white/60 mt-0.5">detik</span>
              </div>
            </div>
          </div>
        )}

        {/* Info cards */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{count}</p>
            <p className="text-xs text-white/60 mt-0.5">Total<br/>Pelanggaran</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{isPhase1 ? '0' : `${penaltySeconds}s`}</p>
            <p className="text-xs text-white/60 mt-0.5">Penalti<br/>Saat Ini</p>
          </div>
          <div className="bg-white/10 rounded-xl p-3">
            <p className="text-2xl font-bold text-white">{nextPenalty > 0 ? `${nextPenalty}s` : '—'}</p>
            <p className="text-xs text-white/60 mt-0.5">Penalti<br/>Berikutnya</p>
          </div>
        </div>

        {/* Blocked actions notice */}
        <div className="bg-white/5 rounded-xl p-4 mb-6 text-left space-y-1.5">
          <p className="text-xs font-semibold text-white/50 uppercase tracking-wide mb-2">Larangan selama ujian</p>
          {['Membuka tab baru', 'Alt+Tab / pindah aplikasi', 'Klik kanan (di luar kolom teks)', 'Split screen / jendela diperkecil', 'Minimize browser'].map((r) => (
            <div key={r} className="flex items-center gap-2 text-xs text-white/70">
              <span className="text-red-400">✕</span> {r}
            </div>
          ))}
        </div>

        {/* Dismiss button */}
        {!autoSubmit && (
          <button
            onClick={onClose}
            disabled={!canDismiss}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              canDismiss
                ? isPhase1
                  ? 'bg-yellow-400 text-yellow-900 hover:bg-yellow-300'
                  : 'bg-red-500 text-white hover:bg-red-400'
                : 'bg-white/10 text-white/30 cursor-not-allowed'
            }`}
          >
            {canDismiss ? 'Mengerti, Lanjut Ujian' : `Tunggu ${countdown} detik...`}
          </button>
        )}
      </div>
    </div>
  );
}

// ---- SEB Block Page ----
function SebBlockPage({ code }: { code?: string }) {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const configUrl = code ? `${origin}/api/seb/config?code=${code}` : '';
  // sebs:// (https) atau seb:// (http) → memaksa SEB membuka config langsung
  const sebLaunchUrl = configUrl
    ? configUrl.replace(/^https/, 'sebs').replace(/^http:/, 'seb:')
    : '';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900 overflow-auto py-8">
      <div className="text-center text-white max-w-md mx-4">
        <div className="w-20 h-20 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">Ujian Aman (SEB)</h1>
        <p className="text-sm text-gray-300 mb-6">
          Ujian ini wajib dikerjakan dengan <strong>Safe Exam Browser</strong> agar terkunci penuh
          (tanpa aplikasi lain, copy-paste, atau pindah jendela).
        </p>

        {code && (
          <a
            href={sebLaunchUrl}
            className="block w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
          >
            🔒 Buka Ujian di Safe Exam Browser
          </a>
        )}
        {code && (
          <a
            href={configUrl}
            className="block w-full mb-5 bg-white/10 hover:bg-white/20 text-white px-6 py-2.5 rounded-xl text-sm transition-colors"
          >
            Unduh file konfigurasi (.seb)
          </a>
        )}

        <div className="text-left bg-white/5 rounded-xl p-4 text-xs text-gray-300 space-y-2">
          <p className="font-semibold text-gray-200">Cara mengerjakan:</p>
          <p>1. Install Safe Exam Browser dulu (sekali saja) —
            <a href="https://safeexambrowser.org/download_en.html" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline ml-1">unduh di sini</a>
          </p>
          <p>2. Klik tombol <strong>“Buka Ujian di Safe Exam Browser”</strong> di atas</p>
          <p>3. SEB akan terbuka otomatis & mengunci perangkat selama ujian</p>
          <p>4. Login dengan akun siswa kamu, lalu kerjakan ujian</p>
        </div>
      </div>
    </div>
  );
}

// ---- Fullscreen Gate ----
function FullscreenGate({ onEnter, reEntry }: { onEnter: () => void; reEntry: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gradient-to-br from-blue-700 to-blue-900 px-4">
      <div className="text-center text-white max-w-md">
        <div className="w-20 h-20 bg-white/15 rounded-2xl flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold mb-3">
          {reEntry ? 'Kembali ke Mode Ujian' : 'Mode Ujian Layar Penuh'}
        </h1>
        <p className="text-sm text-blue-100 mb-8">
          {reEntry
            ? 'Kamu keluar dari layar penuh — itu tercatat sebagai pelanggaran. Tekan tombol di bawah untuk melanjutkan ujian.'
            : 'Ujian berjalan dalam mode layar penuh terkunci untuk menjaga kejujuran. Jangan keluar dari layar penuh, berpindah tab, atau membuka aplikasi lain selama ujian.'}
        </p>
        <button
          onClick={onEnter}
          className="inline-flex items-center gap-2 bg-white text-blue-700 hover:bg-blue-50 px-8 py-3.5 rounded-xl font-bold text-lg transition-colors shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
          {reEntry ? 'Lanjutkan Ujian' : 'Mulai & Masuk Layar Penuh'}
        </button>
      </div>
    </div>
  );
}

export default function ExamPage() {
  const queryClient = useQueryClient();
  const [navOpen, setNavOpen] = useState(false);
  const { sessionId } = useParams<{ sessionId: string }>();
  const router = useRouter();
  const { data: authSession } = useSession();
  const { toast } = useToast();
  
  const loadedRef = useRef(false);

  useEffect(() => {
    document.body.classList.add('exam-mode');
    return () => {
      document.body.classList.remove('exam-mode');
    };
  }, []);

  const { data: me } = useQuery({
    queryKey: ['me'],
    queryFn: () => api.get('/api/users/me').then((r) => r.data),
    enabled: !!authSession,
  });

  const {
    currentQuestionIndex,
    setCurrentQuestion,
    answers,
    setAnswer,
    toggleDoubtful,
    lastSaved,
    isConnected,
    setSessionId,
    loadSavedAnswers,
  } = useExamStore();

  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [nullifiedQuestions, setNullifiedQuestions] = useState<Set<string>>(new Set());
  const autoSaveRef = useRef<NodeJS.Timeout>();
  const handleSubmitRef = useRef<() => void>(() => {});

  // Violation state
  const [violationCount, setViolationCount] = useState(0);
  const [showPenaltyOverlay, setShowPenaltyOverlay] = useState(false);
  const [currentPenaltySeconds, setCurrentPenaltySeconds] = useState(0);
  const [forceSubmitted, setForceSubmitted] = useState(false);
  const violationLockRef = useRef(false);

  // SEB check — will be set after data loads
  const [sebBlocked, setSebBlocked] = useState(false);

  // Fullscreen lockdown (selalu aktif, tanpa install)
  const [isFullscreen, setIsFullscreen] = useState(false);
  const isSebClient = typeof navigator !== 'undefined' && navigator.userAgent.includes('SEB');

  const enterFullscreen = useCallback(() => {
    const el = document.documentElement as any;
    const req = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
    if (req) {
      Promise.resolve(req.call(el)).catch(() => {});
    } else {
      // Browser tanpa Fullscreen API (mis. iOS Safari) — anggap sudah "fullscreen"
      setIsFullscreen(true);
    }
  }, []);

  // Load session + exam
  const { data, isLoading } = useQuery({
    queryKey: ['exam-session', sessionId],
    queryFn: () => api.post(`/api/sessions/exam-session/${sessionId}/resume`).then((r) => r.data),
    retry: false,
  });

  // Timer dari server
  const { data: timerData } = useQuery({
    queryKey: ['timer', sessionId],
    queryFn: () => api.get(`/api/sessions/${sessionId}/timer`).then((r) => r.data),
    refetchInterval: 30000,
    enabled: !!sessionId,
  });

  useEffect(() => {
    if (data && !data.sebRequired) {
      setSessionId(sessionId);
      if (data.savedAnswers && !loadedRef.current) {
        loadSavedAnswers(data.savedAnswers);
        loadedRef.current = true;
      }
      // Restore violation state from session
      if (data.session?.violationCount) setViolationCount(data.session.violationCount);
    }
  }, [data]);

  useEffect(() => {
    if (timerData !== undefined) setTimeLeft(timerData);
  }, [timerData]);

  // Countdown
  useEffect(() => {
    if (timeLeft === null) return;
    const interval = setInterval(() => {
      setTimeLeft((t) => {
        if (t === null || t <= 0) {
          clearInterval(interval);
          handleSubmitRef.current();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [timeLeft === null]);

  const submitMutation = useMutation({
    mutationFn: () => api.post(`/api/sessions/${sessionId}/submit`),
    onSuccess: () => {
      router.push(`/exam/${sessionId}/result`);
    },
    onError: () => toast('Gagal submit. Coba lagi.', 'error'),
  });

  const violationMutation = useMutation({
    mutationFn: (payload: { type: string; detail?: string }) =>
      api.post(`/api/sessions/${sessionId}/violation`, payload).then((r) => r.data),
    onSuccess: (res: any) => {
      const count = res.violationCount;
      setViolationCount(count);
      setCurrentPenaltySeconds(getPenaltySeconds(count));
      setShowPenaltyOverlay(true);
      if (res.autoSubmit && !forceSubmitted) {
        setForceSubmitted(true);
        setTimeout(() => submitMutation.mutate(), 3000);
      }
    },
  });

  // Violation detection
  const reportViolation = useCallback(
    (type: string, detail?: string) => {
      if (violationLockRef.current) return;
      violationLockRef.current = true;
      violationMutation.mutate({ type, detail });
      setTimeout(() => { violationLockRef.current = false; }, 2000);
    },
    [violationMutation],
  );

  useEffect(() => {
    if (sebBlocked || !data || data.sebRequired) return;
    // Jangan catat pelanggaran selama gate fullscreen masih tampil (belum benar-benar mulai)
    if (!isSebClient && !isFullscreen) return;

    const handleVisibility = () => {
      if (document.hidden) reportViolation('TAB_SWITCH', 'Tab/window tersembunyi');
    };
    const handleBlur = () => {
      const isIOS = typeof navigator !== 'undefined' && 
        (/iPad|iPhone|iPod/.test(navigator.userAgent) || 
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));

      // Abaikan window blur jika input sedang terfokus pada perangkat iOS/iPad
      if (isIOS && document.activeElement && 
          (document.activeElement.tagName === 'INPUT' || 
           document.activeElement.tagName === 'TEXTAREA' || 
           document.activeElement.tagName === 'SELECT')) {
        return;
      }
      reportViolation('WINDOW_BLUR', 'Fokus berpindah dari jendela ujian');
    };
    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const isTextInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable;
      if (!isTextInput) e.preventDefault();
      const isIOS = typeof navigator !== 'undefined' &&
        (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
         (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1));
      if (!isIOS && !isTextInput) {
        reportViolation('RIGHT_CLICK', 'Klik kanan dilarang selama ujian');
      }
    };

    const handleResize = () => {
      // Deteksi split screen / jendela diperkecil
      const minW = 600;
      const minH = 400;
      if (window.innerWidth < minW || window.innerHeight < minH) {
        reportViolation('SPLIT_SCREEN', `Ukuran layar terlalu kecil: ${window.innerWidth}x${window.innerHeight}`);
      }
    };
    const handleCopy = () => reportViolation('COPY_ATTEMPT', 'Percobaan menyalin teks');
    const handleKeydown = (e: KeyboardEvent) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && e.key === 'I') ||
        (e.ctrlKey && e.key === 'u') ||
        (e.ctrlKey && e.key === 'U') ||
        (e.ctrlKey && e.key === 's') ||
        (e.ctrlKey && e.key === 'S')
      ) {
        e.preventDefault();
        reportViolation('KEYBOARD_SHORTCUT', `Shortcut diblokir: ${e.key}`);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeydown);
    window.addEventListener('resize', handleResize);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeydown);
      window.removeEventListener('resize', handleResize);
    };
  }, [sebBlocked, data, reportViolation, isFullscreen, isSebClient]);

  // Deteksi keluar fullscreen → pelanggaran + minta kembali fullscreen
  useEffect(() => {
    if (sebBlocked || !data || data.sebRequired || isSebClient) return;

    const onFsChange = () => {
      const fs = !!(document.fullscreenElement || (document as any).webkitFullscreenElement);
      setIsFullscreen(fs);
      if (!fs) reportViolation('FULLSCREEN_EXIT', 'Keluar dari mode layar penuh');
    };
    document.addEventListener('fullscreenchange', onFsChange);
    document.addEventListener('webkitfullscreenchange', onFsChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFsChange);
      document.removeEventListener('webkitfullscreenchange', onFsChange);
    };
  }, [sebBlocked, data, isSebClient, reportViolation]);

  const [broadcastMessage, setBroadcastMessage] = useState<string | null>(null);

  const { saveAnswer } = useExamSocket({
    sessionId,
    examId: data?.exam?.id ?? '',
    role: 'student',
    onQuestionUpdated: (question) => {
      queryClient.invalidateQueries({ queryKey: ['exam-session', sessionId] });
      toast(`Soal ${question.order} diperbaiki oleh guru`, 'info');
    },
    onQuestionNullified: (questionId) => {
      queryClient.invalidateQueries({ queryKey: ['exam-session', sessionId] });
      setNullifiedQuestions((prev) => new Set(Array.from(prev).concat(questionId)));
      toast('Soal dianulir oleh guru — kamu mendapat poin penuh', 'info');
    },
    onTimerWarning: (remaining) => {
      if (remaining <= 300) toast(`Sisa waktu: ${formatTime(remaining)}`, 'info');
    },
    onAnnouncementReceived: (msg) => {
      setBroadcastMessage(msg);
      toast('Pengumuman baru diterima dari pengawas', 'info');
    },
    onViolationPardoned: () => {
      setViolationCount(0);
      setShowPenaltyOverlay(false);
      setCurrentPenaltySeconds(0);
      toast('Pelanggaran kamu telah dihapus/diputihkan oleh pengawas', 'info');
    },
  });

  // Autosave setiap 5 detik
  const doAutoSave = useCallback(() => {
    const questionsArr: any[] = data?.exam?.questions ?? [];
    const currentQ = questionsArr[currentQuestionIndex];
    if (!currentQ) return;
    const ans = answers[currentQ.id];
    if (ans?.answer) {
      saveAnswer(currentQ.id, ans.answer, ans.isDoubtful ?? false);
    }
  }, [data, answers, currentQuestionIndex, saveAnswer]);

  useEffect(() => {
    clearTimeout(autoSaveRef.current);
    autoSaveRef.current = setTimeout(doAutoSave, 5000);
    return () => clearTimeout(autoSaveRef.current);
  }, [answers]);

  function handleAnswerSelect(questionId: string, value: string) {
    setAnswer(questionId, value);
    saveAnswer(questionId, value, answers[questionId]?.isDoubtful ?? false);
  }

  // MULTIPLE_ANSWER toggle helper
  function handleMultipleAnswerToggle(questionId: string, optionId: string) {
    const current = answers[questionId]?.answer ?? '';
    const selected = current ? current.split(',').filter(Boolean) : [];
    const idx = selected.indexOf(optionId);
    const updated = idx >= 0 ? selected.filter((id) => id !== optionId) : [...selected, optionId];
    handleAnswerSelect(questionId, updated.join(','));
  }

  // FILL_BLANK update a single blank
  function handleFillBlankChange(questionId: string, blankLabel: string, value: string) {
    let current: Record<string, string> = {};
    try { current = JSON.parse(answers[questionId]?.answer ?? '{}'); } catch {}
    current[blankLabel] = value;
    handleAnswerSelect(questionId, JSON.stringify(current));
  }

  // MATCHING update a single pair
  function handleMatchingChange(questionId: string, optionId: string, selectedRight: string) {
    let current: Record<string, string> = {};
    try { current = JSON.parse(answers[questionId]?.answer ?? '{}'); } catch {}
    current[optionId] = selectedRight;
    handleAnswerSelect(questionId, JSON.stringify(current));
  }

  function handleSubmit() {
    setShowSubmitConfirm(false);
    submitMutation.mutate();
  }

  useEffect(() => {
    handleSubmitRef.current = handleSubmit;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Memuat ujian...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  if (data.sebRequired || sebBlocked) return <SebBlockPage code={data.accessCode} />;

  // Gate fullscreen — wajib masuk layar penuh sebelum & selama ujian (kecuali di SEB)
  if (!isSebClient && !isFullscreen) {
    return <FullscreenGate onEnter={enterFullscreen} reEntry={violationCount > 0} />;
  }

  const { exam } = data;
  const studentId = data.session?.studentId ?? me?.id ?? 'anon';

  // Urutan soal & opsi sudah diacak & dikunci oleh server (questionOrder + seededShuffle).
  // Frontend cukup memakai urutan apa adanya — TIDAK mengacak ulang (hindari double-shuffle).
  const questions: any[] = exam.questions ?? [];

  function getOptions(q: any): any[] {
    return q.options ?? [];
  }

  // Label opsi mengikuti POSISI tampil (A, B, C, …) — bukan label asli DB.
  // Jawaban tetap disimpan via opt.id sehingga penilaian tidak terpengaruh.
  const posLabel = (i: number) => String.fromCharCode(65 + i);

  const currentQ = questions[currentQuestionIndex];
  const currentAnswer = currentQ ? answers[currentQ.id] : null;
  const isCurrentNullified = currentQ ? nullifiedQuestions.has(currentQ.id) || currentQ.isNullified : false;

  const answeredCount = questions.filter((q) => answers[q.id]?.answer).length;
  const doubtfulCount = questions.filter((q) => answers[q.id]?.isDoubtful).length;
  const unansweredCount = questions.length - answeredCount;
  const isLowTime = timeLeft !== null && timeLeft <= 300;

  // For MATCHING: shuffled right items per question (stable per question.id)
  function getShuffledRightItems(q: any): string[] {
    const rights = q.options.map((o: any) => (o.content.split('|||')[1] ?? '').trim());
    return shuffleArray(rights, q.id);
  }

  // Parse FILL_BLANK answer
  function getFillBlankAnswers(questionId: string): Record<string, string> {
    try { return JSON.parse(answers[questionId]?.answer ?? '{}'); } catch { return {}; }
  }

  // Parse MATCHING answer
  function getMatchingAnswers(questionId: string): Record<string, string> {
    try { return JSON.parse(answers[questionId]?.answer ?? '{}'); } catch { return {}; }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top bar */}
      <header className="bg-white border-b border-blue-100 px-3 sm:px-6 py-2 sm:py-3 sticky top-0 z-10">
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm text-gray-900 truncate">{exam.title}</p>
            <div className="flex items-center gap-2 sm:gap-3 mt-0.5">
              <span className={`flex items-center gap-1 text-xs ${isConnected ? 'text-blue-500' : 'text-gray-400'}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'}`} />
                <span className="hidden sm:inline">{isConnected ? 'Terhubung' : 'Terputus'}</span>
              </span>
              {lastSaved && (
                <span className="text-xs text-green-600 bg-green-50 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-medium border border-green-200">
                  <svg className="w-3.5 h-3.5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                  Tersimpan {lastSaved.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Violation badge */}
            {violationCount > 0 && (
              <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold ${
                violationCount >= 4 ? 'bg-red-100 text-red-700' : violationCount >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-yellow-100 text-yellow-700'
              }`}>
                <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.194-.833-2.964 0L3.34 16.5C2.57 18.333 3.53 20 5.07 20z" />
                </svg>
                {violationCount}
              </div>
            )}

            {/* Timer */}
            {timeLeft !== null && (
              <div className={`flex items-center gap-1 px-2 sm:px-4 py-1.5 sm:py-2 rounded-xl font-mono font-bold text-base sm:text-lg ${
                isLowTime ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-700'
              }`}>
                <svg className="w-3.5 h-3.5 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {formatTime(timeLeft)}
              </div>
            )}

            {/* Nav toggle on mobile */}
            <button
              onClick={() => setNavOpen((v) => !v)}
              className="lg:hidden p-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              aria-label="Navigasi soal"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
            </button>

            <Button onClick={() => setShowSubmitConfirm(true)} variant="primary" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Selesai &amp; </span>Kumpulkan
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Question area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {currentQ && (
            <div className="max-w-2xl mx-auto">
              {/* Question header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 bg-blue-600 text-white rounded-xl flex items-center justify-center font-bold">
                    {currentQuestionIndex + 1}
                  </span>
                  <span className="text-sm text-gray-500">dari {questions.length} soal · {currentQ.points} poin</span>
                </div>
                {isCurrentNullified && (
                  <span className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-medium">
                    Soal dianulir — poin otomatis
                  </span>
                )}
              </div>

              {/* Question content */}
              <div className="text-gray-900 text-base leading-relaxed mb-8 bg-white rounded-xl border border-blue-100 p-6">
                {currentQ.type === 'FILL_BLANK' ? (
                  // Render fill-blank inline
                  <div
                    dir="auto"
                    style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                    className="flex flex-wrap items-center gap-1"
                  >
                    {currentQ.content.split('____').map((part: string, idx: number, arr: string[]) => {
                      const blankLabel = String(idx + 1);
                      const blankAnswers = getFillBlankAnswers(currentQ.id);
                      return (
                        <span key={idx} className="inline-flex items-center gap-1">
                          <span>{part}</span>
                          {idx < arr.length - 1 && !isCurrentNullified && (
                            <input
                              type="text"
                              value={blankAnswers[blankLabel] ?? ''}
                              onChange={(e) => handleFillBlankChange(currentQ.id, blankLabel, e.target.value)}
                              placeholder={`(${idx + 1})`}
                              style={{ width: `${Math.max(6, (blankAnswers[blankLabel] ?? '').length) * 12 + 20}px`, minWidth: '70px' }}
                              className="inline-block px-2.5 py-0.5 border-b-2 border-blue-400 bg-blue-50 text-sm text-gray-900 focus:outline-none focus:border-blue-600 rounded transition-all font-medium text-center"
                            />
                          )}
                        </span>
                      );
                    })}
                  </div>
                ) : (
                  <p
                    dir="auto"
                    style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                  >
                    {currentQ.content}
                  </p>
                )}
                {currentQ.imageUrl && (
                  <div className="mt-4">
                    <img
                      src={currentQ.imageUrl}
                      alt="Gambar soal"
                      className="max-w-full max-h-80 rounded-xl border border-blue-100 object-contain mx-auto block"
                      loading="lazy"
                    />
                  </div>
                )}
              </div>

              {/* ---- MULTIPLE_CHOICE ---- */}
              {currentQ.type === 'MULTIPLE_CHOICE' && !isCurrentNullified && (
                <div className="space-y-3">
                  {getOptions(currentQ).map((opt: any, idx: number) => {
                    const selected = currentAnswer?.answer === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerSelect(currentQ.id, opt.id)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        <div
                          className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                          }`}
                        >
                          {selected && <div className="w-2.5 h-2.5 bg-white rounded-full" />}
                        </div>
                        <span className="font-semibold text-gray-500 w-5">{posLabel(idx)}</span>
                        <span
                          className={`flex-1 text-sm ${selected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}
                          dir="auto"
                          style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                        >
                          {opt.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ---- TRUE_FALSE ---- */}
              {currentQ.type === 'TRUE_FALSE' && !isCurrentNullified && (
                <div className="flex gap-4">
                  {currentQ.options.map((opt: any) => {
                    const selected = currentAnswer?.answer === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleAnswerSelect(currentQ.id, opt.id)}
                        className={`flex-1 py-4 rounded-xl border-2 font-medium transition-all ${
                          selected ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 bg-white hover:border-blue-300 text-gray-700'
                        }`}
                      >
                        {opt.content}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ---- MULTIPLE_ANSWER ---- */}
              {currentQ.type === 'MULTIPLE_ANSWER' && !isCurrentNullified && (
                <div className="space-y-3">
                  <p className="text-xs text-blue-600 font-medium mb-2">(Pilih semua yang benar)</p>
                  {getOptions(currentQ).map((opt: any, idx: number) => {
                    const selectedIds = (currentAnswer?.answer ?? '').split(',').filter(Boolean);
                    const selected = selectedIds.includes(opt.id);
                    return (
                      <button
                        key={opt.id}
                        onClick={() => handleMultipleAnswerToggle(currentQ.id, opt.id)}
                        className={`w-full flex items-center gap-4 px-5 py-4 rounded-xl border-2 text-left transition-all ${
                          selected
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-blue-300 hover:bg-blue-50/30'
                        }`}
                      >
                        {/* Square checkbox instead of circle */}
                        <div
                          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            selected ? 'border-blue-600 bg-blue-600' : 'border-gray-300'
                          }`}
                        >
                          {selected && (
                            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                          )}
                        </div>
                        <span className="font-semibold text-gray-500 w-5">{posLabel(idx)}</span>
                        <span
                          className={`flex-1 text-sm ${selected ? 'text-blue-900 font-medium' : 'text-gray-700'}`}
                          dir="auto"
                          style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                        >
                          {opt.content}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ---- SHORT_ANSWER ---- */}
              {currentQ.type === 'SHORT_ANSWER' && !isCurrentNullified && (
                <div className="space-y-2">
                  <input
                    type="text"
                    value={currentAnswer?.answer ?? ''}
                    onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                    placeholder="Ketik jawaban singkat..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    dir="auto"
                    style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                  />
                  {currentQ.options?.[0]?.content && currentQ.options[0].content.startsWith('HINT:') && (
                    <p className="text-xs text-gray-400 mt-1">
                      Petunjuk: {currentQ.options[0].content.replace('HINT:', '').trim()}
                    </p>
                  )}
                </div>
              )}

              {/* ---- FILL_BLANK — inputs are already inline in question content above ---- */}
              {currentQ.type === 'FILL_BLANK' && !isCurrentNullified && (
                <div className="text-xs text-gray-400 mt-2">
                  Isi setiap titik-titik di atas dengan jawaban yang tepat.
                </div>
              )}

              {/* ---- MATCHING ---- */}
              {currentQ.type === 'MATCHING' && !isCurrentNullified && (
                <div className="space-y-3">
                  <p className="text-xs text-blue-600 font-medium mb-2">Pasangkan setiap item kiri dengan item kanan yang sesuai</p>
                  {(() => {
                    const rightItems = getShuffledRightItems(currentQ);
                    const matchingAnswers = getMatchingAnswers(currentQ.id);
                    return currentQ.options.map((opt: any, idx: number) => {
                      const leftText = (opt.content.split('|||')[0] ?? '').trim();
                      const selectedRight = matchingAnswers[opt.id] ?? '';
                      return (
                        <div key={opt.id} className="flex items-center gap-3">
                          <div className="flex-1 bg-white border border-blue-100 rounded-xl px-4 py-3 text-sm text-gray-800">
                            <span className="font-semibold text-blue-600 mr-2">{posLabel(idx)}.</span>
                            {leftText}
                          </div>
                          <svg className="w-5 h-5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          <select
                            value={selectedRight}
                            onChange={(e) => handleMatchingChange(currentQ.id, opt.id, e.target.value)}
                            className="flex-1 px-3 py-3 border border-gray-300 rounded-xl text-sm text-gray-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">-- Pilih --</option>
                            {rightItems.map((right: string, i: number) => (
                              <option key={i} value={right}>{right}</option>
                            ))}
                          </select>
                        </div>
                      );
                    });
                  })()}
                </div>
              )}

              {/* ---- ESSAY ---- */}
              {currentQ.type === 'ESSAY' && !isCurrentNullified && (
                <textarea
                  rows={8}
                  value={currentAnswer?.answer ?? ''}
                  onChange={(e) => handleAnswerSelect(currentQ.id, e.target.value)}
                  placeholder="Tuliskan jawaban kamu di sini..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  dir="auto"
                  style={{ fontFamily: "'Segoe UI', 'Noto Sans Arabic', 'Noto Sans CJK SC', sans-serif" }}
                />
              )}

              {/* Tombol ragu-ragu + navigasi */}
              <div className="flex items-center justify-between mt-8">
                <button
                  onClick={() => toggleDoubtful(currentQ.id)}
                  className={`flex items-center gap-2 text-sm px-4 py-2 rounded-xl border transition-colors ${
                    currentAnswer?.isDoubtful
                      ? 'border-blue-400 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-500 hover:border-blue-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                  {currentAnswer?.isDoubtful ? 'Ditandai Ragu' : 'Tandai Ragu-ragu'}
                </button>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCurrentQuestion(Math.max(0, currentQuestionIndex - 1))}
                    disabled={currentQuestionIndex === 0}
                  >
                    Sebelumnya
                  </Button>
                  <Button
                    onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestionIndex + 1))}
                    disabled={currentQuestionIndex === questions.length - 1}
                  >
                    Berikutnya
                  </Button>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Mobile overlay */}
        {navOpen && (
          <div
            className="fixed inset-0 bg-black/40 z-20 lg:hidden"
            onClick={() => setNavOpen(false)}
          />
        )}

        {/* Sidebar navigasi soal */}
        <aside className={`
          fixed top-0 right-0 h-full w-72 bg-white border-l border-blue-100 p-5 overflow-y-auto flex-shrink-0 z-30 transition-transform duration-200
          ${navOpen ? 'translate-x-0' : 'translate-x-full'}
          lg:static lg:w-64 lg:translate-x-0 lg:z-auto
        `}>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Navigasi Soal</p>

          <div className="grid grid-cols-5 gap-1.5 mb-5">
            {questions.map((q, i) => {
              const ans = answers[q.id];
              const isNull = nullifiedQuestions.has(q.id) || q.isNullified;
              const isCurrent = i === currentQuestionIndex;

              let bg = 'bg-gray-100 text-gray-500';
              if (isNull) bg = 'bg-blue-100 text-blue-600';
              else if (ans?.isDoubtful) bg = 'bg-yellow-100 text-yellow-700';
              else if (ans?.answer) bg = 'bg-blue-500 text-white';

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQuestion(i)}
                  className={`w-full aspect-square rounded-lg text-xs font-bold transition-all ${bg} ${
                    isCurrent ? 'ring-2 ring-blue-500 ring-offset-1' : 'hover:opacity-80'
                  }`}
                >
                  {i + 1}
                </button>
              );
            })}
          </div>

          {/* Legenda */}
          <div className="space-y-1.5 text-xs">
            {[
              { color: 'bg-blue-500', label: `Dijawab (${answeredCount})` },
              { color: 'bg-yellow-100 border border-yellow-300', label: `Ragu-ragu (${doubtfulCount})` },
              { color: 'bg-gray-100 border border-gray-200', label: `Belum dijawab (${unansweredCount})` },
              { color: 'bg-blue-100 border border-blue-200', label: 'Dianulir' },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-2">
                <div className={`w-3.5 h-3.5 rounded flex-shrink-0 ${l.color}`} />
                <span className="text-gray-500">{l.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-blue-50">
            <Button
              className="w-full justify-center"
              size="sm"
              onClick={() => setShowSubmitConfirm(true)}
            >
              Kumpulkan Jawaban
            </Button>
          </div>
        </aside>
      </div>

      {/* Submit confirm */}
      <ConfirmModal
        open={showSubmitConfirm}
        onClose={() => setShowSubmitConfirm(false)}
        onConfirm={handleSubmit}
        loading={submitMutation.isPending}
        title="Kumpulkan Jawaban"
        message={
          unansweredCount > 0
            ? `Masih ada ${unansweredCount} soal yang belum dijawab${doubtfulCount > 0 ? ` dan ${doubtfulCount} ditandai ragu-ragu` : ''}. Yakin ingin mengumpulkan?`
            : doubtfulCount > 0
            ? `Ada ${doubtfulCount} soal yang ditandai ragu-ragu. Yakin ingin mengumpulkan?`
            : 'Semua soal sudah dijawab. Yakin ingin mengumpulkan jawaban?'
        }
        confirmLabel="Ya, Kumpulkan"
        danger={false}
      />

      {/* Penalty overlay */}
      <PenaltyOverlay
        open={showPenaltyOverlay}
        onClose={() => setShowPenaltyOverlay(false)}
        count={violationCount}
        penaltySeconds={currentPenaltySeconds}
        autoSubmit={forceSubmitted}
      />

      {/* Force submit overlay */}
      {forceSubmitted && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
          <div className="bg-white rounded-2xl p-8 max-w-sm mx-4 text-center shadow-2xl">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="text-lg font-bold text-gray-900 mb-2">Ujian Dikumpulkan Paksa</h2>
            <p className="text-sm text-gray-500 mb-1">Ujian dikumpulkan paksa karena terlalu banyak pelanggaran.</p>
            <p className="text-xs text-gray-400">Mengalihkan ke hasil ujian...</p>
            <div className="w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full animate-spin mx-auto mt-4" />
          </div>
        </div>
      )}

      {/* Background Watermark */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden opacity-[0.03] select-none flex flex-wrap gap-16 p-8 justify-around items-center">
        {Array.from({ length: 48 }).map((_, i) => (
          <div key={i} className="transform -rotate-[35deg] text-gray-800 text-sm font-mono tracking-widest whitespace-nowrap">
            {authSession?.user?.name ?? 'CBT Siswa'} - {me?.nis ? `NIS ${me.nis}` : 'CBT CLIENT'}
          </div>
        ))}
      </div>

      {/* Broadcast Announcement Modal */}
      {broadcastMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md mx-4 rounded-2xl border border-blue-200 p-6 shadow-2xl animate-fade-in">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3 className="font-bold text-lg text-blue-900">Pengumuman Ujian</h3>
            </div>
            <p className="text-sm text-gray-700 leading-relaxed mb-6 font-medium bg-blue-50/50 rounded-xl p-4 border border-blue-100">
              {broadcastMessage}
            </p>
            <button
              onClick={() => setBroadcastMessage(null)}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Mengerti & Lanjutkan
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
