import { io, Socket } from 'socket.io-client';
import { getServerUrl } from './serverUrl';

let socket: Socket | null = null;

export function getExamSocket(params: {
  sessionId?: string;
  examId?: string;
  role: 'student' | 'teacher';
  token: string;
}): Socket {
  if (socket?.connected) return socket;

  const base = getServerUrl() || process.env.NEXT_PUBLIC_WS_URL || window.location.origin;

  socket = io(`${base}/exam`, {
    query: params,
    auth: { token: params.token },
    transports: ['websocket'],
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
