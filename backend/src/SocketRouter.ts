// This is a wrapper containing all web stuff. Its main goal is socket event parsing:
// - app can register functions to be called when a given event is received
// - when event is recieved, registered function will be called;
// - optional result from that function will be returned alongside a mandatory status object

import { Server, Socket } from "socket.io";
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

			socket.on('test', this.withStructureCheck(this.withErrorHandling((requestData: object, callback: Callback): void => {
				throw new Error("experiment");
				//callback({ success: true, message: requestData.message });
			})));

			socket.on('login', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback): Promise<void> => {
				// verify request format
				if (!isLoginRequest(requestData)) throw new Error("Invalid request format");

				try {
					// call authenticator
					let account = await this.authenticator.login(requestData.displayName, requestData.password);
					socket.data.account = account;
					callback({ success: true, message: "Logged in" }, { displayName: account.displayName });
				} catch (e) {
					// possible authenticator errors
					if (e instanceof InvalidPasswordError) {
						callback({ success: false, error: ErrorType.Other, message: "Invalid credentials" });
					} else if (e instanceof AccountNotFoundError) {
						callback({ success: false, error: ErrorType.Other, message: "Account not found" });
					} else {
						throw e;
					}
				}
			})));

			socket.on('register', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback): Promise<void> => {
				// verify request format
				if (!isRegisterRequest(requestData)) throw new Error("Invalid request format");

				// call authenticator
				try {
					let account = await this.authenticator.register(requestData.displayName, requestData.password, requestData.email);
					socket.data.account = account;
					callback({ success: true, message: "Registered" }, { displayName: account.displayName });
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Failed to register, most likely account already exists." });
					return;
				}
			})));

			socket.on('unregister', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				// make sure that user is logged in
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				// call authenticator
				try {
					await this.authenticator.unregister(socket.data.account.userId);
					callback({ success: true, message: "Unregistered" });
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Failed to unregister" });
					return;
				}
			})));

			socket.on('createGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				// make sure that user is logged in
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				// start game
				let gameSettings = GameServer.getPresetSettings('gomoku');
				try {
					let game = await this.app.startGame(gameSettings);
					callback({ success: true, message: "Started game" }, game);
				} catch (e) {
					callback({ success: false, error: ErrorType.Other, message: "Failed to start game" });
					return;
				}
			})));

			socket.on('listenGameList', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				socket.join('gameList');
				callback({ success: true, message: "Listening to game list" });
			})));

			socket.onAny((eventName, ...args) => {
				// if handler exists, do nothing
				if (socket.listenerCount(eventName) > 0) return;

				// no handler exists, log
				console.log("Unknown event: " + eventName);

				// try at least telling the user if he provided a callback
				if (typeof args[args.length - 1] === 'function') {
					args[args.length - 1]({ success: false, error: ErrorType.Other, message: "Unknown event: " + eventName });
				}
			});
		});
	}

	private withErrorHandling(serverFunction: ServerFunction): ServerFunction {
		return async (data, callback) => { // types are derived from return type
			try {
				return await serverFunction(data, callback);
			} catch (e) {
				console.log("Error in server function: " + e);
				if (e instanceof NotAuthenticatedErrorExample) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: e.message });
				} else {
					callback({ success: false, error: ErrorType.Other, message: e.message });
				}
			}
		}
	}

	private withStructureCheck(serverFunction: ServerFunction): ServerFunction {
		return async (data, callback) => { // types are derived from return type
			if (typeof callback !== 'function') {
				console.warn("User sent an event without callback. Event not executed.");
				return;
			}

			if (typeof data !== 'object') {
				callback({ success: false, error: ErrorType.InvalidRequestFormat, message: "First argument must be an object" });
				return;
			}

			return await serverFunction(data, callback);
		}
	}
}

/**
 * Function called when event is recieved
 */
type ServerFunction = (data: object, callback: Callback) => any;

/**
 * Socket.io callback.
 */
type Callback = (status: Status, result?: any) => void;

// TODO: move to error.ts
class NotAuthenticatedErrorExample extends Error {
	constructor(message: string) {
		super(message);
		this.name = "CustomError";
	}
}

type LoginRequest = {
	displayName: string,
	password: string
}
function isLoginRequest(data: any): data is LoginRequest {
	return typeof data.displayName === 'string' && typeof data.password === 'string';
}

type RegisterRequest = {
	displayName: string,
	password: string,
	email: string
}
function isRegisterRequest(data: any): data is RegisterRequest {
	return typeof data.displayName === 'string' && typeof data.password === 'string' && typeof data.email === 'string';
}
