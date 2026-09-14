import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'task_management_jwt_secret_key_production_ready';

let io: SocketIOServer | null = null;

export function initSocketIO(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    },
  });

  io.on('connection', (socket: Socket) => {
    // Check if token provided in auth handshake
    const token = socket.handshake.auth?.token;
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET) as { id: number; email: string };
        const userRoom = `user_${decoded.id}`;
        socket.join(userRoom);
      } catch (err) {
        // Continue connection unauthenticated or ignore
      }
    }

    // Allow manual join to user room
    socket.on('join_user_room', (userId: number | string) => {
      if (userId) {
        socket.join(`user_${userId}`);
      }
    });

    socket.on('disconnect', () => {
      // Clean disconnect
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit real-time task events to specific user room and broadcast
 */
export function emitTaskEvent(userId: number, event: 'task_created' | 'task_updated' | 'task_deleted' | 'task_status_changed', payload: any) {
  if (!io) return;
  // Send to user specific room
  io.to(`user_${userId}`).emit(event, payload);
  // Also emit globally with userId tagged
  io.emit(event, { ...payload, userId });
}
