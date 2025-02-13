import io from 'socket.io-client';

export const socket = io('http://localhost:3000', {
	transports: ['websocket'],
	autoConnect: false,
	reconnection: true,
});

export function requireSocket(): SocketIOClient.Socket {
	socket.connect();
	return socket;
}
