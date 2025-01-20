// lib/stores/socketStore.ts
import { get, writable } from 'svelte/store';
import io from 'socket.io-client';

// avoid using this store directly
export const socketStore = writable<SocketIOClient.Socket | null>(null);

// this function must not under any circumstances return null, nor can the compiler think it could even if it couldn't, otherwise the whole app's type checking will fall apart
export function getSocket(): SocketIOClient.Socket {
    // try returning existing socket; if null, create one
    let socket: SocketIOClient.Socket | null = get(socketStore);
    if (!socket) {
        socket = io('http://localhost:3000', { transports: ['websocket'] });
        socketStore.set(socket);
    }
    return socket;
}
