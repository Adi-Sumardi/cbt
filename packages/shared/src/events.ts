// WebSocket event names — shared antara server dan client
export const WS_EVENTS = {
  // Server → Client (siswa)
  QUESTION_UPDATED: 'question:updated',
  QUESTION_NULLIFIED: 'question:nullified',
  TIMER_WARNING: 'timer:warning',

  // Client → Server (siswa)
  ANSWER_SAVE: 'answer:save',
  ACTIVITY_LOG: 'activity:log',

  // Server → Client (konfirmasi)
  ANSWER_SAVED: 'answer:saved',

  // Server → Client (guru/monitor)
  STUDENT_DISCONNECT: 'student:disconnect',
  STUDENT_ACTIVITY: 'student:activity',
} as const;
