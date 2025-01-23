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

			socket.on('register', (requestData: { displayName: string, password: string, email: string }, callback: Callback) => {
				// verify callback type
				if (typeof callback !== 'function') {
					console.warn("User sent a register event without callback");
					return;
				}
				// verify parameter types (typeof can detect undefined)
				if (typeof requestData.displayName !== 'string' || typeof requestData.password !== 'string' || typeof requestData.email !== 'string') {
					callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "Invalid request format" });
					return;
				}

				// call authenticator
				this.authenticator.register(requestData.displayName, requestData.password, requestData.email).then((account: Account) => {
					socket.data.account = account;
					callback({ success: true, message: "Registered" }, { displayName: account.displayName });
				}).catch((e) => {
					callback({ success: false, error: ErrorType.Other, message: "Failed to register" });
				})
			});

			socket.on('unregister', (requestData: {}, callback: Callback) => {
				// verify callback type
				if (typeof callback !== 'function') {
					console.warn("User sent an unregister event without callback");
					return;
				}

				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				// call authenticator
				this.authenticator.unregister(socket.data.account.userId).then(() => {
					callback({ success: true, message: "Unregistered" });
				}).catch((err: Error) => {
					callback({ success: false, error: ErrorType.Other, message: "Failed to unregister" });
				})
			});

			socket.on('createGame', (requestData: { gameType: string }, callback: Callback) => {
				// verify callback type
				if (typeof callback !== 'function') {
					console.warn("User sent a startGame event without callback");
					return;
				}
				// verify parameter types (typeof can detect undefined)
				if (typeof requestData.gameType !== 'string') {
					callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "Invalid request format" });
					return;
				}

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
				this.app.startGame(gameSettings).then(( game: any ) => {
					callback({ success: true, message: "Started game" });
					socket.emit('alert', { message: game });
				}).catch((err: Error) => {
					callback({ success: false, error: ErrorType.Other, message: "Failed to start game\n" + err });
				})
				
			})

			// handle all events
			socket.onAny((event: string, requestData: any, callback: any) => {
				// verify callback type
				if (!isCallback(callback)) {
					console.warn("User sent an event without callback. Event name: " + event);
					return;
				}

				if (event === 'login') {
					// verify requestData type using isValidRequestData
					if (!isLoginEvent(requestData)) {
						callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "Invalid request format" });
						return;
					}
	
					// call authenticator
					this.authenticator.login(requestData.displayName, requestData.password).then((account: Account | false) => {
						if (account === false) {
							callback({ success: false, error: ErrorType.Other, message: "Invalid credentials" });
							return;
						}
						
						socket.data.account = account;
						callback({ success: true, message: "Logged in" }, { displayName: account.displayName });
					}).catch((e) => {
						if (e instanceof InvalidPasswordError) {
							callback({ success: false, error: ErrorType.Other, message: "Invalid credentials" });
						} else if (e instanceof AccountNotFoundError) {
							callback({ success: false, error: ErrorType.Other, message: "Account not found" });
						} else {
							callback({ success: false, error: ErrorType.Other, message: "Failed to login, unknown error\n" + e });
						}
					});
				} else if (event === 'register') {
					//
				} else { // unknown event
					callback({ success: false, error: ErrorType.Other, message: "No handler for event: " + event });
					console.warn("User sent an unknown event: " + event);
				}
			});
		});
	}

	private login(requestData: LoginEvent): any {
		throw new Error("Method not implemented.");
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
