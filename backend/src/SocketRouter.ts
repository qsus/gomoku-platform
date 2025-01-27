// This is a wrapper containing all web stuff. Its main goal is socket event parsing:
// - app can register functions to be called when a given event is received
// - when event is recieved, registered function will be called;
// - optional result from that function will be returned alongside a mandatory status object

import { Server, Socket } from "socket.io";
import { SocketIoProvider } from "./SocketIoProvider";
import { ErrorType, Status } from "./Transport/Status";
import { GameServer, GameSettings } from "./GameServer";
import { AccountNotFoundError, Authenticator, InvalidPasswordError } from "./Authenticator";
import { Account } from "@prisma/client";

/**
 * Provides websocket API for clients.
 * All types must adhere to the Transport types.
 */
export class SocketRouter {
	public constructor(
		private io: Server,
		private authenticator: Authenticator,
		private app: GameServer
	) {
		this.io.on('connection', (socket) => {
			console.log('user connected');

			socket.on('disconnect', () => {
				console.log('user disconnected');
			});

			// handle all events
			socket.onAny(async (event: string, requestData: any, callback: any) => {
				// verify callback type
				if (!isCallback(callback)) {
					console.warn("User sent an event without callback. Event name: " + event);
					return;
				}

				// check if event is in routing table
				if (!(event in this.routingTable)) {
					callback({ success: false, error: ErrorType.Other, message: "No handler for event: " + event });
					console.warn("User sent an unknown event: " + event);
					return;
				}

				// load type guard and server function
				let [typeGuard, serverFunction] = this.routingTable[event];

				// verify requestData type
				if (!typeGuard(requestData)) {
					callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "Invalid request format" });
					return;
				}

				try {
					// even though requestData is any, it is checked by typeGuard
					// bind is used to pass the correct "this" (SocketRouter)
					await serverFunction.bind(this)(socket, requestData, callback);
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Server error. Report to administrator. Debug data: " + e });
					console.log(e);
					return;
				}
				// If callback is called for the second time, it will be ignored
				// Could be used to notify the client about errors, but is disabled
				//callback({ success: false, error: ErrorType.Other, message: "Server error: SocketRouter forgot to call callback." });
			});
		});
	}

	private routingTable: {
		[eventName: string]:
			[typeGuard: (requestData: any) => boolean,
			serverFunction: (socket: Socket, requestData: any, callback: Callback) => Promise<void>]
	} = {
		// eventName, type guard, function
		'login': [isLoginEvent, this.login],
		'register': [isRegisterEvent, this.register],
		'createGame': [isCreateGameEvent, this.createGame],
		'listenGameList': [isListenGameListEvent, this.listenGameList],
	}

	private async login(socket: Socket, requestData: LoginEvent, callback: Callback): Promise<void> {
		try {
			let account = await this.authenticator.login(requestData.displayName, requestData.password);
			socket.data.account = account;
			callback({ success: true, message: "Logged in" }, { displayName: account.displayName });
		} catch (e) {
			if (e instanceof AccountNotFoundError) {
				callback({ success: false, error: ErrorType.Other, message: e.message });
			} else if (e instanceof InvalidPasswordError) {
				callback({ success: false, error: ErrorType.Other, message: e.message });
			} else {
				throw e;
			}
		}
	}

	private async register(socket: Socket, requestData: RegisterEvent, callback: Callback): Promise<void> {
		// call authenticator
		let account = await this.authenticator.register(requestData.displayName, requestData.password, requestData.email);
		// store account in socket data
		socket.data.account = account;
		callback({ success: true, message: "Registered" }, { displayName: account.displayName });
	}

	private async createGame(socket: Socket, requestData: CreateGameEvent, callback: Callback): Promise<void> {
		// must be logged in
		if (!socket.data.account) {
			callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
			return;
		}

		let gameSettings: GameSettings = {
			boardSizeX: 15,
			boardSizeY: 15,
			type: requestData.gameType
		}

		// call app
		let gameData = await this.app.startGame(gameSettings);
		callback({ success: true, message: "Started game" });
	}

	private async listenGameList(socket: Socket, requestData: any, callback: Callback): Promise<void> {
		socket.join('gameList'); // join room
		callback({ success: true, message: "Listening to gameList changes" });
	}

	/**
	 * Register function which socket.io clients can "call". This essentially emulates
	 * the traditional way where client can call an API endpoint and the enpoint responds.
	 * @param eventName Name of the event to be listened to
	 * @param serverFunction Function to be "called"
	 */
	private addEvent(eventName: string, serverFunction: ServerFunction) {
		// register a "middleware" - a function which will be called for all sockets
		this.io.use((socket: Socket, next): void => {
			// register the event name
			socket.on(eventName, async (...requestArgs: [...any[], Callback]) => {
				// extract the callback
				const callback: Callback = requestArgs.pop();
				if (typeof callback !== 'function') {
					console.warn("User sent an event without callback. Event name: " + eventName + ", args: " + requestArgs);
					return;
				}
				
				// to be sent to the client
				let status: Status;
				let result: any;
		
				try {
					console.log("Event: " + eventName + ", args: " + requestArgs);
					result = await serverFunction(...requestArgs);
					status = { success: true };
				} catch (e) {
					// detect error type
					if (false) { // some condition
						status = { success: false, error: ErrorType.NotAuthenticated, message: e.message };
					} else { // bunch of another else ifs such as incorrect arguments
						// unknown server-side error, please report to administrator
						// TODO: hide server error from client
						status = { success: false, error: ErrorType.Other, message: "Unhandled server error: " + e.message };
					}
				}
		
				callback(status, result);
			});

			// excluding this would make this the only handler
			next();
		});
	}
}

/**
 * Function called when event is recieved
 * @param receivedArgs Arguments received from event
 * @returns Arguments returned to client
 */
type ServerFunction = (...receivedArgs: any[]) => any;

/**
 * Socket.io callback.
 */
type Callback = (status: Status, result?: any) => void;
function isCallback(obj: any): obj is Callback {
	return typeof obj === 'function';
}

type LoginEvent = {
	displayName: string,
	password: string
}
function isLoginEvent(obj: any): obj is LoginEvent {
	return obj.displayName && obj.password;
}

type RegisterEvent = {
	displayName: string,
	password: string,
	email: string
}
function isRegisterEvent(obj: any): obj is RegisterEvent {
	return typeof obj.displayName === 'string' && typeof obj.password === 'string' && typeof obj.email === 'string';
}

type CreateGameEvent = {
	gameType: string
}
function isCreateGameEvent(obj: any): obj is CreateGameEvent {
	return typeof obj.gameType === 'string';
}

type ListenGameListEvent = {}
function isListenGameListEvent(obj: any): obj is ListenGameListEvent {
	return typeof obj === 'object';
}
