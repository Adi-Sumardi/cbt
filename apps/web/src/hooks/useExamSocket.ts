'use client';

import { useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { getExamSocket, disconnectSocket } from '@/lib/socket';
import { useExamStore } from '@/store/examStore';

interface UseExamSocketOptions {
  sessionId: string;
  examId: string;
  role: 'student' | 'teacher';
  onQuestionUpdated?: (question: any) => void;
  onQuestionNullified?: (questionId: string) => void;
  onTimerWarning?: (remainingSeconds: number) => void;
  onAnnouncementReceived?: (message: string) => void;
  onViolationPardoned?: () => void;
}

export function useExamSocket({
  sessionId,
  examId,
  role,
  onQuestionUpdated,
  onQuestionNullified,
  onTimerWarning,
  onAnnouncementReceived,
  onViolationPardoned,
}: UseExamSocketOptions) {
  const { data: session } = useSession();
  const { setConnected, setLastSaved } = useExamStore();

  useEffect(() => {
    if (!session) return;

    const socket = getExamSocket({
      sessionId,
      examId,
      role,
      token: (session as any).accessToken,
    });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('answer:saved', ({ questionId }: any) => setLastSaved(new Date()));
    socket.on('question:updated', onQuestionUpdated || (() => {}));
    socket.on('question:nullified', ({ questionId }: any) => onQuestionNullified?.(questionId));
    socket.on('timer:warning', ({ remainingSeconds }: any) => onTimerWarning?.(remainingSeconds));
    socket.on('announcement:received', ({ message }: any) => onAnnouncementReceived?.(message));
    socket.on('violation:pardoned', () => onViolationPardoned?.());

    // Anti-cheat: log tab visibility
    const handleVisibilityChange = () => {
      socket.emit('activity:log', {
        sessionId,
        examId,
        event: document.hidden ? 'blur' : 'focus',
        studentName: session?.user?.name ?? 'Siswa',
      });
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('answer:saved');
      socket.off('question:updated');
      socket.off('question:nullified');
      socket.off('timer:warning');
      socket.off('announcement:received');
      socket.off('violation:pardoned');
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      disconnectSocket();
    };
  }, [session, sessionId, examId, role]);

  const saveAnswer = useCallback(
    (questionId: string, answer: string, isDoubtful: boolean) => {
      const socket = getExamSocket({
        sessionId,
        examId,
        role: 'student',
        token: (session as any)?.accessToken ?? '',
      });
      socket.emit('answer:save', { sessionId, questionId, answer, isDoubtful });
    },
    [session, sessionId, examId],
  );

  return { saveAnswer };
}
