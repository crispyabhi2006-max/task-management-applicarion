import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const token = localStorage.getItem('tm_token');
    socket = io('/', {
      auth: { token },
      autoConnect: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socket.on('connect', () => {
      // Re-join user room on reconnect
      const savedUser = localStorage.getItem('tm_user');
      if (savedUser) {
        try {
          const user = JSON.parse(savedUser);
          if (user?.id) {
            socket?.emit('join_user_room', user.id);
          }
        } catch (e) {
          // ignore
        }
      }
    });
  }
  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function subscribeToTaskEvents(callbacks: {
  onTaskCreated?: (task: any) => void;
  onTaskUpdated?: (task: any) => void;
  onTaskDeleted?: (data: { id: number }) => void;
  onTaskStatusChanged?: (task: any) => void;
}) {
  const s = getSocket();

  if (callbacks.onTaskCreated) {
    s.on('task_created', callbacks.onTaskCreated);
  }
  if (callbacks.onTaskUpdated) {
    s.on('task_updated', callbacks.onTaskUpdated);
  }
  if (callbacks.onTaskDeleted) {
    s.on('task_deleted', callbacks.onTaskDeleted);
  }
  if (callbacks.onTaskStatusChanged) {
    s.on('task_status_changed', callbacks.onTaskStatusChanged);
  }

  return () => {
    if (callbacks.onTaskCreated) s.off('task_created', callbacks.onTaskCreated);
    if (callbacks.onTaskUpdated) s.off('task_updated', callbacks.onTaskUpdated);
    if (callbacks.onTaskDeleted) s.off('task_deleted', callbacks.onTaskDeleted);
    if (callbacks.onTaskStatusChanged) s.off('task_status_changed', callbacks.onTaskStatusChanged);
  };
}
