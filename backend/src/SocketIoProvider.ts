import express from "express";
import { createServer } from "node:http";
import { Server } from "socket.io";

/**
 * Creates a webserver and provides socket.io instance.
 * @example
 * const io = new SocketIoProvider();
 * io.getIo();
 */
export class SocketIoProvider {
	private app: express.Application = express(); // express (web application framework) application
	private httpServer: any = createServer(this.app); // node.js http server - uses express.js app to know what to serve
	private io: Server = new Server(this.httpServer, { // socket.io server instance - uses httpServer to listen for itself
		cors: { origin: "*" }
	});

	/**
	 * Create socket.io instance with server and start listening on port 3000.
	 */
	public constructor() {
		this.httpServer.listen(3000);
		console.log('Server started on port 3000');
	}

	/**
	 * Return socket.io instance.
	 */
	public getIo(): Server {
		return this.io;
	}
}
