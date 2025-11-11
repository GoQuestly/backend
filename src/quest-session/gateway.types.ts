import { Socket } from 'socket.io';

export interface AuthenticatedSocket extends Socket {
    userId?: number;
    sessionId?: number;
}

export interface ErrorResponse {
    success: false;
    error: string;
}