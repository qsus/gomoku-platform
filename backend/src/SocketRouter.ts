// This is a wrapper containing all web stuff. Its main goal is socket event parsing:
// - app can register functions to be called when a given event is received
// - when event is recieved, registered function will be called;
// - optional result from that function will be returned alongside a mandatory status object

import { Server, Socket } from "socket.io";
import { ErrorType, Status } from "./Transport/Status";
import { AccountNotFoundError, Authenticator, InvalidPasswordError } from "./Authenticator";
import { PrismaClient, Account } from "@prisma/client";
import { GameStatusBroadcast as GameStatusBroadcast } from "./Transport/GameStatusBroadcast";

/**
 * Provides websocket API for clients.
 * All types must adhere to the Transport types.
 */
export class SocketRouter {
	public constructor(
		private io: Server,
		private authenticator: Authenticator,
		private prisma: PrismaClient,
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
				if ( // verify request format
					!("displayName" in requestData) || typeof requestData.displayName !== 'string' ||
					!("password" in requestData) || typeof requestData.password !== 'string'
				) {
					throw new Error("Invalid request format (missing displayName or password)");
				}
				
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
				if ( // verify request format
					!("displayName" in requestData) || typeof requestData.displayName !== 'string' ||
					!("password" in requestData) || typeof requestData.password !== 'string' ||
					!("email" in requestData) || typeof requestData.email !== 'string'
				) {
					throw new Error("Invalid request format (missing displayName or password)");
				}
				
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

				// prepare board
				let gameSettings = { boardSizeX: 15, boardSizeY: 15 };
				let board = Array.from({ length: gameSettings.boardSizeY }, () => Array(gameSettings.boardSizeX).fill(''));
				board[0][0] = 'b'; // example
				board[0][1] = 'w'; // example
		
				let gameState: GameState = { // example
					moves: [
						{
							stones: [
								{
									x: 0,
									y: 0,
									color: 1
								},
								{
									x: 0,
									y: 1,
									color: 1
								}
							],
							pressClock: false
						},
						{
							stones: [
								{
									x: 1,
									y: 0,
									color: 2
								}
							],
							pressClock: true
						}
					]
				};

				let game = await this.prisma.game.create({
					data: {
						gameState: gameState,
					}
				})
				this.notifyGameList();

				callback({ success: true, message: "Started game" }, game);
			})));

			socket.on('listenGameList', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				socket.join('gameList');
				this.notifyGameList(); // notifies user immediately; TODO: notify only this user
				callback({ success: true, message: "Listening to game list" });
			})));

			socket.on('listenGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				if ( // verify request format
					!("gameId" in requestData) || typeof requestData.gameId !== 'string'
				) {
					throw new Error("Invalid request format (missing gameId)");
				}
				
				socket.join("game:" + requestData.gameId);
				callback({ success: true, message: "Listening to game" });
				this.notifyGameStatus(requestData.gameId); // notifies user immediately; TODO: notify only this user
			})));

			socket.on('playMove', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				if ( // verify request format
					!("gameId" in requestData) || typeof requestData.gameId !== 'string' ||
					!("move" in requestData) || typeof requestData.move !== 'object' ||
					!("stones" in requestData.move!) || !Array.isArray(requestData.move.stones) ||
					!("pressClock" in requestData.move!) || typeof requestData.move.pressClock !== 'boolean' ||
					// for all stones
					requestData.move.stones.some((stone: any) => {
						return typeof stone !== 'object' || typeof stone.x !== 'number' || typeof stone.y !== 'number' || typeof stone.color !== 'number';
					})
				) {
					throw new Error("Invalid request format (missing gameId or move)");
				}

				// check if user is authenticated
				if (!socket.data.account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}

				// load game
				let game = await this.prisma.game.findUnique({ where: { id: requestData.gameId } });
				if (!game) {
					callback({ success: false, error: ErrorType.Other, message: "Game not found" });
					return;
				}
				let gameState = game.gameState as GameState;
				
				let move: GameState['moves'][0] = {
					stones: [],
					pressClock: requestData.move.pressClock
				};

				for (let stone of requestData.move.stones) {
					move.stones.push({
						x: stone.x,
						y: stone.y,
						color: stone.color
					});
				}

				console.log(move);
				gameState.moves.push(move);
				await this.prisma.game.update({
					where: { id: requestData.gameId },
					data: {
						gameState: gameState
					}
				});

				callback({ success: true, message: "Played move" });
				this.notifyGameStatus(requestData.gameId);
			})));

			socket.on('joinGame', this.withStructureCheck(this.withErrorHandling(async (requestData: object, callback: Callback) => {
				if ( // verify request format
					!("gameId" in requestData) || typeof requestData.gameId !== 'string'
				) {
					throw new Error("Invalid request format (missing gameId)");
				}

				// load game
				let game = await this.prisma.game.findUnique({ 
					where: { id: requestData.gameId },
					include: { players: true }
				});
				if (!game) {
					callback({ success: false, error: ErrorType.Other, message: "Game not found" });
					return;
				}
				
				// find player
				let account: Account = socket.data.account; // prisma account
				if (!account) {
					callback({ success: false, error: ErrorType.NotAuthenticated, message: "Not authenticated" });
					return;
				}
				
				// check if player is already in game
				if (game.players.some(player => player.id === account.id)) {
					callback({ success: false, error: ErrorType.Other, message: "Player already in game" });
					return;
				}

				// add player to game
				await this.prisma.game.update({
					where: { id: requestData.gameId },
					data: {
						players: {
							connect: {
								id: account.id
							}
						}
					}
				});

				callback({ success: true, message: "Joined game" });
				this.notifyGameStatus(requestData.gameId);

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

	private async notifyGameList() {
		let games = await this.prisma.game.findMany();
		let response = games.map(game => game.id);
		this.io.to('gameList').emit('gameList', response);
	}

	private async notifyGameStatus(gameId: string) {
		// TODO
		let game = await this.prisma.game.findUnique({ 
			where: { id: gameId },
			include: { players: true }
		});
		if (!game) return; // TODO: error handling

		let gameStatus = game.gameState as GameState;
		let board: number[][] = SocketRouter.movesToBoard(gameStatus.moves);
		
		let gameStatusBroadcast: GameStatusBroadcast = {
			gameId: gameId,
			players: game.players.map(player => player.displayName),
			board: board
		};
		this.io.to('game:' + gameId).emit('gameStatus', gameStatusBroadcast);
	}

	public static movesToBoard(moves: {
		stones: {
			x: number;
			y: number;
			color: number; // 0 = empty, 1 = black, 2 = white
		}[],
		pressClock: boolean;
	}[]): number[][] {
		// TODO: not assume 15x15
		let board = Array.from({ length: 15 }, () => Array(15).fill(0));

		for (let move of moves) {
			for (let stone of move.stones) {
				board[stone.y][stone.x] = stone.color;
			}
		}

		return board;
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

type GameState = {
	moves: {
		stones: {
			x: number,
			y: number,
			color: number // 0 = empty, 1 = black, 2 = white
		}[],
		pressClock: boolean
	}[]
}
